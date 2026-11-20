import { describe, expect, test } from 'bun:test';
import { applyIIIFTransforms, canvasCorners } from './canvas-placement';
import { parseManifest } from './parser';

const close = (actual: { x: number; y: number; z: number }, expected: [number, number, number]) => {
  expect(actual.x).toBeCloseTo(expected[0], 6);
  expect(actual.y).toBeCloseTo(expected[1], 6);
  expect(actual.z).toBeCloseTo(expected[2], 6);
};

describe('applyIIIFTransforms', () => {
  test('applies scale, rotate and translate in document order', () => {
    const p = applyIIIFTransforms({ x: 1, y: 0, z: 0 }, [
      { kind: 'scale', value: { x: 2, y: 1, z: 1 } },
      { kind: 'rotate', value: { x: 0, y: 90, z: 0 } },
      { kind: 'translate', value: { x: 0, y: 1, z: 0 } },
    ]);
    // Right-handed rotation of +x by 90° about +y points to -z.
    close(p, [0, 1, -2]);
  });

  test('rotates x first, then y, then z', () => {
    const p = applyIIIFTransforms({ x: 0, y: 1, z: 0 }, [
      { kind: 'rotate', value: { x: 90, y: 0, z: 90 } },
    ]);
    // x: +y → +z; z-rotation keeps +z.
    close(p, [0, 0, 1]);
  });
});

describe('canvasCorners', () => {
  test('top-left corner at the point, extending along +x and -y, in canvas units', () => {
    const corners = canvasCorners(2, 3, [], { x: 1, y: 5, z: -2 });
    close(corners[0], [1, 5, -2]); // top-left
    close(corners[1], [3, 5, -2]); // top-right
    close(corners[2], [3, 2, -2]); // bottom-right
    close(corners[3], [1, 2, -2]); // bottom-left
  });

  test('transforms are applied before the position (upstream "backward" example)', () => {
    const corners = canvasCorners(
      1,
      1,
      [
        { kind: 'scale', value: { x: 2.1687, y: 2.8273, z: 1 } },
        { kind: 'rotate', value: { x: 0, y: 180, z: 0 } },
      ],
      { x: 1.08435, y: 2.8273, z: -2 },
    );
    close(corners[0], [1.08435, 2.8273, -2]);
    close(corners[1], [-1.08435, 2.8273, -2]);
    close(corners[2], [-1.08435, 0, -2]);
    close(corners[3], [1.08435, 0, -2]);
  });

  test('without a position the canvas starts at the origin', () => {
    close(canvasCorners(1, 1, [], undefined)[0], [0, 0, 0]);
  });
});

describe('parseManifest – Canvas in Scene', () => {
  const SCENE_ID = 'https://example.org/s';
  const CANVAS_ID = 'https://example.org/canvas/1';
  const manifest = (
    target: unknown,
    bodyExtra: Record<string, unknown> = {},
    canvasExtra = {},
  ) => ({
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
                id: 'https://example.org/anno/canvas',
                type: 'Annotation',
                motivation: ['painting'],
                body: {
                  type: 'SpecificResource',
                  source: { id: CANVAS_ID, type: 'Canvas' },
                  ...bodyExtra,
                },
                target,
              },
            ],
          },
        ],
      },
      { id: CANVAS_ID, type: 'Canvas', width: 1, height: 1, items: [], ...canvasExtra },
    ],
  });

  test('PointSelector and ScaleTransform place the canvas by its corners', () => {
    const model = parseManifest(
      manifest(
        {
          type: 'SpecificResource',
          source: { id: SCENE_ID, type: 'Scene' },
          selector: [{ type: 'PointSelector', x: -1, y: 2, z: -2 }],
        },
        { transform: [{ type: 'ScaleTransform', x: 2, y: 2, z: 1 }] },
      ),
    );
    expect(model.warnings).toEqual([]);
    expect(model.canvases).toHaveLength(1);
    const corners = model.canvases[0].corners!;
    close(corners[0], [-1, 2, -2]);
    close(corners[2], [1, 0, -2]);
  });

  test('a canvas targeting the whole Scene is placed at the origin', () => {
    const model = parseManifest(manifest({ id: SCENE_ID, type: 'Scene' }));
    close(model.canvases[0].corners![2], [1, -1, 0]);
  });

  test('the PolygonZSelector form is still read', () => {
    const value = 'POLYGONZ((0 1 0, 1 1 0, 1 0 0, 0 0 0))';
    const model = parseManifest(
      manifest({
        type: 'SpecificResource',
        source: { id: SCENE_ID, type: 'Scene' },
        selector: [{ type: 'PolygonZSelector', value }],
      }),
    );
    expect(model.canvases[0].polygonZ).toBe(value);
    expect(model.canvases[0].corners).toBeUndefined();
  });

  test('a canvas without a usable size is skipped with a warning', () => {
    const model = parseManifest(manifest({ id: SCENE_ID, type: 'Scene' }, {}, { width: 0 }));
    expect(model.canvases).toHaveLength(0);
    expect(model.warnings.some(w => w.includes('no usable width and height'))).toBe(true);
  });
});
