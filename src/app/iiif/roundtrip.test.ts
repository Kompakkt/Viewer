import { describe, expect, test } from 'bun:test';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { commentToAnnotation, perspectiveFromCamera } from './comments';
import { composeIIIFTransforms, effectiveModelTransform, nodeMatrix } from './placement';
import { makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest } from './exporter';
import { parseManifest } from './parser';

const closeTo = (actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }) => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.z).toBeCloseTo(expected.z);
};

describe('round trip: exportManifest → parseManifest', () => {
  // A model displayed by Kompakkt: glTF __root__ (loader matrix L) below an auto-placed center node.
  const loaderLocal = Matrix.Compose(new Vector3(1, 1, -1), new Quaternion(0, 1, 0, 0), Vector3.Zero());
  const center = Matrix.Translation(-1, -2, -3)
    .multiply(Matrix.Compose(new Vector3(2, 2, 2), Quaternion.FromEulerAngles(0.3, -1.1, 0.7), Vector3.Zero()))
    .multiply(Matrix.Translation(4, 0.5, -2));
  const world = loaderLocal.multiply(center);
  const { transform: modelTransform } = effectiveModelTransform(world, loaderLocal);

  const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 45, z: -30 }, translate: { x: 1, y: 2, z: 3 } });
  const input = makeInput({ settings, modelTransform });
  const model = parseManifest(JSON.parse(JSON.stringify(exportManifest(input).manifest)));

  test('model, placement and background survive', () => {
    expect(model.label).toBe('Pawn');
    expect(model.models[0].url).toBe(input.modelUrl);
    expect(model.backgroundColor).toEqual({ r: 153, g: 204, b: 255 });
    const reimported = loaderLocal.multiply(nodeMatrix(composeIIIFTransforms(model.models[0].transforms)));
    for (const p of [new Vector3(0, 0, 0), new Vector3(1, 2, 3), new Vector3(-5, 0.5, 2)]) {
      closeTo(Vector3.TransformCoordinates(p, reimported), Vector3.TransformCoordinates(p, world));
    }
  });

  test('initial camera survives', () => {
    const camera = model.cameras.find(c => !c.hidden)!;
    const perspective = perspectiveFromCamera(camera, { x: 0, y: 0, z: 0 })!;
    closeTo(perspective.position as any, settings.cameraPositionInitial.position);
    closeTo(perspective.target as any, settings.cameraPositionInitial.target);
  });

  test('comments survive with order, text, point and perspective', () => {
    const sorted = [...input.annotations].sort((a, b) => a.ranking - b.ranking);
    expect(model.comments).toHaveLength(sorted.length);

    model.comments.forEach((comment, index) => {
      const original = sorted[index];
      const camera = model.cameras.find(c => c.annotationId === comment.cameraAnnotationId)!;
      expect(camera.hidden).toBe(true);
      const perspective = perspectiveFromCamera(camera, comment.point)!;
      const annotation = commentToAnnotation(comment, index + 1, perspective, { x: 0, y: 1, z: 0 });

      expect(annotation.ranking).toBe(original.ranking);
      expect(annotation.body.content.title).toBe(original.body.content.title);
      expect(annotation.body.content.description).toBe(original.body.content.description);
      closeTo(annotation.target.selector.referencePoint as any, original.target.selector.referencePoint as any);
      closeTo(perspective.position as any, original.body.content.relatedPerspective.position as any);
      closeTo(perspective.target as any, original.body.content.relatedPerspective.target as any);
    });
  });
});

describe('round trip: several models', () => {
  test('every model keeps its url and placement', () => {
    const transforms = [
      { scale: { x: 1, y: 1, z: 1 }, rotation: { x: 0, y: 0, z: 0 }, translation: { x: 0, y: 0.03, z: 0.05 } },
      { scale: { x: 2, y: 2, z: 2 }, rotation: { x: 10, y: 20, z: 30 }, translation: { x: 0, y: 0.18, z: 0 } },
    ];
    const input = makeInput({
      modelUrl: undefined,
      modelTransform: undefined,
      models: [
        { url: 'https://example.org/a.glb', transform: transforms[0] },
        { url: 'https://example.org/b.glb', transform: transforms[1] },
      ],
    });
    const model = parseManifest(JSON.parse(JSON.stringify(exportManifest(input).manifest)));
    expect(model.models.map(m => m.url)).toEqual(['https://example.org/a.glb', 'https://example.org/b.glb']);
    model.models.forEach((m, i) => {
      const composed = composeIIIFTransforms(m.transforms);
      const expected = composeIIIFTransforms([
        ...(i === 1 ? [{ kind: 'scale' as const, value: transforms[1].scale }] : []),
        ...(i === 1 ? [{ kind: 'rotate' as const, value: transforms[1].rotation }] : []),
        { kind: 'translate', value: transforms[i].translation },
      ]);
      for (const p of [new Vector3(0, 0, 0), new Vector3(1, 2, 3)]) {
        closeTo(
          Vector3.TransformCoordinates(p, nodeMatrix(composed)),
          Vector3.TransformCoordinates(p, nodeMatrix(expected)),
        );
      }
    });
  });
});

describe('round trip: Canvases and an OrthographicCamera', () => {
  const canvas = { id: 'https://example.org/canvas/1', type: 'Canvas', width: 400, height: 300, items: [] };
  const transforms = [
    { kind: 'scale' as const, value: { x: 0.01, y: 0.01, z: 1 } },
    { kind: 'rotate' as const, value: { x: 0, y: 45, z: 0 } },
  ];
  const position = { x: -2, y: 3, z: 0.5 };
  const original = parseManifest({
    id: 'https://example.org/m',
    type: 'Manifest',
    label: { none: ['m'] },
    items: [
      {
        id: 'https://example.org/scene',
        type: 'Scene',
        items: [
          {
            id: 'https://example.org/page',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.org/anno/canvas',
                type: 'Annotation',
                motivation: ['painting'],
                body: {
                  type: 'SpecificResource',
                  source: { id: canvas.id, type: 'Canvas' },
                  transform: [
                    { type: 'ScaleTransform', x: 0.01, y: 0.01, z: 1 },
                    { type: 'RotateTransform', x: 0, y: 45, z: 0 },
                  ],
                },
                target: {
                  type: 'SpecificResource',
                  source: { id: 'https://example.org/scene', type: 'Scene' },
                  selector: [{ type: 'PointSelector', ...position }],
                },
              },
            ],
          },
        ],
      },
      canvas,
    ],
  });
  const input = makeInput({
    modelUrl: undefined,
    modelTransform: undefined,
    models: [],
    canvases: original.canvases,
    camera: {
      projection: 'orthographic',
      position: { x: 0, y: 1, z: 5 },
      target: { x: 0, y: 1, z: 0 },
      viewHeight: 2.5,
    },
  });
  const model = parseManifest(JSON.parse(JSON.stringify(exportManifest(input).manifest)));

  test('the parsed Canvas keeps its transforms and position', () => {
    expect(original.canvases[0].transforms).toEqual(transforms);
    expect(original.canvases[0].position).toEqual(position);
  });

  test('the Canvas keeps its corners', () => {
    expect(model.canvases).toHaveLength(1);
    expect(model.canvases[0].canvas).toEqual(canvas);
    model.canvases[0].corners!.forEach((corner, i) => closeTo(corner, original.canvases[0].corners![i]));
  });

  test('the OrthographicCamera keeps projection, view height and placement', () => {
    const camera = model.cameras.find(c => !c.hidden)!;
    expect(camera.projection).toBe('orthographic');
    expect(camera.viewHeight).toBe(2.5);
    expect(camera.position).toEqual({ x: 0, y: 1, z: 5 });
    expect(camera.lookAtPoint).toEqual({ x: 0, y: 1, z: 0 });
  });
});
