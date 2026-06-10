import { GaussianSplattingMesh, Matrix, Nullable, Scene, Vector3, Viewport } from '@babylonjs/core';

export const findClosestSplatPoint = (scene: Scene): Nullable<Vector3> => {
  const gsMesh = scene.getMeshByName('GaussianSplatting') as Nullable<GaussianSplattingMesh>;
  if (!gsMesh) return null;
  // ArrayBuffer: postions (3 floats), size (3 floats), color (4 bytes), orientation quaternion (4 bytes)
  const splatsData = gsMesh.splatsData;
  if (!splatsData) return null;

  const { pointerX, pointerY } = scene;
  const camera = scene.activeCamera;
  if (!camera) return null;

  const engine = scene.getEngine();
  const screenWidth = engine.getRenderWidth();
  const screenHeight = engine.getRenderHeight();

  // Constants for splat data structure
  const SIZEOF_FLOAT = 4;
  const SIZEOF_BYTE = 1; // For clarity

  // Stride calculation based on your comment:
  // Position (3 floats), Size (3 floats), Color (4 bytes), Orientation (4 bytes)
  const POSITION_OFFSET = 0;
  const POSITION_COMPONENTS = 3;

  // If your splat data format is different, adjust these:
  const SIZE_COMPONENTS = 3;
  const COLOR_COMPONENTS_BYTE = 4;
  const ORIENTATION_COMPONENTS_BYTE = 4;

  const STRIDE =
    POSITION_COMPONENTS * SIZEOF_FLOAT +
    SIZE_COMPONENTS * SIZEOF_FLOAT +
    COLOR_COMPONENTS_BYTE * SIZEOF_BYTE +
    ORIENTATION_COMPONENTS_BYTE * SIZEOF_BYTE; // Should be 32 based on your description

  if (STRIDE <= 0 || splatsData.byteLength % STRIDE !== 0) {
    console.error('Invalid STRIDE or splatsData length.', STRIDE, splatsData.byteLength);
    return null;
  }

  const numSplats = splatsData.byteLength / STRIDE;
  const dataView = new DataView(splatsData);

  let closestSplatWorldPosition: Nullable<Vector3> = null;
  let minScreenDistanceSq = Infinity;
  let closestSplatDepth = Infinity;

  const worldMatrix = gsMesh.getWorldMatrix();
  const transformMatrix = scene.getTransformMatrix(); // View-Projection matrix
  const viewport = new Viewport(0, 0, screenWidth, screenHeight);

  // Define a maximum distance in screen pixels for a splat to be considered "close"
  // Adjust this threshold as needed.
  const MAX_PICKING_DISTANCE_SCREEN_SQ = 50 * 50; // e.g., 50 pixels radius

  for (let i = 0; i < numSplats; ++i) {
    const currentOffset = i * STRIDE;

    // Read position (assuming Little Endian, common for .splat files)
    const localX = dataView.getFloat32(currentOffset + POSITION_OFFSET, true);
    const localY = dataView.getFloat32(currentOffset + POSITION_OFFSET + SIZEOF_FLOAT, true) * -1;
    const localZ = dataView.getFloat32(currentOffset + POSITION_OFFSET + 2 * SIZEOF_FLOAT, true);
    const splatLocalPosition = new Vector3(localX, localY, localZ);

    // Transform splat position from local mesh space to world space
    const splatWorldPosition = Vector3.TransformCoordinates(splatLocalPosition, worldMatrix);

    // Project world position to 2D screen coordinates
    // Note: The first matrix argument to Vector3.Project is the world matrix of the object
    // whose vertices (in local space) are being projected. Since splatWorldPosition is already
    // in world space, we use Matrix.IdentityReadOnly.
    const screenPosition = Vector3.Project(
      splatWorldPosition,
      Matrix.IdentityReadOnly, // Object's world matrix (already applied)
      transformMatrix, // Combined ViewProjection matrix
      viewport,
    );

    const dx = screenPosition.x - pointerX;
    const dy = screenPosition.y - pointerY;
    const distSq = dx * dx + dy * dy;

    if (distSq < MAX_PICKING_DISTANCE_SCREEN_SQ) {
      // If this splat is closer on screen OR
      // if it's at a similar screen distance but closer to the camera (smaller depth value)
      if (
        distSq < minScreenDistanceSq ||
        (Math.abs(distSq - minScreenDistanceSq) < 1e-5 && screenPosition.z < closestSplatDepth)
      ) {
        minScreenDistanceSq = distSq;
        closestSplatWorldPosition = splatWorldPosition;
        closestSplatDepth = screenPosition.z;
      }
    }
  }
  return closestSplatWorldPosition;
};
