import { describe, expect, test } from 'bun:test';
import { makeAnnotation, makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest, isPublicUrl, modelFormatFromUrl } from './exporter';

const BASE = 'https://viewer.example/viewer/iiif/e1';
const SCENE = `${BASE}/scene/1`;

const ID_TYPES = ['Manifest', 'Scene', 'AnnotationPage', 'Annotation', 'PerspectiveCamera'];
const REFERENCE_KEYS = ['scope', 'target', 'source'];

const collectIds = (value: unknown, ids: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach(v => collectIds(v, ids));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['id'] === 'string' && ID_TYPES.includes(record['type'] as string)) ids.push(record['id']);
    for (const [key, v] of Object.entries(record)) {
      if (!REFERENCE_KEYS.includes(key)) collectIds(v, ids);
    }
  }
  return ids;
};

const sceneOf = (input: ReturnType<typeof makeInput>) => {
  const result = exportManifest(input);
  return { ...result, scene: result.manifest.items[0] as any };
};
const commentsOf = (scene: any): any[] => scene.annotations?.[0]?.items ?? [];

describe('helpers', () => {
  test('modelFormatFromUrl', () => {
    expect(modelFormatFromUrl('https://x/y/model.GLB?token=1')).toBe('model/gltf-binary');
    expect(modelFormatFromUrl('https://x/y/model.gltf')).toBe('model/gltf+json');
    expect(modelFormatFromUrl('https://x/y/model.xyz')).toBeUndefined();
  });

  test('isPublicUrl', () => {
    expect(isPublicUrl('https://kompakkt.de/a.glb')).toBe(true);
    expect(isPublicUrl('blob:https://x/123')).toBe(false);
    expect(isPublicUrl('http://localhost:4200/a.glb')).toBe(false);
    expect(isPublicUrl('not a url')).toBe(false);
  });
});

describe('exportManifest', () => {
  test('builds a IIIF 4.0 manifest with one scene', () => {
    const { manifest, warnings } = exportManifest(makeInput());
    expect(manifest['@context']).toBe('http://iiif.io/api/presentation/4/context.json');
    expect(manifest.type).toBe('Manifest');
    expect(manifest.id).toBe('https://viewer.example/viewer/?entity=e1');
    expect(manifest.label).toEqual({ none: ['Pawn'] });
    const scene = manifest.items[0] as any;
    expect(scene.type).toBe('Scene');
    expect(scene.id).toBe(SCENE);
    expect(scene.backgroundColor).toBe('#99CCFF');
    expect(warnings).toEqual([]);
  });

  test('paints the model without transforms when settings are neutral', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const model = scene.items[0].items[0];
    expect(model.motivation).toEqual(['painting']);
    expect(model.body).toEqual({
      id: 'https://kompakkt.de/server/models/pawn/high.glb',
      type: 'Model',
      format: 'model/gltf-binary',
    });
    expect(model.target).toEqual({ id: SCENE, type: 'Scene' });
  });

  test('exports the effective model placement (IIIF space) and ignores settings transforms', () => {
    const settings = makeSettings({ scale: 5, rotation: { x: 1, y: 2, z: 3 }, translate: { x: 9, y: 9, z: 9 } });
    const modelTransform = {
      scale: { x: 2, y: 3, z: 4 },
      rotation: { x: 10, y: -20, z: 30 },
      translation: { x: -1, y: 2, z: 3 },
    };
    const { manifest, warnings } = exportManifest(makeInput({ settings, modelTransform }));
    const scene = manifest.items[0] as any;
    expect(scene.items[0].items[0].body.transform).toEqual([
      { type: 'ScaleTransform', x: 2, y: 3, z: 4 },
      { type: 'RotateTransform', x: 10, y: -20, z: 30 },
      { type: 'TranslateTransform', x: -1, y: 2, z: 3 },
    ]);
    expect(warnings).toEqual([]);
  });

  test('falls back to settings transforms with a warning when no effective placement is given', () => {
    const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 90, z: 0 }, translate: { x: 1, y: 2, z: 3 } });
    const { manifest, warnings } = exportManifest(makeInput({ settings, modelTransform: undefined }));
    const scene = manifest.items[0] as any;
    expect(scene.items[0].items[0].body.transform).toEqual([
      { type: 'ScaleTransform', x: 2, y: 2, z: 2 },
      { type: 'RotateTransform', x: 10, y: -90, z: 0 },
      { type: 'TranslateTransform', x: -1, y: 2, z: 3 },
    ]);
    expect(warnings.some(w => w.includes('placement'))).toBe(true);
  });

  test('exports the initial camera as cartesian PerspectiveCamera with id', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const camera = scene.items[0].items.find((a: any) => a.id.endsWith('/anno/camera'));
    expect(camera.id).toBe(`${SCENE}/anno/camera`);
    expect(camera.body.id).toBe(`${BASE}/camera/initial`);
    expect(camera.body.type).toBe('PerspectiveCamera');
    expect(camera.body.lookAt).toEqual({ type: 'PointSelector', x: 0, y: 0, z: 0 });
    const selector = camera.target.selector[0];
    expect(selector.x).toBeCloseTo(0);
    expect(selector.y).toBeCloseTo(0);
    expect(selector.z).toBeCloseTo(10);
  });

  test('exports comments sorted by ranking with point and hidden camera', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const comments = scene.annotations[0].items;
    expect(comments.map((c: any) => c.id)).toEqual([`${SCENE}/comment/a1`, `${SCENE}/comment/a2`]);
    expect(comments[0].motivation).toEqual(['commenting']);
    expect(comments[0].body).toEqual({
      type: 'TextualBody',
      value: 'First',
      format: 'text/markdown',
      label: { none: ['First'] },
    });
    expect(comments[0].target.selector).toEqual([{ type: 'PointSelector', x: 1, y: 2, z: 3 }]);
    expect(comments[0].scope).toEqual([{ id: `${BASE}/camera/comment/a1`, type: 'PerspectiveCamera' }]);
    const camera = scene.items[0].items.find((a: any) => a.body?.id === comments[0].scope[0].id);
    expect(camera.id).toBe(`${SCENE}/comment-camera/a1`);
    expect(camera.behavior).toEqual(['hidden']);
    expect(camera.body.type).toBe('PerspectiveCamera');
  });

  test('exports lights with Quantity intensity', () => {
    const settings = makeSettings({
      lights: [
        { type: 'HemisphericLight', position: { x: 0, y: 1, z: 0 }, intensity: 0.5 },
        { type: 'PointLight', position: { x: 1, y: 2, z: 3 }, intensity: 1 },
      ],
    });
    const { manifest, warnings } = exportManifest(makeInput({ settings }));
    const scene = manifest.items[0] as any;
    const lights = scene.items[0].items.filter((a: any) => a.id.includes('/anno/light/'));
    expect(lights.map((l: any) => l.body.type)).toEqual(['AmbientLight', 'PointLight']);
    expect(lights[0].body.intensity).toEqual({ type: 'Quantity', quantityValue: 0.5, unit: 'relative' });
    expect(lights[1].target.selector[0]).toEqual({ type: 'PointSelector', x: -1, y: 2, z: 3 });
    expect(warnings).toEqual([]);
  });

  test('clamps light intensity to 0..1 with a warning', () => {
    const settings = makeSettings({
      lights: [{ type: 'PointLight', position: { x: 0, y: 1, z: 0 }, intensity: 2.5 }],
    });
    const { manifest, warnings } = exportManifest(makeInput({ settings }));
    const scene = manifest.items[0] as any;
    const light = scene.items[0].items.find((a: any) => a.id.includes('/anno/light/'));
    expect(light.body.intensity.quantityValue).toBe(1);
    expect(warnings).toContain('Light intensity 2.5 clamped to 0..1');
  });

  test('all annotation ids are unique', () => {
    const ids = collectIds(exportManifest(makeInput()).manifest);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('warns about non-public model URLs and unknown formats', () => {
    const { warnings } = exportManifest(makeInput({ modelUrl: 'blob:http://localhost/123' }));
    expect(warnings.some(w => w.includes('not publicly reachable'))).toBe(true);
    expect(warnings.some(w => w.includes('Unknown model format'))).toBe(true);
  });

  test('warns when IDs are not HTTP(S)', () => {
    const { warnings } = exportManifest(makeInput({ manifestId: 'urn:x' }));
    expect(warnings.some(w => w.includes('HTTP(S)') && w.includes('urn:x'))).toBe(true);
    const base = exportManifest(makeInput({ baseId: 'urn:y' })).warnings;
    expect(base.some(w => w.includes('HTTP(S)') && w.includes('urn:y'))).toBe(true);
  });

  test('keeps a comment without relatedPerspective but skips camera and scope', () => {
    const a = makeAnnotation('x1', 1, 'T', 'D', { x: 1, y: 1, z: 1 }) as any;
    delete a.body.content.relatedPerspective;
    const { scene, warnings } = sceneOf(makeInput({ annotations: [a] }));
    const comments = commentsOf(scene);
    expect(comments).toHaveLength(1);
    expect(comments[0].scope).toBeUndefined();
    expect(scene.items[0].items.some((x: any) => x.id.includes('/comment-camera/'))).toBe(false);
    expect(warnings).toContain('Annotation x1: no camera perspective, exported without a camera');
  });

  const invalidVectors: [string, unknown][] = [
    ['missing', undefined],
    ['partial', { x: 1, y: 2 }],
    ['NaN', { x: 1, y: NaN, z: 0 }],
    ['Infinity', { x: Infinity, y: 0, z: 0 }],
  ];
  for (const [name, value] of invalidVectors) {
    test(`skips a comment camera with ${name} perspective position and drops its scope`, () => {
      const a = makeAnnotation('x1', 1, 'T', 'D', { x: 1, y: 1, z: 1 }) as any;
      a.body.content.relatedPerspective.position = value;
      const { scene, warnings } = sceneOf(makeInput({ annotations: [a] }));
      const comments = commentsOf(scene);
      expect(comments).toHaveLength(1);
      expect(comments[0].scope).toBeUndefined();
      expect(scene.items[0].items.some((x: any) => x.id.includes('/comment-camera/'))).toBe(false);
      expect(warnings.some(w => w.startsWith('Annotation x1:') && w.includes('camera'))).toBe(true);
    });

    test(`skips a comment camera with ${name} perspective target`, () => {
      const a = makeAnnotation('x1', 1, 'T', 'D', { x: 1, y: 1, z: 1 }) as any;
      a.body.content.relatedPerspective.target = value;
      const { scene } = sceneOf(makeInput({ annotations: [a] }));
      expect(commentsOf(scene)[0].scope).toBeUndefined();
      expect(scene.items[0].items.some((x: any) => x.id.includes('/comment-camera/'))).toBe(false);
    });

    test(`skips the initial camera with ${name} position or target`, () => {
      for (const key of ['position', 'target'] as const) {
        const settings = makeSettings();
        (settings.cameraPositionInitial as any)[key] = value;
        const { scene, warnings } = sceneOf(makeInput({ settings }));
        expect(scene.items[0].items.some((a: any) => a.id.endsWith('/anno/camera'))).toBe(false);
        expect(warnings.some(w => w.includes('Initial camera'))).toBe(true);
      }
    });
  }

  test('skips a comment without referencePoint', () => {
    const a = makeAnnotation('x1', 1, 'T', 'D', { x: 1, y: 1, z: 1 }) as any;
    delete a.target.selector.referencePoint;
    const { scene, warnings } = sceneOf(makeInput({ annotations: [a] }));
    expect(commentsOf(scene)).toHaveLength(0);
    expect(scene.annotations).toBeUndefined();
    expect(scene.items[0].items.some((x: any) => x.id.includes('/comment-camera/'))).toBe(false);
    expect(warnings).toContain('Annotation x1: no reference point, skipped');
  });

  test('ignores a non-finite light intensity with a warning', () => {
    const settings = makeSettings({
      lights: [{ type: 'PointLight', position: { x: 0, y: 1, z: 0 }, intensity: NaN }],
    });
    const { scene, warnings } = sceneOf(makeInput({ settings }));
    const light = scene.items[0].items.find((a: any) => a.id.includes('/anno/light/'));
    expect(light).toBeDefined();
    expect('intensity' in light.body).toBe(false);
    expect(warnings).toContain('Light 1: invalid intensity ignored');
    expect(warnings.some(w => w.includes('clamped'))).toBe(false);
  });

  test('makes comment ids unique for duplicate and missing _id', () => {
    const mk = (id: unknown, ranking: number) => {
      const a = makeAnnotation('tmp', ranking, `T${ranking}`, 'D', { x: 1, y: 1, z: 1 }) as any;
      a._id = id;
      return a;
    };
    const input = makeInput({ annotations: [mk('dup', 1), mk('dup', 2), mk(undefined, 3), mk('', 4)] });
    const { manifest, warnings } = sceneOf(input);
    const ids = collectIds(manifest);
    expect(new Set(ids).size).toBe(ids.length);
    expect(warnings.length).toBeGreaterThanOrEqual(3);
    expect(warnings.some(w => w.includes('dup'))).toBe(true);
  });

  test('sorts annotations with missing ranking last', () => {
    const a1 = makeAnnotation('r1', 1, 'A', 'D', { x: 1, y: 1, z: 1 }) as any;
    const none = makeAnnotation('rn', 0, 'N', 'D', { x: 1, y: 1, z: 1 }) as any;
    none.ranking = undefined;
    const a2 = makeAnnotation('r2', 2, 'B', 'D', { x: 1, y: 1, z: 1 }) as any;
    const { scene } = sceneOf(makeInput({ annotations: [none, a2, a1] }));
    expect(commentsOf(scene).map((c: any) => c.id)).toEqual([
      `${SCENE}/comment/r1`,
      `${SCENE}/comment/r2`,
      `${SCENE}/comment/rn`,
    ]);
  });

  test('omits scene.annotations when there are no annotations', () => {
    const { scene } = sceneOf(makeInput({ annotations: [] }));
    expect(scene.annotations).toBeUndefined();
  });

  test('omits the initial camera when settings have none', () => {
    const settings = makeSettings({ cameraPositionInitial: undefined } as any);
    const { scene } = sceneOf(makeInput({ settings }));
    expect(scene.items[0].items.some((a: any) => a.id.endsWith('/anno/camera'))).toBe(false);
  });
});

describe('exportManifest – several models', () => {
  const identity = { scale: { x: 1, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, translation: { x: 0, y: 0, z: 0 } };
  const models = [
    {
      url: 'https://example.org/whale_mandible.glb',
      transform: { ...identity, translation: { x: 0, y: 0.03, z: 0.05 } },
    },
    {
      url: 'https://example.org/whale_cranium.glb',
      transform: { ...identity, rotation: { x: 0, y: 90, z: 0 }, translation: { x: 0, y: 0.18, z: 0 } },
    },
  ];

  test('paints one annotation per model, each with its own placement', () => {
    const { scene, warnings } = sceneOf(makeInput({ models, modelUrl: undefined, modelTransform: undefined }));
    const paintings = scene.items[0].items.filter((a: any) => a.body?.source?.type === 'Model' || a.body?.type === 'Model');
    expect(paintings).toHaveLength(2);
    expect(paintings.map((a: any) => a.id)).toEqual([`${SCENE}/anno/model/1`, `${SCENE}/anno/model/2`]);
    expect(paintings[0].body).toEqual({
      type: 'SpecificResource',
      source: { id: models[0].url, type: 'Model', format: 'model/gltf-binary' },
      transform: [{ type: 'TranslateTransform', x: 0, y: 0.03, z: 0.05 }],
    });
    expect(paintings[1].body.transform).toEqual([
      { type: 'RotateTransform', x: 0, y: 90, z: 0 },
      { type: 'TranslateTransform', x: 0, y: 0.18, z: 0 },
    ]);
    expect(warnings).toEqual([]);
  });

  test('a single entry in models keeps the single-model id', () => {
    const { scene } = sceneOf(makeInput({ models: [models[0]], modelUrl: undefined, modelTransform: undefined }));
    expect(scene.items[0].items[0].id).toBe(`${SCENE}/anno/model`);
  });

  test('a model without placement is exported untransformed with a warning', () => {
    const { scene, warnings } = sceneOf(
      makeInput({ models: [models[0], { url: models[1].url }], modelUrl: undefined, modelTransform: undefined }),
    );
    expect(scene.items[0].items[1].body).toEqual({ id: models[1].url, type: 'Model', format: 'model/gltf-binary' });
    expect(warnings.some(w => w.includes(`placement unavailable for ${models[1].url}`))).toBe(true);
  });

  test('warns per model about non-public URLs', () => {
    const { warnings } = sceneOf(
      makeInput({ models: [models[0], { url: 'blob:abc', transform: identity }], modelUrl: undefined, modelTransform: undefined }),
    );
    expect(warnings.some(w => w.includes('not publicly reachable: blob:abc'))).toBe(true);
  });

  test('all ids stay unique', () => {
    const { manifest } = exportManifest(makeInput({ models, modelUrl: undefined, modelTransform: undefined }));
    const ids = collectIds(manifest);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
