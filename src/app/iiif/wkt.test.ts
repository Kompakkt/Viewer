import { describe, expect, test } from 'bun:test';
import { parseManifest } from './parser';
import { wktAnchorPoint } from './wkt';

describe('wktAnchorPoint', () => {
  test('POINT Z is the point itself', () => {
    expect(wktAnchorPoint('POINT Z (1 2 3)')).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('POLYGON Z: centre of the vertices, ignoring the closing vertex', () => {
    const p = wktAnchorPoint('POLYGON Z ((0 0 0, 2 0 0, 2 2 0, 0 2 0, 0 0 0))')!;
    expect(p.x).toBeCloseTo(1);
    expect(p.y).toBeCloseTo(1);
    expect(p.z).toBeCloseTo(0);
  });

  test('upstream foramen magnum outline (open ring)', () => {
    const p = wktAnchorPoint(
      'POLYGON Z ((0 0.18 -0.23, -0.03 0.16 -0.23, -0.015 0.12 -0.23, 0.006 0.12 -0.23, 0.027 0.16 -0.230))',
    )!;
    expect(p.x).toBeCloseTo(-0.0024);
    expect(p.y).toBeCloseTo(0.148);
    expect(p.z).toBeCloseTo(-0.23);
  });

  test('LINESTRING Z, MULTIPOINT Z and the PolygonZSelector form are read', () => {
    expect(wktAnchorPoint('LINESTRING Z (0 0 0, 2 2 2)')).toEqual({ x: 1, y: 1, z: 1 });
    expect(wktAnchorPoint('MULTIPOINT Z ((0 0 0), (0 0 4))')).toEqual({ x: 0, y: 0, z: 2 });
    expect(wktAnchorPoint('POLYGONZ((0 0 0, 0 2 0, 2 2 0, 2 0 0))')).toEqual({ x: 1, y: 1, z: 0 });
  });

  test('ZM uses x, y and z', () => {
    expect(wktAnchorPoint('POINT ZM (1 2 3 9)')).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('2D, measured-only, empty and invalid geometries have no anchor point', () => {
    expect(wktAnchorPoint('POLYGON ((0 0, 1 0, 1 1, 0 0))')).toBeUndefined();
    expect(wktAnchorPoint('POINT M (1 2 3)')).toBeUndefined();
    expect(wktAnchorPoint('POLYGON Z EMPTY')).toBeUndefined();
    expect(wktAnchorPoint('POINT Z (1 a 3)')).toBeUndefined();
    expect(wktAnchorPoint('nonsense')).toBeUndefined();
  });
});

describe('parseManifest – comments with a shape selector', () => {
  const SCENE_ID = 'https://example.org/s';
  const manifest = (selector: unknown[]) => ({
    id: 'https://example.org/m',
    type: 'Manifest',
    items: [
      {
        id: SCENE_ID,
        type: 'Scene',
        items: [],
        annotations: [
          {
            id: 'https://example.org/p2',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.org/anno/comment',
                type: 'Annotation',
                motivation: ['commenting'],
                body: { type: 'TextualBody', value: 'Foramen magnum' },
                target: {
                  type: 'SpecificResource',
                  source: { id: SCENE_ID, type: 'Scene' },
                  selector,
                },
              },
            ],
          },
        ],
      },
    ],
  });

  test('a WktSelector comment is anchored at the centre of its shape, with a warning', () => {
    const model = parseManifest(
      manifest([{ type: 'WktSelector', value: 'POLYGON Z ((0 0 0, 2 0 0, 2 2 0, 0 2 0, 0 0 0))' }]),
    );
    expect(model.comments).toHaveLength(1);
    expect(model.comments[0].point).toEqual({ x: 1, y: 1, z: 0 });
    expect(model.warnings).toEqual([
      'Comment https://example.org/anno/comment: the WktSelector shape is shown as a point at its centre',
    ]);
  });

  test('a PolygonZSelector comment is anchored the same way', () => {
    const model = parseManifest(
      manifest([{ type: 'PolygonZSelector', value: 'POLYGONZ((0 0 0, 0 2 0, 2 2 0, 2 0 0))' }]),
    );
    expect(model.comments[0].point).toEqual({ x: 1, y: 1, z: 0 });
  });

  test('a PointSelector wins over a shape selector, without a warning', () => {
    const model = parseManifest(
      manifest([
        { type: 'WktSelector', value: 'POINT Z (5 5 5)' },
        { type: 'PointSelector', x: 1, y: 2, z: 3 },
      ]),
    );
    expect(model.comments[0].point).toEqual({ x: 1, y: 2, z: 3 });
    expect(model.warnings).toEqual([]);
  });

  test('an unusable WktSelector still skips the comment', () => {
    const model = parseManifest(
      manifest([{ type: 'WktSelector', value: 'POLYGON ((0 0, 1 0, 1 1, 0 0))' }]),
    );
    expect(model.comments).toHaveLength(0);
    expect(model.warnings.some(w => w.includes('has no usable selector and was skipped'))).toBe(
      true,
    );
  });
});
