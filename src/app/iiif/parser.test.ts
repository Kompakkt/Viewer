import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';
import { IIIFParseError, parseManifest } from './parser';

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dir, '__fixtures__', name), 'utf8'));

const SCENE = 'https://example.org/iiif/scene/1';

describe('parseManifest – scene-basic', () => {
  const model = parseManifest(fixture('scene-basic.json'));

  test('reads manifest and scene metadata', () => {
    expect(model.manifestId).toBe('https://example.org/iiif/basic.json');
    expect(model.label).toBe('Basic Scene');
    expect(model.sceneId).toBe(SCENE);
    expect(model.backgroundColor).toEqual({ r: 153, g: 204, b: 255 });
  });

  test('reads model with transforms in document order and target point', () => {
    expect(model.models).toEqual([
      {
        annotationId: `${SCENE}/anno/model`,
        url: 'https://example.org/models/pawn.glb',
        format: 'model/gltf-binary',
        transforms: [
          { kind: 'scale', value: { x: 2, y: 2, z: 2 } },
          { kind: 'rotate', value: { x: 0, y: 90, z: 0 } },
          { kind: 'translate', value: { x: 1, y: 0, z: 0 } },
        ],
        position: { x: 0, y: 1, z: 0 },
      },
    ]);
  });

  test('reads perspective camera with lookAt reference', () => {
    expect(model.cameras).toHaveLength(1);
    const camera = model.cameras[0];
    expect(camera.projection).toBe('perspective');
    expect(camera.fieldOfView).toBe(50);
    expect(camera.position).toEqual({ x: 0, y: 6, z: 10 });
    expect(camera.lookAtAnnotationId).toBe(`${SCENE}/anno/model`);
    expect(camera.hidden).toBe(false);
  });

  test('reads ambient light with Value intensity', () => {
    expect(model.lights).toHaveLength(1);
    expect(model.lights[0].kind).toBe('ambient');
    expect(model.lights[0].intensity).toBe(0.6);
    expect(model.lights[0].color).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('reads TextualBody and legacy bodyValue comments in order', () => {
    expect(model.comments).toEqual([
      {
        annotationId: `${SCENE}/comment/1`,
        title: 'Base',
        description: 'Base of the pawn.',
        point: { x: 0.5, y: 0.25, z: 0 },
        cameraAnnotationId: `${SCENE}/anno/camera`,
      },
      {
        annotationId: `${SCENE}/comment/legacy`,
        title: 'Legacy comment',
        description: '',
        point: { x: 1, y: 2, z: 3 },
        cameraAnnotationId: undefined,
      },
    ]);
  });

  test('collects warnings instead of failing', () => {
    expect(model.warnings.some(w => w.includes('Unsupported body type "sound"'))).toBe(true);
    expect(model.warnings.some(w => w.includes('comment/nopoint'))).toBe(true);
  });
});

describe('parseManifest – errors', () => {
  test('invalid JSON string', () => {
    expect(() => parseManifest('{')).toThrow(IIIFParseError);
  });

  test('not a manifest', () => {
    expect(() => parseManifest({ type: 'Collection' })).toThrow('Not a IIIF Manifest');
  });

  test('manifest without scene', () => {
    expect(() =>
      parseManifest({ id: 'x', type: 'Manifest', label: { en: ['x'] }, items: [] }),
    ).toThrow('No Scene found in IIIF Manifest');
  });

  test('marks hidden cameras and orthographic projection', () => {
    const model = parseManifest({
      id: 'm',
      type: 'Manifest',
      label: { none: ['m'] },
      items: [
        {
          id: 's',
          type: 'Scene',
          items: [
            {
              id: 'p',
              type: 'AnnotationPage',
              items: [
                {
                  id: 'c',
                  type: 'Annotation',
                  motivation: ['painting'],
                  behavior: ['hidden'],
                  body: { type: 'OrthographicCamera', lookAt: { type: 'PointSelector', x: 1, y: 2, z: 3 } },
                  target: { id: 's', type: 'Scene' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(model.cameras[0]).toMatchObject({
      projection: 'orthographic',
      hidden: true,
      lookAtPoint: { x: 1, y: 2, z: 3 },
    });
  });
});

const DEMO_DIR = join(import.meta.dir, '..', '..', '..', 'demos', 'iiif-3d');
const demoFiles = existsSync(DEMO_DIR) ? [...new Glob('**/*.json').scanSync(DEMO_DIR)] : [];

/** Upstream demo files that are empty or not strict JSON (e.g. comments) are skipped, not parsed. */
const loadDemo = (file: string): { json?: unknown; error?: string } => {
  try {
    return { json: JSON.parse(readFileSync(join(DEMO_DIR, file), 'utf8')) };
  } catch (error) {
    return { error: (error as Error).message };
  }
};

if (demoFiles.length === 0) {
  test.skip('demo manifests (submodule demos/iiif-3d not initialized)', () => {});
} else {
  describe('parseManifest – demo manifests', () => {
    for (const file of demoFiles) {
      const { json, error } = loadDemo(file);
      if (error !== undefined) {
        test.skip(`${file} (not valid JSON: ${error})`, () => {});
        continue;
      }
      test(file, () => {
        const items: any[] = Array.isArray((json as any)?.items) ? (json as any).items : [];
        if ((json as any)?.type !== 'Manifest' || !items.some(item => item?.type === 'Scene')) return;
        expect(() => parseManifest(json)).not.toThrow();
      });
    }
  });
}
