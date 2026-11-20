import { describe, expect, test } from 'bun:test';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { pointToBabylon, pointToIIIF, rotationToIIIF, type Vec3 } from './coordinates';
import type { IIIFTransform } from './model';
import {
  composeIIIFTransforms,
  effectiveModelTransform,
  iiifRotationToQuaternion,
  modelTransformToIIIFTransforms,
  nodeMatrix,
  quaternionToIIIFRotation,
  rotateDirection,
} from './placement';

const DEG = Math.PI / 180;

const closeTo = (actual: Vec3, expected: Vec3, digits = 6) => {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
};

/** Right-handed reference rotations (column vectors, counter-clockwise) in IIIF space. */
const rotX = (a: number, p: Vec3): Vec3 => ({
  x: p.x,
  y: Math.cos(a) * p.y - Math.sin(a) * p.z,
  z: Math.sin(a) * p.y + Math.cos(a) * p.z,
});
const rotY = (a: number, p: Vec3): Vec3 => ({
  x: Math.cos(a) * p.x + Math.sin(a) * p.z,
  y: p.y,
  z: -Math.sin(a) * p.x + Math.cos(a) * p.z,
});
const rotZ = (a: number, p: Vec3): Vec3 => ({
  x: Math.cos(a) * p.x - Math.sin(a) * p.y,
  y: Math.sin(a) * p.x + Math.cos(a) * p.y,
  z: p.z,
});
/** IIIF RotateTransform reference: x first, then y, then z, about fixed axes. */
const iiifRotate = (deg: Vec3, p: Vec3) => rotZ(deg.z * DEG, rotY(deg.y * DEG, rotX(deg.x * DEG, p)));

/** Applies a Babylon-space quaternion to an IIIF-space point and converts the result back. */
const rotateIIIFPointWithBabylon = (q: Quaternion, p: Vec3): Vec3 => {
  const b = pointToBabylon(p);
  const r = new Vector3(b.x, b.y, b.z).applyRotationQuaternion(q);
  return pointToIIIF({ x: r.x, y: r.y, z: r.z });
};

const toVec = (v: Vector3): Vec3 => ({ x: v.x, y: v.y, z: v.z });
const transformPoint = (m: Matrix, p: Vec3) => toVec(Vector3.TransformCoordinates(new Vector3(p.x, p.y, p.z), m));

const TEST_VECTORS: Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0.3, y: -1.2, z: 2.5 },
];

describe('IIIF RotateTransform order (x → y → z, fixed axes)', () => {
  test('multi-axis rotation matches the x-then-y-then-z reference', () => {
    const deg = { x: 10, y: 45, z: -30 };
    const q = iiifRotationToQuaternion(deg);
    for (const v of TEST_VECTORS) closeTo(rotateIIIFPointWithBabylon(q, v), iiifRotate(deg, v));
  });

  test('matches Kompakkt rotation (X, then Y, then Z in Babylon space)', () => {
    const babylonDeg = { x: 10, y: 45, z: -30 };
    const kompakkt = Quaternion.RotationAxis(new Vector3(0, 0, 1), babylonDeg.z * DEG)
      .multiply(Quaternion.RotationAxis(new Vector3(0, 1, 0), babylonDeg.y * DEG))
      .multiply(Quaternion.RotationAxis(new Vector3(1, 0, 0), babylonDeg.x * DEG));
    const q = iiifRotationToQuaternion(rotationToIIIF(babylonDeg));
    for (const v of TEST_VECTORS) {
      const a = new Vector3(v.x, v.y, v.z).applyRotationQuaternion(kompakkt);
      const b = new Vector3(v.x, v.y, v.z).applyRotationQuaternion(q);
      closeTo(toVec(b), toVec(a));
    }
    // reviewer's numbers: (1,0,0) → (0.612, -0.354, -0.707) in Kompakkt
    closeTo(toVec(new Vector3(1, 0, 0).applyRotationQuaternion(q)), { x: 0.612, y: -0.354, z: -0.707 }, 3);
  });

  test('single-axis rotations behave as before (counter-clockwise in IIIF space)', () => {
    closeTo(rotateIIIFPointWithBabylon(iiifRotationToQuaternion({ x: 0, y: 90, z: 0 }), { x: 1, y: 0, z: 0 }), {
      x: 0,
      y: 0,
      z: -1,
    });
    closeTo(rotateIIIFPointWithBabylon(iiifRotationToQuaternion({ x: 0, y: 0, z: 90 }), { x: 1, y: 0, z: 0 }), {
      x: 0,
      y: 1,
      z: 0,
    });
    closeTo(rotateIIIFPointWithBabylon(iiifRotationToQuaternion({ x: 90, y: 0, z: 0 }), { x: 0, y: 1, z: 0 }), {
      x: 0,
      y: 0,
      z: 1,
    });
  });

  test('rotateDirection uses the same convention', () => {
    const deg = { x: 10, y: 45, z: -30 };
    const transforms: IIIFTransform[] = [{ kind: 'rotate', value: deg }];
    for (const v of TEST_VECTORS) {
      const b = pointToBabylon(v);
      const rotated = rotateDirection(new Vector3(b.x, b.y, b.z), transforms);
      const expected = iiifRotate(deg, v);
      const length = Math.hypot(expected.x, expected.y, expected.z);
      closeTo(pointToIIIF(toVec(rotated)), { x: expected.x / length, y: expected.y / length, z: expected.z / length });
    }
  });
});

describe('quaternionToIIIFRotation', () => {
  const cases: Vec3[] = [
    { x: 10, y: 45, z: -30 },
    { x: -120, y: 30, z: 170 },
    { x: 0, y: 90, z: 0 },
    { x: 25, y: -90, z: 40 },
    { x: 0, y: 0, z: 0 },
  ];
  for (const deg of cases) {
    test(`round trip for (${deg.x}, ${deg.y}, ${deg.z})`, () => {
      const back = quaternionToIIIFRotation(iiifRotationToQuaternion(deg));
      for (const v of TEST_VECTORS) closeTo(iiifRotate(back, v), iiifRotate(deg, v));
    });
  }

  test('keeps simple angles readable', () => {
    closeTo(quaternionToIIIFRotation(iiifRotationToQuaternion({ x: 10, y: 45, z: -30 })), { x: 10, y: 45, z: -30 });
  });
});

describe('composeIIIFTransforms', () => {
  test('applies scale, rotate and translate in order', () => {
    const transforms: IIIFTransform[] = [
      { kind: 'scale', value: { x: 2, y: 3, z: 0.5 } },
      { kind: 'rotate', value: { x: 10, y: 45, z: -30 } },
      { kind: 'translate', value: { x: 1, y: -2, z: 3 } },
    ];
    const m = nodeMatrix(composeIIIFTransforms(transforms));
    for (const v of TEST_VECTORS) {
      const scaled = { x: v.x * 2, y: v.y * 3, z: v.z * 0.5 };
      const r = iiifRotate({ x: 10, y: 45, z: -30 }, scaled);
      const expected = { x: r.x + 1, y: r.y - 2, z: r.z + 3 };
      closeTo(pointToIIIF(transformPoint(m, pointToBabylon(v))), expected);
    }
  });

  test('a rotation after a translation also rotates the position', () => {
    const transforms: IIIFTransform[] = [
      { kind: 'translate', value: { x: 1, y: 0, z: 0 } },
      { kind: 'rotate', value: { x: 0, y: 0, z: 90 } },
    ];
    const m = nodeMatrix(composeIIIFTransforms(transforms));
    closeTo(pointToIIIF(transformPoint(m, pointToBabylon({ x: 0, y: 0, z: 0 }))), { x: 0, y: 1, z: 0 });
  });
});

describe('effectiveModelTransform (Kompakkt placement → IIIF)', () => {
  /** The glTF loader's default __root__ matrix in a left-handed scene. */
  const gltfRoot = Matrix.Compose(new Vector3(1, 1, -1), new Quaternion(0, 1, 0, 0), Vector3.Zero());

  /** Mimics Kompakkt's center node: rotation/scale around the bounding-box center, min moved to the origin, then translate. */
  const kompakktCenter = (opts: { min: Vector3; max: Vector3; rotation: Vec3; scale: Vector3; translate: Vector3 }) => {
    const pivot = opts.min.add(opts.max).scale(0.5);
    const q = Quaternion.RotationAxis(new Vector3(0, 0, 1), opts.rotation.z * DEG)
      .multiply(Quaternion.RotationAxis(new Vector3(0, 1, 0), opts.rotation.y * DEG))
      .multiply(Quaternion.RotationAxis(new Vector3(1, 0, 0), opts.rotation.x * DEG));
    const position = opts.min.negate().add(opts.translate);
    return Matrix.Translation(-pivot.x, -pivot.y, -pivot.z)
      .multiply(Matrix.Compose(opts.scale, q, Vector3.Zero()))
      .multiply(Matrix.Translation(pivot.x, pivot.y, pivot.z))
      .multiply(Matrix.Translation(position.x, position.y, position.z));
  };

  const placements = [
    {
      name: 'uniform scale',
      min: new Vector3(-3, 1.5, 2),
      max: new Vector3(1, 4, 6),
      rotation: { x: 10, y: 45, z: -30 },
      scale: new Vector3(2.5, 2.5, 2.5),
      translate: new Vector3(0.5, -1, 2),
    },
    {
      name: 'non-uniform scale',
      min: new Vector3(4, -2, -7),
      max: new Vector3(9, 3, -1),
      rotation: { x: -70, y: 20, z: 135 },
      scale: new Vector3(0.5, 1.5, 3),
      translate: new Vector3(-2, 0, 1),
    },
  ];

  const LOCAL_POINTS = [new Vector3(0, 0, 0), new Vector3(1, 2, 3), new Vector3(-4, 0.5, 7), new Vector3(2, -3, -1)];

  for (const placement of placements) {
    test(`re-import reproduces the world placement (${placement.name})`, () => {
      const world = gltfRoot.multiply(kompakktCenter(placement));
      const { transform, warnings } = effectiveModelTransform(world, gltfRoot);
      expect(warnings).toEqual([]);

      // The importer: parse the IIIF transforms, compose them on a node, root world = L · N.
      const reimported = gltfRoot.multiply(nodeMatrix(composeIIIFTransforms(modelTransformToIIIFTransforms(transform))));
      for (const p of LOCAL_POINTS) {
        closeTo(transformPoint(reimported, toVec(p)), transformPoint(world, toVec(p)), 5);
      }
    });
  }

  test('float noise is rounded to 6 decimals and near-identity parts are left out', () => {
    expect(
      modelTransformToIIIFTransforms({
        scale: { x: 0.9999999, y: 1.0000001, z: 1 },
        rotation: { x: 1e-8, y: -2e-7, z: 0 },
        translation: { x: 0, y: 0.029999999, z: 0.050000001 },
      }),
    ).toEqual([{ kind: 'translate', value: { x: 0, y: 0.03, z: 0.05 } }]);
  });

  test('identity placement yields no transforms', () => {
    const { transform } = effectiveModelTransform(gltfRoot, gltfRoot);
    expect(modelTransformToIIIFTransforms(transform)).toEqual([]);
  });

  test('a plain translation becomes a single TranslateTransform in IIIF space', () => {
    const world = gltfRoot.multiply(Matrix.Translation(-1, 2, 3));
    const { transform } = effectiveModelTransform(world, gltfRoot);
    expect(modelTransformToIIIFTransforms(transform)).toEqual([{ kind: 'translate', value: { x: 1, y: 2, z: 3 } }]);
  });

  test('warns about shear', () => {
    const shear = Matrix.FromValues(1, 0.5, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    const { warnings } = effectiveModelTransform(gltfRoot.multiply(shear), gltfRoot);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('shear');
  });
});
