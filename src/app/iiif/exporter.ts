import type { IAnnotation, IEntitySettings } from 'src/common';
import { rgbToHex } from './color';
import { arcRotateToCartesian, pointToIIIF, rotationToIIIF, toVec3, type Vec3 } from './coordinates';
import {
  PRESENTATION_4_CONTEXT,
  type Annotation,
  type Manifest,
  type PointSelector,
  type Quantity,
  type Reference,
  type Scene,
  type Transform,
} from './types';

export interface ManifestExportInput {
  entityId: string;
  entityName: string;
  /** absolute URL of the model */
  modelUrl: string;
  settings: IEntitySettings;
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

/** Kompakkt camera (alpha/beta/radius + target, Babylon) → Cartesian IIIF points. */
const cameraPoints = (arcPosition: unknown, rawTarget: unknown) => {
  const arc = toVec3(arcPosition);
  const target = toVec3(rawTarget);
  const position = arcRotateToCartesian({ alpha: arc.x, beta: arc.y, radius: arc.z }, target);
  return { position: pointToIIIF(position), target: pointToIIIF(target) };
};

export const exportManifest = (input: ManifestExportInput): ManifestExportResult => {
  const warnings: string[] = [];
  const { settings, baseId, manifestId } = input;
  const sceneId = `${baseId}/scene/1`;
  const sceneRef: Reference = { id: sceneId, type: 'Scene' };
  const label = { none: [input.entityName] };

  for (const id of [manifestId, baseId]) {
    if (!isHttpUrl(id)) warnings.push(`IDs must be HTTP(S) URIs: ${id}`);
  }
  if (!isPublicUrl(input.modelUrl)) {
    warnings.push(`Model URL is not publicly reachable: ${input.modelUrl}`);
  }
  const format = modelFormatFromUrl(input.modelUrl);
  if (!format) warnings.push(`Unknown model format for ${input.modelUrl}`);

  const placedAt = (p: Vec3) => ({
    type: 'SpecificResource' as const,
    source: sceneRef,
    selector: [pointSelector(p)],
  });

  const cameraAnnotation = (
    id: string,
    bodyId: string,
    arcPosition: unknown,
    rawTarget: unknown,
    extra: Partial<Annotation> = {},
  ): Annotation => {
    const { position, target } = cameraPoints(arcPosition, rawTarget);
    return {
      id,
      type: 'Annotation',
      motivation: ['painting'],
      body: { id: bodyId, type: 'PerspectiveCamera', lookAt: pointSelector(target) },
      target: placedAt(position),
      ...extra,
    };
  };

  // Model
  const modelResource = { id: input.modelUrl, type: 'Model', ...(format ? { format } : {}) };
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

  const painting: Annotation[] = [
    {
      id: `${sceneId}/anno/model`,
      type: 'Annotation',
      motivation: ['painting'],
      body: transforms.length
        ? { type: 'SpecificResource', source: modelResource, transform: transforms }
        : modelResource,
      target: sceneRef,
    },
  ];

  // Default camera
  if (settings.cameraPositionInitial) {
    painting.push(
      cameraAnnotation(
        `${sceneId}/anno/camera`,
        `${baseId}/camera/initial`,
        settings.cameraPositionInitial.position,
        settings.cameraPositionInitial.target,
      ),
    );
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
        painting.push(
          cameraAnnotation(
            `${sceneId}/comment-camera/${key}`,
            cameraBodyId,
            perspective.position,
            perspective.target,
            { behavior: ['hidden'] },
          ),
        );
        scope = [{ id: cameraBodyId, type: 'PerspectiveCamera' }];
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
    manifest: { '@context': PRESENTATION_4_CONTEXT, id: manifestId, type: 'Manifest', label, items: [scene] },
    warnings,
  };
};
