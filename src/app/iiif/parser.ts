import { hexToRgb } from './color';
import type { Vec3 } from './coordinates';
import type { IIIFComment, IIIFSceneModel, IIIFTransform, LightKind } from './model';

export class IIIFParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IIIFParseError';
  }
}

type Json = Record<string, any>;

const asArray = <T>(value: T | T[] | undefined | null): T[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

const firstLabel = (label: unknown): string | undefined => {
  if (!label || typeof label !== 'object') return undefined;
  for (const values of Object.values(label as Record<string, unknown>)) {
    const first = asArray(values as string | string[])[0];
    if (typeof first === 'string') return first;
  }
  return undefined;
};

/** Number or IIIF Value ({ type: "Value", value }). */
const toNumber = (value: unknown): number | undefined => {
  const raw =
    typeof value === 'object' && value !== null
      ? ((value as Json)['quantityValue'] ?? (value as Json)['value'])
      : value;
  if (raw === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const pointFromSelector = (selector: unknown): Vec3 | undefined => {
  const s = selector as Json | undefined;
  if (s?.['type'] !== 'PointSelector') return undefined;
  if (s['x'] === undefined && s['y'] === undefined && s['z'] === undefined) return undefined;
  return { x: Number(s['x'] ?? 0), y: Number(s['y'] ?? 0), z: Number(s['z'] ?? 0) };
};

const targetSelectors = (annotation: Json): Json[] =>
  asArray<Json>(annotation['target']).flatMap(target => asArray<Json>(target?.['selector']));

const targetPoint = (annotation: Json): Vec3 | undefined =>
  targetSelectors(annotation)
    .map(pointFromSelector)
    .find((point): point is Vec3 => point !== undefined);

const TRANSFORM_KINDS: Record<string, IIIFTransform['kind']> = {
  scaletransform: 'scale',
  rotatetransform: 'rotate',
  translatetransform: 'translate',
};

const parseTransforms = (list: unknown): IIIFTransform[] =>
  asArray<Json>(list as Json | Json[]).flatMap((transform): IIIFTransform[] => {
    const kind = TRANSFORM_KINDS[String(transform?.['type'] ?? '').toLowerCase()];
    if (!kind) return [];
    const fallback = kind === 'scale' ? 1 : 0;
    return [
      {
        kind,
        value: {
          x: Number(transform['x'] ?? fallback),
          y: Number(transform['y'] ?? fallback),
          z: Number(transform['z'] ?? fallback),
        },
      },
    ];
  });

/** Unwraps SpecificResource bodies: returns source, transforms and type (lowercase). */
const unwrapBody = (body: Json) => {
  if (body?.['type'] === 'SpecificResource') {
    const source: Json = asArray<Json>(body['source'])[0] ?? {};
    return {
      source,
      transforms: parseTransforms(body['transform'] ?? source['transform']),
      type: String(source['type'] ?? '').toLowerCase(),
    };
  }
  return {
    source: body ?? {},
    transforms: parseTransforms(body?.['transform']),
    type: String(body?.['type'] ?? '').toLowerCase(),
  };
};

const parseLookAt = (lookAt: unknown): { lookAtAnnotationId?: string; lookAtPoint?: Vec3 } => {
  const l = lookAt as Json | undefined;
  if (!l) return {};
  const point = pointFromSelector(l);
  if (point) return { lookAtPoint: point };
  return typeof l['id'] === 'string' ? { lookAtAnnotationId: l['id'] } : {};
};

const isComment = (annotation: Json) =>
  asArray(annotation['motivation']).includes('commenting') ||
  annotation['bodyValue'] !== undefined ||
  asArray<Json>(annotation['body']).some(body => body?.['type'] === 'TextualBody');

const parseComment = (annotation: Json, warnings: string[]): IIIFComment | undefined => {
  const id = String(annotation['id']);
  const point = targetPoint(annotation);
  if (!point) {
    warnings.push(`Comment ${id} has no PointSelector and was skipped`);
    return undefined;
  }
  const textual = asArray<Json>(annotation['body']).find(body => body?.['type'] === 'TextualBody');
  const value = String(textual?.['value'] ?? annotation['bodyValue'] ?? '');
  const title = firstLabel(textual?.['label']) ?? value;
  return {
    annotationId: id,
    title,
    description: value === title ? '' : value,
    point,
    cameraAnnotationId: undefined,
  };
};

/** Scope references of a comment: on the annotation itself and on each SpecificResource target. */
const scopeRefs = (annotation: Json): Json[] => [
  ...asArray<Json>(annotation['scope']),
  ...asArray<Json>(annotation['target']).flatMap(target => asArray<Json>(target?.['scope'])),
];

/**
 * Painting annotations embedded in a scope reference: either the reference is itself an
 * embedded painting annotation, or it is a content-state annotation whose target Scene
 * carries AnnotationPages (form used by the IIIF 3D demo manifests).
 */
const embeddedPaintingAnnotations = (ref: Json): Json[] => {
  if (ref?.['type'] !== 'Annotation') return [];
  if (ref['body'] !== undefined) return [ref];
  return asArray<Json>(ref['target']).flatMap(target =>
    asArray<Json>(target?.['items']).flatMap(page =>
      asArray<Json>(page?.['items']).filter(item => item?.['type'] === 'Annotation'),
    ),
  );
};

const LIGHT_KINDS: Record<string, LightKind> = {
  ambientlight: 'ambient',
  directionallight: 'directional',
  pointlight: 'point',
  spotlight: 'spot',
};

const SUPPORTED_SELECTOR_TYPES = ['PointSelector', 'PolygonZSelector'];

const parsePainting = (annotation: Json, manifest: Json, model: IIIFSceneModel) => {
  const id = String(annotation['id']);
  const position = targetPoint(annotation);

  for (const rawBody of asArray<Json>(annotation['body'])) {
    const { source, transforms, type } = unwrapBody(rawBody);

    if (type === 'model') {
      if (typeof source['id'] !== 'string') {
        model.warnings.push(`Annotation ${id}: Model without id was skipped`);
        continue;
      }
      model.models.push({
        annotationId: id,
        url: source['id'],
        format: typeof source['format'] === 'string' ? source['format'] : undefined,
        transforms,
        position,
      });
    } else if (type === 'perspectivecamera' || type === 'orthographiccamera') {
      model.cameras.push({
        annotationId: id,
        projection: type === 'perspectivecamera' ? 'perspective' : 'orthographic',
        label: firstLabel(source['label']),
        position,
        transforms,
        resourceId: typeof source['id'] === 'string' ? source['id'] : undefined,
        fieldOfView: toNumber(source['fieldOfView']),
        near: toNumber(source['near']),
        far: toNumber(source['far']),
        hidden: asArray(annotation['behavior']).includes('hidden'),
        ...parseLookAt(source['lookAt'] ?? rawBody['lookAt']),
      });
    } else if (LIGHT_KINDS[type]) {
      model.lights.push({
        annotationId: id,
        kind: LIGHT_KINDS[type],
        color: typeof source['color'] === 'string' ? hexToRgb(source['color']) : undefined,
        intensity: toNumber(source['intensity'] ?? rawBody['intensity']),
        angle: toNumber(source['angle']),
        position,
        transforms,
        ...parseLookAt(source['lookAt'] ?? rawBody['lookAt']),
      });
    } else if (type === 'canvas') {
      const canvas = asArray<Json>(manifest['items']).find(
        item => item?.['type'] === 'Canvas' && item?.['id'] === source['id'],
      );
      const polygon = targetSelectors(annotation).find(s => s?.['type'] === 'PolygonZSelector');
      if (!canvas || typeof polygon?.['value'] !== 'string') {
        model.warnings.push(`Annotation ${id}: Canvas or PolygonZSelector not found`);
        continue;
      }
      model.canvases.push({ annotationId: id, canvas, polygonZ: polygon['value'] });
    } else if (type === 'scene') {
      model.warnings.push(`Annotation ${id}: nested Scenes are not supported`);
    } else {
      model.warnings.push(`Annotation ${id}: Unsupported body type "${type}"`);
    }
  }
};

export const parseManifest = (input: unknown): IIIFSceneModel => {
  let json: unknown = input;
  if (typeof input === 'string') {
    try {
      json = JSON.parse(input);
    } catch {
      throw new IIIFParseError('Invalid JSON');
    }
  }

  const manifest = json as Json;
  if (!manifest || typeof manifest !== 'object' || manifest['type'] !== 'Manifest') {
    throw new IIIFParseError('Not a IIIF Manifest');
  }

  const scenes = asArray<Json>(manifest['items']).filter(item => item?.['type'] === 'Scene');
  const scene = scenes[0];
  if (!scene) throw new IIIFParseError('No Scene found in IIIF Manifest');

  const model: IIIFSceneModel = {
    manifestId: String(manifest['id'] ?? ''),
    label: firstLabel(manifest['label']) ?? firstLabel(scene['label']) ?? 'IIIF Manifest',
    sceneId: String(scene['id'] ?? ''),
    backgroundColor:
      typeof scene['backgroundColor'] === 'string' ? hexToRgb(scene['backgroundColor']) : undefined,
    models: [],
    canvases: [],
    cameras: [],
    lights: [],
    comments: [],
    warnings: [],
  };

  if (scenes.length > 1) {
    model.warnings.push(`Manifest has ${scenes.length} Scenes, only the first one is loaded`);
  }

  const pages = [
    ...asArray<Json>(scene['items']),
    ...asArray<Json>(scene['annotations']),
    ...asArray<Json>(manifest['annotations']),
  ];

  const pendingScopes: Array<{ comment: IIIFComment; ids: string[] }> = [];

  for (const page of pages) {
    if (page?.['type'] !== 'AnnotationPage') continue;
    if (!Array.isArray(page['items'])) {
      model.warnings.push(`External AnnotationPage ${page['id']} was not loaded`);
      continue;
    }
    for (const annotation of page['items'] as Json[]) {
      if (annotation?.['type'] !== 'Annotation') continue;
      const id = String(annotation['id']);
      if (asArray(annotation['exclude']).length) {
        model.warnings.push(`Annotation ${id}: "exclude" is not supported and was ignored`);
      }
      for (const selector of targetSelectors(annotation)) {
        if (!SUPPORTED_SELECTOR_TYPES.includes(selector?.['type'])) {
          model.warnings.push(
            `Annotation ${id}: Unsupported selector type "${selector?.['type']}" was ignored`,
          );
        }
      }
      if (isComment(annotation)) {
        const comment = parseComment(annotation, model.warnings);
        if (comment) {
          model.comments.push(comment);
          const ids: string[] = [];
          for (const ref of scopeRefs(annotation)) {
            const embedded = embeddedPaintingAnnotations(ref);
            if (embedded.length) {
              for (const painting of embedded) {
                const before = model.cameras.length;
                parsePainting(painting, manifest, model);
                for (const camera of model.cameras.slice(before)) {
                  camera.hidden = true;
                  ids.push(camera.annotationId);
                }
              }
            } else if (typeof ref?.['id'] === 'string') {
              ids.push(ref['id']);
            }
          }
          pendingScopes.push({ comment, ids });
        }
      } else {
        parsePainting(annotation, manifest, model);
      }
    }
  }

  // Resolved after all pages are parsed, so a camera may appear after the comment referencing it.
  for (const { comment, ids } of pendingScopes) {
    const camera = ids
      .map(id => model.cameras.find(c => c.annotationId === id || c.resourceId === id))
      .find(found => found !== undefined);
    comment.cameraAnnotationId = camera?.annotationId;
    if (ids.length && !camera) {
      model.warnings.push(`Comment ${comment.annotationId}: scope does not reference a known camera`);
    }
  }

  return model;
};
