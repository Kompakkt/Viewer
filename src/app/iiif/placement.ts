/**
 * Model placement math shared by the IIIF importer (scene-builder) and the exporter side.
 * Pure: only Babylon's math classes, no scene or engine.
 *
 * Conventions
 * - IIIF RotateTransform: Euler angles in degrees, applied x first, then y, then z about the
 *   fixed axes of the (right-handed) local coordinate space, pivot at its origin. After the
 *   X-mirror conversion to Babylon (see coordinates.ts) the mirrored angles keep that order.
 * - Babylon matrices use row vectors: `a.multiply(b)` applies `a` first, then `b`.
 *   A child's world matrix is `local.multiply(parentWorld)`.
 */
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { pointToBabylon, pointToIIIF, rotationToBabylon, type Vec3 } from './coordinates';
import type { IIIFTransform } from './model';

/** Effective model placement in IIIF space, applied as Scale → Rotate → Translate. */
export interface IIIFModelTransform {
  scale: Vec3;
  /** degrees, x → y → z (IIIF RotateTransform) */
  rotation: Vec3;
  translation: Vec3;
}

/** Placement of a Babylon node (Babylon space). */
export interface NodePlacement {
  scaling: Vector3;
  rotation: Quaternion;
  position: Vector3;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);

/** Rounds away floating point noise so exported values stay readable. */
const clean = (value: number) => {
  const rounded = Math.round(value * 1e9) / 1e9;
  return rounded === 0 ? 0 : rounded;
};
const cleanVec = (v: Vec3): Vec3 => ({ x: clean(v.x), y: clean(v.y), z: clean(v.z) });

/** IIIF RotateTransform (degrees, IIIF space) → Babylon-space quaternion. X is applied first, then Y, then Z. */
export const iiifRotationToQuaternion = (iiifDegrees: Vec3): Quaternion => {
  const r = rotationToBabylon(iiifDegrees);
  // Quaternion products apply the right-hand factor first.
  return Quaternion.RotationAxis(AXIS_Z, r.z * DEG_TO_RAD)
    .multiply(Quaternion.RotationAxis(AXIS_Y, r.y * DEG_TO_RAD))
    .multiply(Quaternion.RotationAxis(AXIS_X, r.x * DEG_TO_RAD));
};

/** Inverse of iiifRotationToQuaternion: Babylon-space quaternion → IIIF x-y-z Euler angles in degrees. */
export const quaternionToIIIFRotation = (babylonRotation: Quaternion): Vec3 => {
  // Mirroring on X keeps the x component of the rotation axis and flips the sense of rotation.
  const q = new Quaternion(babylonRotation.x, -babylonRotation.y, -babylonRotation.z, babylonRotation.w).normalize();
  const { x, y, z, w } = q;
  // Rotation matrix for column vectors (v' = R v), R = Rz(c) · Ry(b) · Rx(a)
  const r00 = 1 - 2 * (y * y + z * z);
  const r10 = 2 * (x * y + z * w);
  const r11 = 1 - 2 * (x * x + z * z);
  const r12 = 2 * (y * z - x * w);
  const r20 = 2 * (x * z - y * w);
  const r21 = 2 * (y * z + x * w);
  const r22 = 1 - 2 * (x * x + y * y);

  const b = Math.asin(Math.min(1, Math.max(-1, -r20)));
  let a: number;
  let c: number;
  if (Math.abs(r20) < 1 - 1e-9) {
    a = Math.atan2(r21, r22);
    c = Math.atan2(r10, r00);
  } else {
    // Gimbal lock (y = ±90°): only a ∓ c is defined, put everything into x.
    a = Math.atan2(-r12, r11);
    c = 0;
  }
  return cleanVec({ x: a * RAD_TO_DEG, y: b * RAD_TO_DEG, z: c * RAD_TO_DEG });
};

/** Rotates a Babylon-space direction by all RotateTransforms in order (cameras and lights). */
export const rotateDirection = (direction: Vector3, transforms: IIIFTransform[]): Vector3 =>
  transforms
    .filter(t => t.kind === 'rotate')
    .reduce(
      (current, t) => current.applyRotationQuaternion(iiifRotationToQuaternion(t.value)).normalize(),
      direction.clone(),
    );

/**
 * Composes IIIF transforms (in document order) into a node placement in Babylon space.
 * This is the importer's math: the scene builder applies the result to the model's TransformNode.
 * A ScaleTransform after a RotateTransform is approximated (node scaling is local).
 */
export const composeIIIFTransforms = (transforms: IIIFTransform[]): NodePlacement => {
  const placement: NodePlacement = {
    scaling: new Vector3(1, 1, 1),
    rotation: Quaternion.Identity(),
    position: Vector3.Zero(),
  };
  for (const transform of transforms) {
    if (transform.kind === 'scale') {
      const v = new Vector3(transform.value.x, transform.value.y, transform.value.z);
      placement.scaling.multiplyInPlace(v);
      placement.position.multiplyInPlace(v);
    }
    if (transform.kind === 'rotate') {
      const q = iiifRotationToQuaternion(transform.value);
      placement.rotation = q.multiply(placement.rotation);
      placement.position.applyRotationQuaternionInPlace(q);
    }
    if (transform.kind === 'translate') {
      const t = pointToBabylon(transform.value);
      placement.position.addInPlace(new Vector3(t.x, t.y, t.z));
    }
  }
  return placement;
};

/** Local matrix of a node with this placement. */
export const nodeMatrix = ({ scaling, rotation, position }: NodePlacement): Matrix =>
  Matrix.Compose(scaling, rotation, position);

/**
 * Effective placement of a loaded model, for export.
 *
 * On import, the scene builder parents the loader's root node (local matrix `loaderLocal`, e.g. the
 * glTF `__root__` handedness conversion) to a TransformNode with the IIIF transforms, so
 * `world = loaderLocal · N` (row vectors). Hence `N = loaderLocal⁻¹ · world`, decomposed into
 * scale, rotation and translation and converted to IIIF space.
 */
export const effectiveModelTransform = (
  world: Matrix,
  loaderLocal: Matrix,
): { transform: IIIFModelTransform; warnings: string[] } => {
  const warnings: string[] = [];
  const node = loaderLocal.clone().invert().multiply(world);

  const scaling = new Vector3();
  const rotation = new Quaternion();
  const position = new Vector3();
  if (!node.decompose(scaling, rotation, position)) {
    warnings.push('Model placement could not be decomposed (zero scale), exported without rotation');
    rotation.copyFrom(Quaternion.Identity());
  }

  const recomposed = Matrix.Compose(scaling, rotation, position).asArray();
  const original = node.asArray();
  const magnitude = Math.max(1, ...original.map(Math.abs));
  if (recomposed.some((value, index) => Math.abs(value - original[index]) > 1e-6 * magnitude)) {
    warnings.push('Model placement contains shear, which IIIF transforms cannot express; exported approximately');
  }

  return {
    transform: {
      scale: cleanVec({ x: scaling.x, y: scaling.y, z: scaling.z }),
      rotation: quaternionToIIIFRotation(rotation),
      translation: cleanVec(pointToIIIF({ x: position.x, y: position.y, z: position.z })),
    },
    warnings,
  };
};

/** Rounds float noise from the world matrices (e.g. 0.029999999) to 6 decimals; avoids -0. */
const round6 = (value: number) => Math.round(value * 1e6) / 1e6 + 0;
const roundVec = (v: Vec3): Vec3 => ({ x: round6(v.x), y: round6(v.y), z: round6(v.z) });

/** Effective placement → IIIF transforms (rounded to 6 decimals), leaving out identity parts. */
export const modelTransformToIIIFTransforms = (placement: IIIFModelTransform): IIIFTransform[] => {
  const scale = roundVec(placement.scale);
  const rotation = roundVec(placement.rotation);
  const translation = roundVec(placement.translation);
  const transforms: IIIFTransform[] = [];
  if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) transforms.push({ kind: 'scale', value: { ...scale } });
  if (rotation.x || rotation.y || rotation.z) transforms.push({ kind: 'rotate', value: { ...rotation } });
  if (translation.x || translation.y || translation.z) {
    transforms.push({ kind: 'translate', value: { ...translation } });
  }
  return transforms;
};
