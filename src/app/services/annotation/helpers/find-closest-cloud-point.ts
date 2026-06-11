import { Matrix, Mesh, Nullable, Scene, Vector3, VertexBuffer, Viewport } from '@babylonjs/core';

const MAX_PICKING_DISTANCE_SCREEN_SQ = 30 * 30;

export const findClosestCloudPoint = (scene: Scene): Nullable<Vector3> => {
  const { pointerX, pointerY } = scene;
  const camera = scene.activeCamera;
  if (!camera) return null;

  const engine = scene.getEngine();
  const viewport = new Viewport(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
  const transformMatrix = scene.getTransformMatrix();

  // Walk every per-octree-cell point mesh (one Mesh per COPC/EPT octree node,
  // named 'point-cloud-<level>-<x>-<y>-<z>'). The parent 'root' TransformNode
  // is excluded by the name filter; the resolved root 'point-cloud-0-0-0-0'
  // is included.
  const pointMeshes = scene.meshes.filter(
    (mesh): mesh is Mesh => mesh instanceof Mesh && mesh.name.startsWith('point-cloud-'),
  );
  if (pointMeshes.length === 0) return null;

  let closestPoint: Nullable<Vector3> = null;
  let minScreenDistanceSq = Infinity;
  let closestDepth = Infinity;

  for (const mesh of pointMeshes) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
    if (!positions || positions.length === 0) continue;

    const worldMatrix = mesh.getWorldMatrix();

    for (let i = 0; i < positions.length; i += 3) {
      const local = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const world = Vector3.TransformCoordinates(local, worldMatrix);

      // Note: the first matrix arg is the world matrix of the object whose
      // local-space vertices are being projected. The point is already in
      // world space, so we pass IdentityReadOnly.
      const screen = Vector3.Project(world, Matrix.IdentityReadOnly, transformMatrix, viewport);

      const dx = screen.x - pointerX;
      const dy = screen.y - pointerY;
      const distSq = dx * dx + dy * dy;

      if (distSq < MAX_PICKING_DISTANCE_SCREEN_SQ) {
        if (
          distSq < minScreenDistanceSq ||
          (Math.abs(distSq - minScreenDistanceSq) < 1e-5 && screen.z < closestDepth)
        ) {
          minScreenDistanceSq = distSq;
          closestPoint = world;
          closestDepth = screen.z;
        }
      }
    }
  }

  return closestPoint;
};
