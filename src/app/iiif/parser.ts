import { hexToRgb } from './color';
import { canvasCorners } from './canvas-placement';
import { wktAnchorPoint } from './wkt';
import type { Vec3 } from './coordinates';
import type {
  IIIFCameraItem,
  IIIFComment,
  IIIFSceneModel,
  IIIFTransform,
  LightKind,
} from './model';

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

const SHAPE_SELECTOR_TYPES = ['WktSelector', 'PolygonZSelector'];

/** First shape selector (WKT with Z coordinates) of the target, reduced to the centre of its vertices. */
const targetShapeAnchor = (annotation: Json): { type: string; point: Vec3 } | undefined => {
  for (const selector of targetSelectors(annotation)) {
    if (!SHAPE_SELECTOR_TYPES.includes(selector?.['type'])) continue;
    const point = typeof selector['value'] === 'string' ? wktAnchorPoint(selector['value']) : undefined;
    if (point) return { type: selector['type'], point };
  }
  return undefined;
};

const parseComment = (annotation: Json, id: string, warnings: string[]): IIIFComment | undefined => {
  let point = targetPoint(annotation);
  if (!point) {
    // Kompakkt anchors annotations at a point: fall back to the centre of a shape selector.
    const anchor = targetShapeAnchor(annotation);
    if (!anchor) {
      warnings.push(`Comment ${id} has no usable selector and was skipped`);
      return undefined;
    }
    warnings.push(`Comment ${id}: the ${anchor.type} shape is shown as a point at its centre`);
    point = anchor.point;
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
const scopeRefs = (annotation: Json): Array<Json | string> => [
  ...asArray<Json | string>(annotation['scope']),
  ...asArray<Json>(annotation['target']).flatMap(target => asArray<Json | string>(target?.['scope'])),
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

type ScopeRef = { id?: string; embedded?: IIIFCameraItem };

const isActivating = (annotation: Json) =>
  asArray(annotation['motivation']).includes('activating');

const refId = (ref: unknown): string | undefined =>
  typeof ref === 'string' ? ref : typeof (ref as Json)?.['id'] === 'string' ? (ref as Json)['id'] : undefined;

/**
 * Ids of the resources an activating annotation acts on: the source of each SpecificResource
 * body (usually a camera annotation), or the body itself when it is a plain reference.
 */
const activatedIds = (annotation: Json): string[] =>
  asArray<Json>(annotation['body'])
    .map(body => (body?.['type'] === 'SpecificResource' ? refId(body['source']) : refId(body)))
    .filter((id): id is string => id !== undefined);

const findCamera = (cameras: IIIFCameraItem[], id?: string, resourceId?: string) =>
  cameras.find(
    c =>
      (id !== undefined && (c.annotationId === id || c.resourceId === id)) ||
      (resourceId !== undefined && c.resourceId === resourceId),
  );

const emptyModel = (): IIIFSceneModel => ({
  manifestId: '',
  label: '',
  sceneId: '',
  models: [],
  canvases: [],
  cameras: [],
  lights: [],
  comments: [],
  warnings: [],
});

const LIGHT_KINDS: Record<string, LightKind> = {
  ambientlight: 'ambient',
  directionallight: 'directional',
  pointlight: 'point',
  spotlight: 'spot',
};

const SUPPORTED_SELECTOR_TYPES = ['PointSelector', 'PolygonZSelector'];

/** The annotation's own id, if it has a usable one. */
const ownId = (annotation: Json): string | undefined =>
  typeof annotation?.['id'] === 'string' && annotation['id'] !== '' ? annotation['id'] : undefined;

const parsePainting = (
  annotation: Json,
  manifest: Json,
  model: IIIFSceneModel,
  id: string = ownId(annotation) ?? 'unknown',
) => {
  const position = targetPoint(annotation);
  const annotationHidden = asArray(annotation['behavior']).includes('hidden');

  const addBody = (
    rawBody: Json,
    cameraOptions: { annotationId: string; hidden: boolean; choiceGroup?: string } = {
      annotationId: id,
      hidden: annotationHidden,
    },
  ) => {
    const { source, transforms, type } = unwrapBody(rawBody);

    if (type === 'choice') {
      // The first item is the default; alternative cameras become hidden, switchable cameras.
      const items = asArray<Json>(source['items']);
      if (!items.length) {
        model.warnings.push(`Annotation ${id}: empty Choice was skipped`);
        return;
      }
      const isCamera = (item: Json) =>
        ['perspectivecamera', 'orthographiccamera'].includes(unwrapBody(item).type);
      const choiceGroup = items.filter(isCamera).length > 1 ? id : undefined;
      addBody(items[0], { annotationId: id, hidden: annotationHidden, choiceGroup });
      items.slice(1).forEach((item, index) => {
        if (choiceGroup && isCamera(item)) {
          addBody(item, { annotationId: `${id}#choice-${index + 2}`, hidden: true, choiceGroup });
        } else {
          model.warnings.push(
            `Annotation ${id}: only the first item of the Choice is used, a "${unwrapBody(item).type}" alternative was ignored`,
          );
        }
      });
      return;
    }

    if (type === 'model') {
      if (typeof source['id'] !== 'string') {
        model.warnings.push(`Annotation ${id}: Model without id was skipped`);
        return;
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
        annotationId: cameraOptions.annotationId,
        ...(cameraOptions.choiceGroup ? { choiceGroup: cameraOptions.choiceGroup } : {}),
        projection: type === 'perspectivecamera' ? 'perspective' : 'orthographic',
        label: firstLabel(source['label']),
        position,
        transforms,
        resourceId: typeof source['id'] === 'string' ? source['id'] : undefined,
        fieldOfView: toNumber(source['fieldOfView']),
        near: toNumber(source['near']),
        far: toNumber(source['far']),
        viewHeight: toNumber(source['viewHeight']),
        hidden: cameraOptions.hidden,
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
      if (!canvas) {
        model.warnings.push(`Annotation ${id}: Canvas not found in the Manifest`);
        return;
      }
      const polygon = targetSelectors(annotation).find(s => s?.['type'] === 'PolygonZSelector');
      if (typeof polygon?.['value'] === 'string') {
        model.canvases.push({ annotationId: id, canvas, polygonZ: polygon['value'] });
        return;
      }
      const width = toNumber(canvas['width']);
      const height = toNumber(canvas['height']);
      if (!width || !height || width <= 0 || height <= 0) {
        model.warnings.push(`Annotation ${id}: Canvas has no usable width and height`);
        return;
      }
      model.canvases.push({
        annotationId: id,
        canvas,
        corners: canvasCorners(width, height, transforms, position),
        transforms,
        position,
      });
    } else if (type === 'scene') {
      model.warnings.push(`Annotation ${id}: nested Scenes are not supported`);
    } else {
      model.warnings.push(`Annotation ${id}: Unsupported body type "${type}"`);
    }
  };

  asArray<Json>(annotation['body']).forEach(rawBody => addBody(rawBody));
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

  const pendingScopes: Array<{ comment: IIIFComment; refs: ScopeRef[] }> = [];
  const activations: Array<{ id: string; targets: string[]; refs: ScopeRef[] }> = [];
  let annotationCount = 0;

  for (const page of pages) {
    if (page?.['type'] !== 'AnnotationPage') continue;
    if (!Array.isArray(page['items'])) {
      model.warnings.push(`External AnnotationPage ${page['id']} was not loaded`);
      continue;
    }
    for (const annotation of page['items'] as Json[]) {
      if (annotation?.['type'] !== 'Annotation') continue;
      annotationCount++;
      let id = ownId(annotation);
      if (id === undefined) {
        // Stable per document position, so comments, cameras and models stay distinct.
        id = `${model.sceneId}#annotation-${annotationCount}`;
        model.warnings.push(`Annotation has no id, using ${id}`);
      }
      if (asArray(annotation['exclude']).length) {
        model.warnings.push(`Annotation ${id}: "exclude" is not supported and was ignored`);
      }
      // Comments also accept WKT shapes (anchored at their centre, see parseComment).
      const supportedSelectors = isComment(annotation)
        ? [...SUPPORTED_SELECTOR_TYPES, ...SHAPE_SELECTOR_TYPES]
        : SUPPORTED_SELECTOR_TYPES;
      for (const selector of targetSelectors(annotation)) {
        if (!supportedSelectors.includes(selector?.['type'])) {
          model.warnings.push(
            `Annotation ${id}: Unsupported selector type "${selector?.['type']}" was ignored`,
          );
        }
      }
      if (isActivating(annotation)) {
        activations.push({
          id,
          targets: asArray(annotation['target'])
            .map(refId)
            .filter((t): t is string => t !== undefined),
          refs: activatedIds(annotation).map(ref => ({ id: ref })),
        });
      } else if (isComment(annotation)) {
        const comment = parseComment(annotation, id, model.warnings);
        if (comment) {
          model.comments.push(comment);
          const refs: ScopeRef[] = [];
          for (const entry of scopeRefs(annotation)) {
            const ref = typeof entry === 'string' ? { id: entry } : entry;
            const embedded = embeddedPaintingAnnotations(ref);
            if (embedded.length) {
              const scratch = emptyModel();
              embedded.forEach((painting, index) =>
                parsePainting(
                  painting,
                  manifest,
                  scratch,
                  ownId(painting) ?? `${comment.annotationId}#scope-${index + 1}`,
                ),
              );
              if (scratch.models.length || scratch.lights.length || scratch.canvases.length) {
                model.warnings.push(
                  `Comment ${comment.annotationId}: scope contains a non-camera resource that was ignored`,
                );
              }
              refs.push({ embedded: scratch.cameras[0] });
            } else if (typeof ref?.['id'] === 'string') {
              refs.push({ id: ref['id'] });
            } else {
              model.warnings.push(`Comment ${comment.annotationId}: unusable scope entry ignored`);
            }
          }
          pendingScopes.push({ comment, refs });
        }
      } else {
        parsePainting(annotation, manifest, model, id);
      }
    }
  }

  // Activating annotations link a comment (target) to the camera annotation it activates (body).
  // They are appended after the comment's own scope references, so an explicit scope wins.
  for (const activation of activations) {
    const pending = pendingScopes.filter(p => activation.targets.includes(p.comment.annotationId));
    if (!pending.length) {
      model.warnings.push(`Activating annotation ${activation.id} does not target a known comment`);
      continue;
    }
    pending.forEach(p => p.refs.push(...activation.refs));
  }

  // Resolved after all pages are parsed, so a camera may appear after the comment referencing it.
  for (const { comment, refs } of pendingScopes) {
    const resolved: IIIFCameraItem[] = [];
    for (const ref of refs) {
      const camera = findCamera(model.cameras, ref.id ?? ref.embedded?.annotationId, ref.embedded?.resourceId);
      const found = camera ?? ref.embedded;
      if (found) resolved.push(found);
    }
    const chosen = resolved[0];
    if (chosen) {
      // Embedded cameras are only added when no camera with the same id exists yet
      if (!model.cameras.some(c => c.annotationId === chosen.annotationId)) {
        model.cameras.push({ ...chosen, hidden: true });
      }
      comment.cameraAnnotationId = chosen.annotationId;
      if (new Set(resolved.map(c => c.annotationId)).size > 1) {
        model.warnings.push(
          `Comment ${comment.annotationId}: multiple scope references, using ${chosen.annotationId}`,
        );
      }
    } else if (refs.length) {
      model.warnings.push(`Comment ${comment.annotationId}: scope does not reference a known camera`);
    }
  }

  return model;
};
