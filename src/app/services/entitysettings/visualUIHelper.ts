import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tags,
  Vector3,
} from '@babylonjs/core';

export const createBoundingBox = (
  scene: Scene,
  center: Mesh,
  initialSize: Vector3,
  centerPoint: Vector3,
) => {
  const boundingBox = MeshBuilder.CreateBox(
    'boundingBox',
    {
      width: initialSize.x,
      height: initialSize.y,
      depth: initialSize.z,
    },
    scene,
  );
  Tags.AddTagsTo(boundingBox, 'boundingBox');

  boundingBox.material = new StandardMaterial('boundingBoxMat', scene);
  boundingBox.material.wireframe = true;
  boundingBox.position = centerPoint;
  boundingBox.visibility = 0;
  boundingBox.parent = center;
  return boundingBox;
};

// Ground

export const createGround = (scene: Scene, size: number) => {
  const ground = MeshBuilder.CreateGround(
    'ground',
    { height: size, width: size, subdivisions: 20 },
    scene,
  );
  Tags.AddTagsTo(ground, 'ground');
  ground.visibility = 0;
  return ground;
};

// Axis (world and local)
export const createWorldAxis = (scene: Scene, size: number) => {
  const sizeWorldAxis = size;

  const vecOneX = new Vector3(sizeWorldAxis, 0, 0);
  const vecTwoX = new Vector3(sizeWorldAxis * 0.95, sizeWorldAxis * 0.05, 0);
  const vecThreeX = new Vector3(sizeWorldAxis, 0, 0);
  const vecFourX = new Vector3(sizeWorldAxis * 0.95, sizeWorldAxis * -0.05, 0);
  const pointsX = [Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX];
  // TODO: Replace CreateLines with MeshBuilder
  const axisX = MeshBuilder.CreateLines('axisX', { points: pointsX, updatable: true }, scene);
  Tags.AddTagsTo(axisX, 'worldAxis');
  axisX.color = new Color3(1, 0, 0);
  axisX.visibility = 0;
  const xChar = createTextPlane('X', 'red', sizeWorldAxis / 10, 'worldAxis', 'worldAxisX', scene);
  xChar.position = new Vector3(sizeWorldAxis * 0.9, sizeWorldAxis * -0.05, 0);
  xChar.visibility = 0;

  const vecOneY = new Vector3(0, sizeWorldAxis, 0);
  const vecTwoY = new Vector3(sizeWorldAxis * -0.05, sizeWorldAxis * 0.95, 0);
  const vecThreeY = new Vector3(0, sizeWorldAxis, 0);
  const vecFourY = new Vector3(sizeWorldAxis * 0.05, sizeWorldAxis * 0.95, 0);
  const pointsY = [Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY];
  const axisY = MeshBuilder.CreateLines('axisY', { points: pointsY, updatable: true }, scene);
  Tags.AddTagsTo(axisY, 'worldAxis');
  axisY.color = new Color3(0, 1, 0);
  axisY.visibility = 0;
  const yChar = createTextPlane('Y', 'green', sizeWorldAxis / 10, 'worldAxis', 'worldAxisY', scene);
  yChar.position = new Vector3(0, sizeWorldAxis * 0.9, sizeWorldAxis * -0.05);
  yChar.visibility = 0;

  const vecOneZ = new Vector3(0, 0, sizeWorldAxis);
  const vecTwoZ = new Vector3(0, sizeWorldAxis * -0.05, sizeWorldAxis * 0.95);
  const vecThreeZ = new Vector3(0, 0, sizeWorldAxis);
  const vecFourZ = new Vector3(0, sizeWorldAxis * 0.05, sizeWorldAxis * 0.95);
  const pointsZ = [Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ];
  const axisZ = MeshBuilder.CreateLines('axisZ', { points: pointsZ, updatable: true }, scene);
  Tags.AddTagsTo(axisZ, 'worldAxis');
  axisZ.color = new Color3(0, 0, 1);
  axisZ.visibility = 0;
  const zChar = createTextPlane('Z', 'blue', sizeWorldAxis / 10, 'worldAxis', 'worldAxisZ', scene);
  zChar.position = new Vector3(0, sizeWorldAxis * 0.05, sizeWorldAxis * 0.9);
  zChar.visibility = 0;
};

export const createTextPlane = (
  text: string,
  color: string,
  size: number,
  tag: string,
  tagIndividual: string,
  scene: Scene,
) => {
  const dynamicTexture = new DynamicTexture('DynamicTexture', 50, scene, true);
  dynamicTexture.hasAlpha = true;
  dynamicTexture.drawText(text, 5, 40, 'bold 36px Arial', color, 'transparent', true);

  const plane = Mesh.CreatePlane(tag, size, scene, true);
  Tags.AddTagsTo(plane, tag);
  Tags.AddTagsTo(plane, tagIndividual);

  const material = new StandardMaterial('TextPlaneMaterial', scene);
  material.backFaceCulling = false;
  material.specularColor = new Color3(0, 0, 0);
  material.diffuseTexture = dynamicTexture;
  plane.material = material;

  return plane;
};

export const createlocalAxes = (scene: Scene, size: number, center: Mesh, pivot: Vector3) => {
  const sizeLocalAxis = size;

  const vecOneX = new Vector3(sizeLocalAxis, 0, 0);
  const vecTwoX = new Vector3(sizeLocalAxis * 0.95, 0.05 * sizeLocalAxis, 0);
  const vecThreeX = new Vector3(sizeLocalAxis, 0, 0);
  const vecFourX = new Vector3(sizeLocalAxis * 0.95, -0.05 * sizeLocalAxis, 0);
  const local_axisX = Mesh.CreateLines(
    'local_axisX',
    [Vector3.Zero(), vecOneX, vecTwoX, vecThreeX, vecFourX],
    scene,
    true,
  );
  Tags.AddTagsTo(local_axisX, 'localAxis');
  local_axisX.color = new Color3(1, 0, 0);
  local_axisX.visibility = 0;
  local_axisX.position = pivot;
  local_axisX.renderingGroupId = 2;
  const xChar = createTextPlane('X', 'red', sizeLocalAxis / 10, 'localAxis', 'localAxisX', scene);
  xChar.position = new Vector3(0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis, 0);
  xChar.visibility = 0;
  xChar.renderingGroupId = 2;

  const vecOneY = new Vector3(0, sizeLocalAxis, 0);
  const vecTwoY = new Vector3(-0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
  const vecThreeY = new Vector3(0, sizeLocalAxis, 0);
  const vecFourY = new Vector3(0.05 * sizeLocalAxis, sizeLocalAxis * 0.95, 0);
  const local_axisY = Mesh.CreateLines(
    'local_axisY',
    [Vector3.Zero(), vecOneY, vecTwoY, vecThreeY, vecFourY],
    scene,
    true,
  );
  Tags.AddTagsTo(local_axisY, 'localAxis');
  local_axisY.color = new Color3(0, 1, 0);
  local_axisY.visibility = 0;
  local_axisY.position = pivot;
  local_axisY.renderingGroupId = 2;
  const yChar = createTextPlane('Y', 'green', sizeLocalAxis / 10, 'localAxis', 'localAxisY', scene);
  yChar.position = new Vector3(0, 0.9 * sizeLocalAxis, -0.05 * sizeLocalAxis);
  yChar.visibility = 0;
  yChar.renderingGroupId = 2;

  const vecOneZ = new Vector3(0, 0, sizeLocalAxis);
  const vecTwoZ = new Vector3(0, -0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
  const vecThreeZ = new Vector3(0, 0, sizeLocalAxis);
  const vecFourZ = new Vector3(0, 0.05 * sizeLocalAxis, sizeLocalAxis * 0.95);
  const local_axisZ = Mesh.CreateLines(
    'local_axisZ',
    [Vector3.Zero(), vecOneZ, vecTwoZ, vecThreeZ, vecFourZ],
    scene,
    true,
  );
  Tags.AddTagsTo(local_axisZ, 'localAxis');
  local_axisZ.color = new Color3(0, 0, 1);
  local_axisZ.visibility = 0;
  local_axisZ.position = pivot;
  local_axisZ.renderingGroupId = 2;
  const zChar = createTextPlane('Z', 'blue', sizeLocalAxis / 10, 'localAxis', 'localAxisZ', scene);
  zChar.position = new Vector3(0, 0.05 * sizeLocalAxis, 0.9 * sizeLocalAxis);
  zChar.visibility = 0;
  zChar.renderingGroupId = 2;

  // TODO
  local_axisX.parent = center;
  xChar.parent = center;
  local_axisY.parent = center;
  yChar.parent = center;
  local_axisZ.parent = center;
  zChar.parent = center;
};

// End of Axis
