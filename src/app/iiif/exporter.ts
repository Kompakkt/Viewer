import type { IAnnotation, IEntitySettings } from 'src/common';
import { rgbToHex } from './color';
import { arcRotateToCartesian, pointToIIIF, rotationToIIIF, toVec3, type Vec3 } from './coordinates';
import type { CameraProjection, IIIFTransform } from './model';
import { modelTransformToIIIFTransforms, type IIIFModelTransform } from './placement';
import {
  PRESENTATION_4_CONTEXT,
  type Annotation,
  type Manifest,
  type PointSelector,
  type Quantity,
  type Reference,
  type Resource,
  type Scene,
  type Transform,
} from './types';

export interface ExportModel {
  /** absolute URL of the model */
  url: string;
  /** Effective placement in IIIF space (see `modelTransform`); without it, no transform is exported. */
  transform?: IIIFModelTransform;
}

/** A Canvas painted into the Scene (from an imported IIIF scene). All vectors in IIIF space. */
export interface ExportCanvas {
  /** Canvas JSON as in the imported manifest; added to the Manifest's items. */
  canvas: Record<string, any>;
  /** Body transforms of the painting annotation, in document order */
  transforms?: IIIFTransform[];
  /** PointSelector of the target (top-left corner of the Canvas) */
  position?: Vec3;
  /** Older draft form: corners as PolygonZSelector value; exported unchanged */
  polygonZ?: string;
}

/** Default camera as displayed (from an imported IIIF scene), IIIF space. */
export interface ExportCamera {
  projection: CameraProjection;
  position: Vec3;
  target: Vec3;
  /** OrthographicCamera: height of the view in Scene units */
  viewHeight?: number;
  /** PerspectiveCamera: degrees */
  fieldOfView?: number;
  near?: number;
  far?: number;
  label?: string;
}

export interface ManifestExportInput {
  entityId: string;
  entityName: string;
  /** absolute URL of the model (single-model entities; ignored when `models` is given) */
  modelUrl?: string;
  settings: IEntitySettings;
  /**
   * Effective placement of the model in IIIF space (Scale → Rotate → Translate), derived from the
   * Babylon world matrices (see placement.ts / loaded-model-placement.ts). Kompakkt auto-places
   * models (bounding-box minimum to the origin, pivot at the bounding-box center), so
   * `settings.scale/rotation/translate` alone do not describe where the model is displayed.
   * Without it, the exporter falls back to the settings with a warning.
   */
  modelTransform?: IIIFModelTransform;
  /** Several models (e.g. an imported multi-model IIIF scene), painted in this order. */
  models?: ExportModel[];
  /** Canvases painted into the Scene, in this order. */
  canvases?: ExportCanvas[];
  /**
   * Default camera that replaces `settings.cameraPositionInitial`; `null` exports no default
   * camera (e.g. an imported scene without one, where the importer positions the camera itself).
   */
  camera?: ExportCamera | null;
  annotations: IAnnotation[];
  /** HTTP(S) viewer URL of the entity, used as manifest id */
  manifestId: string;
  /** HTTP(S) prefix for all other ids */
  baseId: string;
}

export interface ManifestExportResult {
  manifest: Manifest;
  warnings: string[];
}

const MODEL_FORMATS: Record<string, string> = {
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  obj: 'model/obj',
  stl: 'model/stl',
  ply: 'model/ply',
};

export const modelFormatFromUrl = (url: string): string | undefined => {
  const path = url.split(/[?#]/)[0];
  const dot = path.lastIndexOf('.');
  return dot < 0 ? undefined : MODEL_FORMATS[path.slice(dot + 1).toLowerCase()];
};

const isHttpUrl = (url: string): boolean => {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

export const isPublicUrl = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return isHttpUrl(url) && !['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
};

/** Kompakkt light type → IIIF light type */
const LIGHT_TYPES: Record<string, string> = {
  HemisphericLight: 'AmbientLight',
  PointLight: 'PointLight',
  DirectionalLight: 'DirectionalLight',
};

const pointSelector = (p: Vec3): PointSelector => ({ type: 'PointSelector', x: p.x, y: p.y, z: p.z });

/** Like toVec3, but undefined unless all three components are present and finite. */
const finiteVec3 = (value: unknown): Vec3 | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const pick = (key: 'x' | 'y' | 'z') => {
    const raw = record[key] ?? record[`_${key}`];
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  };
  const [x, y, z] = [pick('x'), pick('y'), pick('z')];
  return x === undefined || y === undefined || z === undefined ? undefined : { x, y, z };
};

/** Kompakkt camera (alpha/beta/radius + target, Babylon) → Cartesian IIIF points; undefined if incomplete. */
const cameraPoints = (arcPosition: unknown, rawTarget: unknown) => {
  const arc = finiteVec3(arcPosition);
  const target = finiteVec3(rawTarget);
  if (!arc || !target) return undefined;
  const position = arcRotateToCartesian({ alpha: arc.x, beta: arc.y, radius: arc.z }, target);
  if (![position.x, position.y, position.z].every(Number.isFinite)) return undefined;
  return { position: pointToIIIF(position), target: pointToIIIF(target) };
};

/** Rounds float noise of displayed camera values to 6 decimals; avoids -0. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6 + 0;
const round6Vec = (v: Vec3): Vec3 => ({ x: round6(v.x), y: round6(v.y), z: round6(v.z) });

const TRANSFORM_TYPES = {
  scale: 'ScaleTransform',
  rotate: 'RotateTransform',
  translate: 'TranslateTransform',
} as const;

export const exportManifest = (input: ManifestExportInput): ManifestExportResult => {
  const warnings: string[] = [];
  const { settings, baseId, manifestId } = input;
  const sceneId = `${baseId}/scene/1`;
  const sceneRef: Reference = { id: sceneId, type: 'Scene' };
  const label = { none: [input.entityName] };

  for (const id of [manifestId, baseId]) {
    if (!isHttpUrl(id)) warnings.push(`IDs must be HTTP(S) URIs: ${id}`);
  }

  const placedAt = (p: Vec3) => ({
    type: 'SpecificResource' as const,
    source: sceneRef,
    selector: [pointSelector(p)],
  });

  /** Returns undefined (and the caller warns) if the camera vectors are incomplete. */
  const cameraAnnotation = (
    id: string,
    bodyId: string,
    arcPosition: unknown,
    rawTarget: unknown,
    extra: Partial<Annotation> = {},
  ): Annotation | undefined => {
    const points = cameraPoints(arcPosition, rawTarget);
    if (!points) return undefined;
    return {
      id,
      type: 'Annotation',
      motivation: ['painting'],
      body: { id: bodyId, type: 'PerspectiveCamera', lookAt: pointSelector(points.target) },
      target: placedAt(points.position),
      ...extra,
    };
  };

  // Models
  const toIIIFTransforms = (transform: IIIFModelTransform): Transform[] =>
    modelTransformToIIIFTransforms(transform).map(({ kind, value }) => ({
      type: TRANSFORM_TYPES[kind],
      ...value,
    }));

  /** Settings transforms, for a single model whose effective placement is unknown. */
  const settingsTransforms = (): Transform[] => {
    warnings.push(
      'Effective model placement unavailable: exporting settings transforms, which ignore Kompakkt\'s auto-placement',
    );
    const transforms: Transform[] = [];
    if (settings.scale !== undefined && settings.scale !== 1) {
      transforms.push({ type: 'ScaleTransform', x: settings.scale, y: settings.scale, z: settings.scale });
    }
    const rotation = toVec3(settings.rotation);
    if (rotation.x || rotation.y || rotation.z) {
      transforms.push({ type: 'RotateTransform', ...rotationToIIIF(rotation) });
    }
    const translate = toVec3(settings.translate);
    if (translate.x || translate.y || translate.z) {
      transforms.push({ type: 'TranslateTransform', ...pointToIIIF(translate) });
    }
    return transforms;
  };

  const multiModel = !!input.models;
  const models: ExportModel[] =
    input.models ??
    (input.modelUrl ? [{ url: input.modelUrl, transform: input.modelTransform }] : []);
  if (!models.length && !input.canvases?.length) warnings.push('No model to export');

  const painting: Annotation[] = models.map((model, index) => {
    if (!isPublicUrl(model.url)) warnings.push(`Model URL is not publicly reachable: ${model.url}`);
    const format = modelFormatFromUrl(model.url);
    if (!format) warnings.push(`Unknown model format for ${model.url}`);
    const modelResource = { id: model.url, type: 'Model', ...(format ? { format } : {}) };

    let transforms: Transform[] = [];
    if (model.transform) transforms = toIIIFTransforms(model.transform);
    else if (!multiModel) transforms = settingsTransforms();
    else warnings.push(`Effective model placement unavailable for ${model.url}: exported without transforms`);

    return {
      id: models.length > 1 ? `${sceneId}/anno/model/${index + 1}` : `${sceneId}/anno/model`,
      type: 'Annotation',
      motivation: ['painting'],
      body: transforms.length
        ? { type: 'SpecificResource', source: modelResource, transform: transforms }
        : modelResource,
      target: sceneRef,
    };
  });

  // Canvases
  const canvasItems: Resource[] = [];
  (input.canvases ?? []).forEach((item, index) => {
    const canvasId = item.canvas?.['id'];
    if (typeof canvasId !== 'string' || item.canvas?.['type'] !== 'Canvas') {
      warnings.push(`Canvas ${index + 1}: no Canvas with an id, skipped`);
      return;
    }
    if (!canvasItems.some(canvas => canvas.id === canvasId)) canvasItems.push(item.canvas as Resource);
    const source: Resource = { id: canvasId, type: 'Canvas' };
    const transforms: Transform[] = (item.transforms ?? []).map(({ kind, value }) => ({
      type: TRANSFORM_TYPES[kind],
      ...value,
    }));
    let target: Annotation['target'] = sceneRef;
    if (item.position) {
      target = placedAt(item.position);
    } else if (item.polygonZ) {
      warnings.push(`Canvas ${canvasId}: exported with the PolygonZSelector of an older draft`);
      target = {
        type: 'SpecificResource',
        source: sceneRef,
        selector: [{ type: 'PolygonZSelector', value: item.polygonZ }],
      };
    }
    painting.push({
      id: `${sceneId}/anno/canvas/${index + 1}`,
      type: 'Annotation',
      motivation: ['painting'],
      body: transforms.length ? { type: 'SpecificResource', source, transform: transforms } : source,
      target,
    });
  });

  // Default camera
  if (input.camera) {
    const { camera } = input;
    const orthographic = camera.projection === 'orthographic';
    painting.push({
      id: `${sceneId}/anno/camera`,
      type: 'Annotation',
      motivation: ['painting'],
      body: {
        id: `${baseId}/camera/initial`,
        type: orthographic ? 'OrthographicCamera' : 'PerspectiveCamera',
        ...(camera.label !== undefined ? { label: { none: [camera.label] } } : {}),
        lookAt: pointSelector(round6Vec(camera.target)),
        ...(orthographic && camera.viewHeight !== undefined ? { viewHeight: round6(camera.viewHeight) } : {}),
        ...(!orthographic && camera.fieldOfView !== undefined ? { fieldOfView: camera.fieldOfView } : {}),
        ...(camera.near !== undefined ? { near: camera.near } : {}),
        ...(camera.far !== undefined ? { far: camera.far } : {}),
      },
      target: placedAt(round6Vec(camera.position)),
    });
  } else if (input.camera === undefined && settings.cameraPositionInitial) {
    const camera = cameraAnnotation(
      `${sceneId}/anno/camera`,
      `${baseId}/camera/initial`,
      settings.cameraPositionInitial.position,
      settings.cameraPositionInitial.target,
    );
    if (camera) painting.push(camera);
    else warnings.push('Initial camera: position or target missing or not finite, skipped');
  }

  // Lights
  (settings.lights ?? []).forEach((light, index) => {
    const type = LIGHT_TYPES[light.type];
    if (!type) {
      warnings.push(`Light type ${light.type} is not exported`);
      return;
    }
    let intensity: Quantity | undefined;
    if (typeof light.intensity === 'number' && Number.isFinite(light.intensity)) {
      const quantityValue = Math.min(1, Math.max(0, light.intensity));
      if (quantityValue !== light.intensity) {
        warnings.push(`Light intensity ${light.intensity} clamped to 0..1`);
      }
      intensity = { type: 'Quantity', quantityValue, unit: 'relative' };
    } else {
      warnings.push(`Light ${index + 1}: invalid intensity ignored`);
    }
    painting.push({
      id: `${sceneId}/anno/light/${index + 1}`,
      type: 'Annotation',
      motivation: ['painting'],
      body: { type, ...(intensity ? { intensity } : {}) },
      target: type === 'AmbientLight' ? sceneRef : placedAt(pointToIIIF(toVec3(light.position))),
    });
  });

  // Comments
  const rankOf = (a: IAnnotation) =>
    typeof a.ranking === 'number' && Number.isFinite(a.ranking) ? a.ranking : Number.MAX_SAFE_INTEGER;
  const usedKeys = new Set<string>();
  const uniqueKey = (raw: unknown, index: number): string => {
    const missing = raw === undefined || raw === null || String(raw) === '';
    const base = missing ? `n${index}` : encodeURIComponent(String(raw));
    if (missing) warnings.push(`Annotation at position ${index}: missing id, using ${base}`);
    let key = base;
    for (let n = 2; usedKeys.has(key); n++) key = `${base}-${n}`;
    if (key !== base && !missing) warnings.push(`Annotation ${base}: duplicate id, using ${key}`);
    usedKeys.add(key);
    return key;
  };

  const comments: Annotation[] = [];
  [...input.annotations]
    .map((annotation, index) => ({ annotation, index }))
    .sort((a, b) => rankOf(a.annotation) - rankOf(b.annotation) || a.index - b.index)
    .forEach(({ annotation, index }) => {
      const rawId = annotation._id;
      const label0 = rawId === undefined || rawId === null || String(rawId) === '' ? `n${index}` : String(rawId);
      const referencePoint = annotation.target?.selector?.referencePoint;
      if (referencePoint === undefined || referencePoint === null) {
        warnings.push(`Annotation ${label0}: no reference point, skipped`);
        return;
      }
      const key = uniqueKey(rawId, index);
      const content = annotation.body?.content;
      const title = content?.title ?? '';
      const description = content?.description;
      const perspective = content?.relatedPerspective;
      let scope: Reference[] | undefined;
      if (perspective?.position && perspective?.target) {
        const cameraBodyId = `${baseId}/camera/comment/${key}`;
        const camera = cameraAnnotation(
          `${sceneId}/comment-camera/${key}`,
          cameraBodyId,
          perspective.position,
          perspective.target,
          { behavior: ['hidden'] },
        );
        if (camera) {
          painting.push(camera);
          scope = [{ id: cameraBodyId, type: 'PerspectiveCamera' }];
        } else {
          warnings.push(
            `Annotation ${label0}: camera position or target missing or not finite, exported without a camera`,
          );
        }
      } else {
        warnings.push(`Annotation ${label0}: no camera perspective, exported without a camera`);
      }
      comments.push({
        id: `${sceneId}/comment/${key}`,
        type: 'Annotation',
        motivation: ['commenting'],
        body: {
          type: 'TextualBody',
          value: description || title,
          format: 'text/markdown',
          label: { none: [title] },
        },
        target: placedAt(pointToIIIF(toVec3(referencePoint))),
        ...(scope ? { scope } : {}),
      });
    });

  const scene: Scene = {
    id: sceneId,
    type: 'Scene',
    label,
    items: [{ id: `${sceneId}/page/1`, type: 'AnnotationPage', items: painting }],
  };
  if (settings.background?.color) scene.backgroundColor = rgbToHex(settings.background.color);
  if (comments.length) {
    scene.annotations = [{ id: `${sceneId}/comments`, type: 'AnnotationPage', items: comments }];
  }

  return {
    manifest: {
      '@context': PRESENTATION_4_CONTEXT,
      id: manifestId,
      type: 'Manifest',
      label,
      items: [scene, ...canvasItems],
    },
    warnings,
  };
};
