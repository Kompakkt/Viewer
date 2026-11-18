/**
 * The single place for converting between IIIF (right-handed, +y up, +z forward)
 * and Babylon.js (left-handed). Mirrors on the X axis.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Kompakkt stores cameras as ArcRotate values: x = alpha, y = beta, z = radius. */
export interface ArcRotate {
  alpha: number;
  beta: number;
  radius: number;
}

const negate = (value: number) => (value === 0 ? 0 : -value);

export const pointToBabylon = (p: Vec3): Vec3 => ({ x: negate(p.x), y: p.y, z: p.z });
export const pointToIIIF = (p: Vec3): Vec3 => ({ x: negate(p.x), y: p.y, z: p.z });

/** Rotations in degrees. Mirroring on X keeps X; Y and Z change sign. */
export const rotationToBabylon = (deg: Vec3): Vec3 => ({ x: deg.x, y: negate(deg.y), z: negate(deg.z) });
export const rotationToIIIF = (deg: Vec3): Vec3 => ({ x: deg.x, y: negate(deg.y), z: negate(deg.z) });

/** Accepts IVector3, Babylon vectors ({_x,_y,_z}) and undefined. */
export const toVec3 = (value: unknown): Vec3 => {
  const record = (value ?? {}) as Record<string, unknown>;
  const pick = (key: 'x' | 'y' | 'z') => Number(record[key] ?? record[`_${key}`] ?? 0);
  return { x: pick('x'), y: pick('y'), z: pick('z') };
};

/** Same formula as Babylon's ArcRotateCamera (in Babylon space). */
export const arcRotateToCartesian = ({ alpha, beta, radius }: ArcRotate, target: Vec3): Vec3 => ({
  x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
  y: target.y + radius * Math.cos(beta),
  z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
});

/** Inverse of arcRotateToCartesian; alpha ends up in (-π, π]. */
export const cartesianToArcRotate = (position: Vec3, target: Vec3): ArcRotate => {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const radius = Math.hypot(dx, dy, dz);
  if (radius === 0) return { alpha: 0, beta: 0, radius: 0 };
  return {
    alpha: Math.atan2(dz, dx),
    beta: Math.acos(Math.min(1, Math.max(-1, dy / radius))),
    radius,
  };
};
