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

describe('parseManifest – soft warnings for unsupported features', () => {
  const manifestWith = (annotations: unknown[]) => ({
    id: 'm',
    type: 'Manifest',
    label: { none: ['m'] },
    items: [
      {
        id: 's',
        type: 'Scene',
        items: [{ id: 'p', type: 'AnnotationPage', items: annotations }],
      },
    ],
  });

  test('warns on unknown target selector type on a painting annotation and keeps the model', () => {
    const model = parseManifest(
      manifestWith([
        {
          id: 'model',
          type: 'Annotation',
          motivation: ['painting'],
          body: { id: 'https://example.org/pawn.glb', type: 'Model' },
          target: {
            type: 'SpecificResource',
            source: { id: 's', type: 'Scene' },
            selector: [
              { type: 'PointSelector', x: 0, y: 1, z: 0 },
              { type: 'WktSelector', value: 'POINT(0 1)' },
            ],
          },
        },
      ]),
    );
    expect(model.models).toHaveLength(1);
    expect(model.warnings.some(w => w.includes('Unsupported selector type "WktSelector"'))).toBe(true);
  });

  test('parses a comment with a PointSelector and warns on an unknown FragmentSelector', () => {
    const model = parseManifest(
      manifestWith([
        {
          id: 'comment',
          type: 'Annotation',
          motivation: ['commenting'],
          body: { type: 'TextualBody', value: 'Hello', format: 'text/plain' },
          target: {
            type: 'SpecificResource',
            source: { id: 's', type: 'Scene' },
            selector: [
              { type: 'PointSelector', x: 1, y: 2, z: 3 },
              { type: 'FragmentSelector', value: 't=1,2' },
            ],
          },
        },
      ]),
    );
    expect(model.comments).toHaveLength(1);
    expect(model.comments[0].point).toEqual({ x: 1, y: 2, z: 3 });
    expect(model.warnings.some(w => w.includes('FragmentSelector'))).toBe(true);
  });

  test('warns on exclude for a commenting annotation', () => {
    const model = parseManifest(
      manifestWith([
        {
          id: 'comment',
          type: 'Annotation',
          motivation: ['commenting'],
          exclude: ['audio'],
          body: { type: 'TextualBody', value: 'Hello', format: 'text/plain' },
          target: {
            type: 'SpecificResource',
            source: { id: 's', type: 'Scene' },
            selector: [{ type: 'PointSelector', x: 1, y: 2, z: 3 }],
          },
        },
      ]),
    );
    expect(model.comments).toHaveLength(1);
    expect(model.warnings.some(w => w.includes('"exclude"'))).toBe(true);
  });

  test('still warns on exclude for a painting annotation', () => {
    const model = parseManifest(
      manifestWith([
        {
          id: 'light',
          type: 'Annotation',
          motivation: ['painting'],
          exclude: ['audio'],
          body: { type: 'AmbientLight', color: '#FFFFFF' },
          target: { id: 's', type: 'Scene' },
        },
      ]),
    );
    expect(model.lights).toHaveLength(1);
    expect(model.warnings.some(w => w.includes('"exclude"'))).toBe(true);
  });

  test('reads light intensity given as a Quantity', () => {
    const model = parseManifest(
      manifestWith([
        {
          id: 'light',
          type: 'Annotation',
          motivation: ['painting'],
          body: {
            type: 'AmbientLight',
            intensity: { type: 'Quantity', quantityValue: 0.5, unit: 'relative' },
          },
          target: { id: 's', type: 'Scene' },
        },
      ]),
    );
    expect(model.lights[0].intensity).toBe(0.5);
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

describe('parseManifest – comment camera scope', () => {
  const SCENE_ID = 'https://example.org/s';
  const camera = (extra: Record<string, unknown> = {}) => ({
    id: 'https://example.org/anno/cam',
    type: 'Annotation',
    motivation: ['painting'],
    behavior: ['hidden'],
    body: { id: 'https://example.org/cameras/1', type: 'PerspectiveCamera', lookAt: { type: 'PointSelector', x: 0, y: 0, z: 0 } },
    target: { type: 'SpecificResource', source: { id: SCENE_ID, type: 'Scene' }, selector: [{ type: 'PointSelector', x: 0, y: 1, z: 5 }] },
    ...extra,
  });
  const comment = (extra: Record<string, unknown> = {}, targetExtra: Record<string, unknown> = {}) => ({
    id: 'https://example.org/anno/comment',
    type: 'Annotation',
    motivation: ['commenting'],
    body: { type: 'TextualBody', value: 'Glove' },
    target: { type: 'SpecificResource', source: { id: SCENE_ID, type: 'Scene' }, selector: [{ type: 'PointSelector', x: 1, y: 2, z: 3 }], ...targetExtra },
    ...extra,
  });
  const manifest = (paintings: unknown[], comments: unknown[]) => ({
    id: 'https://example.org/m',
    type: 'Manifest',
    label: { none: ['m'] },
    items: [
      {
        id: SCENE_ID,
        type: 'Scene',
        items: [{ id: 'https://example.org/p1', type: 'AnnotationPage', items: paintings }],
        annotations: [{ id: 'https://example.org/p2', type: 'AnnotationPage', items: comments }],
      },
    ],
  });

  test('spec form: scope references the camera resource id', () => {
    const model = parseManifest(
      manifest([camera()], [comment({ scope: [{ id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' }] })]),
    );
    expect(model.cameras[0].resourceId).toBe('https://example.org/cameras/1');
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('scope on the target referencing the camera annotation id', () => {
    const model = parseManifest(
      manifest([camera()], [comment({}, { scope: [{ id: 'https://example.org/anno/cam', type: 'Annotation' }] })]),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('scope resolves even when the camera comes after the comment', () => {
    const model = parseManifest(
      manifest([], [comment({ scope: [{ id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' }] }), camera()]),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('demo form: embedded contentState annotation in target.scope adds a hidden camera', () => {
    const contentState = {
      id: 'https://example.org/anno/comment/scope1',
      type: 'Annotation',
      motivation: ['contentState'],
      target: {
        id: SCENE_ID,
        type: 'Scene',
        items: [
          {
            id: 'https://example.org/p3',
            type: 'AnnotationPage',
            items: [camera({ id: 'https://example.org/anno/embedded-cam', behavior: undefined })],
          },
        ],
      },
    };
    const model = parseManifest(manifest([], [comment({}, { scope: contentState })]));
    const linked = model.cameras.find(c => c.annotationId === 'https://example.org/anno/embedded-cam');
    expect(linked?.hidden).toBe(true);
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/embedded-cam');
  });

  const contentStateOf = (id: string, ...annotations: unknown[]) => ({
    id,
    type: 'Annotation',
    motivation: ['contentState'],
    target: {
      id: SCENE_ID,
      type: 'Scene',
      items: [{ id: `${id}/page`, type: 'AnnotationPage', items: annotations }],
    },
  });
  const modelPainting = {
    id: 'https://example.org/anno/embedded-model',
    type: 'Annotation',
    motivation: ['painting'],
    body: { id: 'https://example.org/m.glb', type: 'Model' },
    target: { id: SCENE_ID, type: 'Scene' },
  };

  test('embedded scope only contributes cameras, other resources are ignored with a warning', () => {
    const state = contentStateOf(
      'https://example.org/cs1',
      modelPainting,
      camera({ id: 'https://example.org/anno/embedded-cam', behavior: undefined }),
    );
    const model = parseManifest(manifest([], [comment({}, { scope: state })]));
    expect(model.models).toHaveLength(0);
    expect(model.lights).toHaveLength(0);
    expect(model.canvases).toHaveLength(0);
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/embedded-cam');
    expect(model.warnings.some(w => w.includes('scope contains a non-camera resource that was ignored'))).toBe(true);
  });

  test('embedded camera equal to a later top-level camera is not duplicated', () => {
    const state = contentStateOf('https://example.org/cs1', camera({ behavior: undefined }));
    const model = parseManifest(manifest([], [comment({}, { scope: state }), camera({ behavior: undefined })]));
    const matches = model.cameras.filter(c => c.annotationId === 'https://example.org/anno/cam');
    expect(matches).toHaveLength(1);
    expect(matches[0].hidden).toBe(false);
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('two comments sharing the same embedded camera produce one camera', () => {
    const state = () => contentStateOf('https://example.org/cs1', camera({ id: 'https://example.org/anno/shared', behavior: undefined }));
    const model = parseManifest(
      manifest([], [
        comment({ id: 'https://example.org/anno/c1' }, { scope: state() }),
        comment({ id: 'https://example.org/anno/c2' }, { scope: state() }),
      ]),
    );
    expect(model.cameras.filter(c => c.annotationId === 'https://example.org/anno/shared')).toHaveLength(1);
    expect(model.comments.map(c => c.cameraAnnotationId)).toEqual([
      'https://example.org/anno/shared',
      'https://example.org/anno/shared',
    ]);
  });

  test('multiple scope references to different cameras: first is used, warning added', () => {
    const second = camera({
      id: 'https://example.org/anno/cam2',
      body: { id: 'https://example.org/cameras/2', type: 'PerspectiveCamera' },
    });
    const model = parseManifest(
      manifest([camera(), second], [
        comment({
          scope: [
            { id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' },
            { id: 'https://example.org/cameras/2', type: 'PerspectiveCamera' },
          ],
        }),
      ]),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
    expect(model.warnings.some(w => w.includes('multiple scope references, using https://example.org/anno/cam'))).toBe(true);
  });

  test('embedded cameras of unused scope references are not added', () => {
    const model = parseManifest(
      manifest([camera()], [
        comment({
          scope: [
            { id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' },
            contentStateOf('https://example.org/cs1', camera({ id: 'https://example.org/anno/unused', behavior: undefined })),
          ],
        }),
      ]),
    );
    expect(model.cameras.map(c => c.annotationId)).toEqual(['https://example.org/anno/cam']);
  });

  test('bare string scope is resolved as an ID reference', () => {
    const model = parseManifest(manifest([camera()], [comment({ scope: ['https://example.org/cameras/1'] })]));
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('unusable scope entry adds a warning', () => {
    const model = parseManifest(manifest([camera()], [comment({ scope: [{ type: 'PerspectiveCamera' }] })]));
    expect(model.comments[0].cameraAnnotationId).toBeUndefined();
    expect(model.warnings.some(w => w.includes('unusable scope entry ignored'))).toBe(true);
  });

  test('unresolved scope adds a warning and leaves the camera undefined', () => {
    const model = parseManifest(
      manifest([], [comment({ scope: [{ id: 'https://example.org/cameras/missing', type: 'PerspectiveCamera' }] })]),
    );
    expect(model.comments[0].cameraAnnotationId).toBeUndefined();
    expect(model.warnings.some(w => w.includes('does not reference a known camera'))).toBe(true);
  });

  const activating = (
    targetId: string,
    sourceId: string,
    extra: Record<string, unknown> = {},
  ) => ({
    id: 'https://example.org/anno/activating',
    type: 'Annotation',
    motivation: ['activating'],
    target: { id: targetId, type: 'Annotation' },
    body: {
      id: 'https://example.org/anno/activating/body',
      type: 'SpecificResource',
      source: { id: sourceId, type: 'Annotation' },
      action: ['show', 'enable', 'select'],
    },
    ...extra,
  });

  test('activating annotation links a comment to a camera annotation', () => {
    const model = parseManifest(
      manifest(
        [camera()],
        [comment(), activating('https://example.org/anno/comment', 'https://example.org/anno/cam')],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
    expect(model.warnings).toEqual([]);
  });

  test('activating annotation may come before the comment and the camera', () => {
    const model = parseManifest(
      manifest(
        [],
        [activating('https://example.org/anno/comment', 'https://example.org/anno/cam'), comment(), camera()],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('activating body may reference the camera resource directly', () => {
    const model = parseManifest(
      manifest(
        [camera()],
        [
          comment(),
          activating('https://example.org/anno/comment', 'https://example.org/cameras/1', {
            body: { id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' },
          }),
        ],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam');
  });

  test('explicit scope wins over an activating annotation', () => {
    const other = camera({
      id: 'https://example.org/anno/cam2',
      body: { id: 'https://example.org/cameras/2', type: 'PerspectiveCamera' },
    });
    const model = parseManifest(
      manifest(
        [camera(), other],
        [
          comment({ scope: [{ id: 'https://example.org/cameras/2', type: 'PerspectiveCamera' }] }),
          activating('https://example.org/anno/comment', 'https://example.org/anno/cam'),
        ],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/cam2');
  });

  test('activating annotation targeting an unknown comment adds a warning', () => {
    const model = parseManifest(
      manifest(
        [camera()],
        [comment(), activating('https://example.org/anno/missing', 'https://example.org/anno/cam')],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBeUndefined();
    expect(model.warnings.some(w => w.includes('does not target a known comment'))).toBe(true);
    expect(model.warnings.some(w => w.includes('Unsupported body type'))).toBe(false);
  });

  test('activating annotation not referencing a camera adds a warning', () => {
    const model = parseManifest(
      manifest(
        [camera()],
        [comment(), activating('https://example.org/anno/comment', 'https://example.org/anno/model')],
      ),
    );
    expect(model.comments[0].cameraAnnotationId).toBeUndefined();
    expect(model.warnings.some(w => w.includes('does not reference a known camera'))).toBe(true);
  });
});

describe('parseManifest – annotations without id', () => {
  const SCENE_ID = 'https://example.org/s';
  const point = (x: number) => ({
    type: 'SpecificResource',
    source: { id: SCENE_ID, type: 'Scene' },
    selector: [{ type: 'PointSelector', x, y: 0, z: 0 }],
  });
  const comment = (text: string, x: number, extra: Record<string, unknown> = {}) => ({
    type: 'Annotation',
    motivation: ['commenting'],
    body: { type: 'TextualBody', value: text },
    target: point(x),
    ...extra,
  });
  const camera = {
    type: 'Annotation',
    motivation: ['painting'],
    body: { id: 'https://example.org/cameras/1', type: 'PerspectiveCamera' },
    target: point(5),
  };
  const model = (paintings: unknown[], comments: unknown[]) =>
    parseManifest({
      id: 'https://example.org/m',
      type: 'Manifest',
      label: { none: ['m'] },
      items: [
        {
          id: SCENE_ID,
          type: 'Scene',
          items: [{ id: 'https://example.org/p1', type: 'AnnotationPage', items: paintings }],
          annotations: [{ id: 'https://example.org/p2', type: 'AnnotationPage', items: comments }],
        },
      ],
    });

  test('two comments without id get distinct, stable fallback ids', () => {
    const parsed = model([], [comment('A', 1), comment('B', 2)]);
    const ids = parsed.comments.map(c => c.annotationId);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every(id => id.startsWith(`${SCENE_ID}#annotation-`))).toBe(true);
    expect(ids).not.toContain('undefined');
    expect(model([], [comment('A', 1), comment('B', 2)]).comments.map(c => c.annotationId)).toEqual(ids);
    expect(parsed.warnings.filter(w => w.includes('no id'))).toHaveLength(2);
  });

  test('cameras without id get fallback ids, and comments still resolve them by resource id', () => {
    const parsed = model(
      [camera, { ...camera, body: { ...camera.body, id: 'https://example.org/cameras/2' } }],
      [comment('A', 1, { scope: [{ id: 'https://example.org/cameras/2', type: 'PerspectiveCamera' }] })],
    );
    const ids = parsed.cameras.map(c => c.annotationId);
    expect(new Set(ids).size).toBe(2);
    expect(ids).not.toContain('undefined');
    expect(parsed.comments[0].cameraAnnotationId).toBe(ids[1]);
  });
});

describe('parseManifest – Choice of cameras', () => {
  const SCENE_ID = 'https://example.org/s';
  const cam = (id: string, type: string, extra: Record<string, unknown> = {}) => ({
    id,
    type,
    label: { en: [id.split('/').pop()] },
    lookAt: { type: 'PointSelector', x: 2, y: 1, z: 0 },
    ...extra,
  });
  const manifest = (body: unknown) => ({
    id: 'https://example.org/m',
    type: 'Manifest',
    items: [
      {
        id: SCENE_ID,
        type: 'Scene',
        items: [
          {
            id: 'https://example.org/p1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.org/anno/choice',
                type: 'Annotation',
                motivation: ['painting'],
                body,
                target: {
                  type: 'SpecificResource',
                  source: { id: SCENE_ID, type: 'Scene' },
                  selector: { type: 'PointSelector', x: 0, y: 3, z: -10 },
                },
              },
            ],
          },
        ],
      },
    ],
  });

  test('the first item is the default camera, the others are hidden alternatives', () => {
    const model = parseManifest(
      manifest({
        id: 'https://example.org/choice',
        type: 'Choice',
        items: [
          cam('https://example.org/cameras/ortho', 'OrthographicCamera'),
          cam('https://example.org/cameras/persp', 'PerspectiveCamera', { fieldOfView: 50 }),
        ],
      }),
    );
    expect(model.warnings).toEqual([]);
    expect(model.cameras).toHaveLength(2);
    const [first, second] = model.cameras;
    expect(first.annotationId).toBe('https://example.org/anno/choice');
    expect(first.projection).toBe('orthographic');
    expect(first.hidden).toBe(false);
    expect(first.choiceGroup).toBe('https://example.org/anno/choice');
    expect(second.annotationId).toBe('https://example.org/anno/choice#choice-2');
    expect(second.projection).toBe('perspective');
    expect(second.fieldOfView).toBe(50);
    expect(second.hidden).toBe(true);
    expect(second.choiceGroup).toBe('https://example.org/anno/choice');
    // Both share the annotation's position.
    expect(second.position).toEqual({ x: 0, y: 3, z: -10 });
  });

  test('a scope reference to an alternative camera resource resolves to it', () => {
    const json = manifest({
      type: 'Choice',
      items: [
        cam('https://example.org/cameras/ortho', 'OrthographicCamera'),
        cam('https://example.org/cameras/persp', 'PerspectiveCamera'),
      ],
    });
    (json.items[0] as any).annotations = [
      {
        id: 'https://example.org/p2',
        type: 'AnnotationPage',
        items: [
          {
            id: 'https://example.org/anno/comment',
            type: 'Annotation',
            motivation: ['commenting'],
            body: { type: 'TextualBody', value: 'Glove' },
            target: {
              type: 'SpecificResource',
              source: { id: SCENE_ID, type: 'Scene' },
              selector: [{ type: 'PointSelector', x: 1, y: 2, z: 3 }],
            },
            scope: [{ id: 'https://example.org/cameras/persp', type: 'PerspectiveCamera' }],
          },
        ],
      },
    ];
    const model = parseManifest(json);
    expect(model.comments[0].cameraAnnotationId).toBe('https://example.org/anno/choice#choice-2');
  });

  test('non-camera alternatives are ignored with a warning, the first item is used', () => {
    const model = parseManifest(
      manifest({
        type: 'Choice',
        items: [
          { id: 'https://example.org/a.glb', type: 'Model' },
          { id: 'https://example.org/b.glb', type: 'Model' },
        ],
      }),
    );
    expect(model.models.map(m => m.url)).toEqual(['https://example.org/a.glb']);
    expect(model.warnings.some(w => w.includes('only the first item of the Choice is used'))).toBe(true);
  });

  test('OrthographicCamera viewHeight is read', () => {
    const model = parseManifest(
      manifest(cam('https://example.org/cameras/ortho', 'OrthographicCamera', { viewHeight: 4 })),
    );
    expect(model.cameras[0].viewHeight).toBe(4);
  });

  test('an empty Choice adds a warning', () => {
    const model = parseManifest(manifest({ type: 'Choice', items: [] }));
    expect(model.cameras).toHaveLength(0);
    expect(model.warnings.some(w => w.includes('empty Choice'))).toBe(true);
  });
});
