import { describe, expect, test } from 'bun:test';
import {
  arcRotateToCartesian,
  cartesianToArcRotate,
  pointToBabylon,
  pointToIIIF,
  rotationToBabylon,
  rotationToIIIF,
  toVec3,
} from './coordinates';

describe('coordinates', () => {
  test('points flip the x axis', () => {
    expect(pointToBabylon({ x: 1, y: 2, z: 3 })).toEqual({ x: -1, y: 2, z: 3 });
    expect(pointToIIIF({ x: -1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('zero stays positive zero', () => {
    expect(Object.is(pointToBabylon({ x: 0, y: 0, z: 0 }).x, 0)).toBe(true);
  });

  test('rotations keep x and negate y and z', () => {
    expect(rotationToBabylon({ x: 10, y: 20, z: 30 })).toEqual({ x: 10, y: -20, z: -30 });
    expect(rotationToIIIF(rotationToBabylon({ x: 10, y: 20, z: 30 }))).toEqual({ x: 10, y: 20, z: 30 });
  });

  test('toVec3 accepts plain and underscore vectors', () => {
    expect(toVec3({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: 3 });
    expect(toVec3({ _x: 4, _y: 5, _z: 6 })).toEqual({ x: 4, y: 5, z: 6 });
    expect(toVec3(undefined)).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('arcRotateToCartesian matches Babylon ArcRotateCamera', () => {
    const p = arcRotateToCartesian({ alpha: Math.PI / 2, beta: Math.PI / 2, radius: 10 }, { x: 0, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(10);
  });

  test('cartesianToArcRotate inverts arcRotateToCartesian', () => {
    const target = { x: 1, y: 2, z: 3 };
    const arc = { alpha: 0.7, beta: 1.1, radius: 5 };
    const back = cartesianToArcRotate(arcRotateToCartesian(arc, target), target);
    expect(back.alpha).toBeCloseTo(arc.alpha);
    expect(back.beta).toBeCloseTo(arc.beta);
    expect(back.radius).toBeCloseTo(arc.radius);
  });

  test('cartesianToArcRotate handles zero distance', () => {
    expect(cartesianToArcRotate({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })).toEqual({ alpha: 0, beta: 0, radius: 0 });
  });
});
