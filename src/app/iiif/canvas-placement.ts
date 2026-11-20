/**
 * Placement of a 2D Canvas painted into a 3D Scene, in IIIF space (Babylon-free).
 *
 * Without a PolygonZSelector, a Canvas lies in the XY plane with its top-left corner at the
 * origin, extending along +x (width) and -y (height); one Canvas unit is one Scene unit.
 * The body's transforms are applied in document order, then the corner is moved to the
 * target's PointSelector.
 */
import type { Vec3 } from './coordinates';
import type { IIIFTransform } from './model';

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Right-handed rotation about x, then y, then z (IIIF RotateTransform). */
const rotate = (p: Vec3, degrees: Vec3): Vec3 => {
  let { x, y, z } = p;
  const [cx, sx] = [Math.cos(toRadians(degrees.x)), Math.sin(toRadians(degrees.x))];
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  const [cy, sy] = [Math.cos(toRadians(degrees.y)), Math.sin(toRadians(degrees.y))];
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  const [cz, sz] = [Math.cos(toRadians(degrees.z)), Math.sin(toRadians(degrees.z))];
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  return { x, y, z };
};

/** Applies IIIF transforms to a point, in document order. */
export const applyIIIFTransforms = (point: Vec3, transforms: IIIFTransform[]): Vec3 =>
  transforms.reduce((p, { kind, value }) => {
    if (kind === 'scale') return { x: p.x * value.x, y: p.y * value.y, z: p.z * value.z };
    if (kind === 'rotate') return rotate(p, value);
    return { x: p.x + value.x, y: p.y + value.y, z: p.z + value.z };
  }, point);

/** Corners of the Canvas in Scene space: top-left, top-right, bottom-right, bottom-left. */
export const canvasCorners = (
  width: number,
  height: number,
  transforms: IIIFTransform[],
  position: Vec3 | undefined,
): Vec3[] => {
  const offset = position ?? { x: 0, y: 0, z: 0 };
  return [
    { x: 0, y: 0, z: 0 },
    { x: width, y: 0, z: 0 },
    { x: width, y: -height, z: 0 },
    { x: 0, y: -height, z: 0 },
  ].map(corner => {
    const p = applyIIIFTransforms(corner, transforms);
    return { x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z };
  });
};
