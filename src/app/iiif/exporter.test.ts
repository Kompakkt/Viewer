import { describe, expect, test } from 'bun:test';
import { makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest, isPublicUrl, modelFormatFromUrl } from './exporter';

const BASE = 'https://viewer.example/viewer/iiif/e1';
const SCENE = `${BASE}/scene/1`;

const collectIds = (value: unknown, ids: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach(v => collectIds(v, ids));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['id'] === 'string' && record['type'] === 'Annotation' && 'motivation' in record) {
      ids.push(record['id']);
    }
    Object.values(record).forEach(v => collectIds(v, ids));
  }
  return ids;
};

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

  test('exports scale, rotation and translation in IIIF space and order', () => {
    const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 90, z: 0 }, translate: { x: 1, y: 2, z: 3 } });
    const scene = exportManifest(makeInput({ settings })).manifest.items[0] as any;
    expect(scene.items[0].items[0].body.transform).toEqual([
      { type: 'ScaleTransform', x: 2, y: 2, z: 2 },
      { type: 'RotateTransform', x: 10, y: -90, z: 0 },
      { type: 'TranslateTransform', x: -1, y: 2, z: 3 },
    ]);
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
});
