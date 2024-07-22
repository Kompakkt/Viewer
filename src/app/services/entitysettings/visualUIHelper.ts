import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tags,
  TransformNode,
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
  boundingBox.isPickable = false;
  return boundingBox;
};

export const createGround = (scene: Scene, size: number) => {
  const existingGround = scene.getMeshByName('ground');
  if (existingGround) return existingGround as Mesh;

  const ground = MeshBuilder.CreateGround(
    'ground',
    { height: size, width: size, subdivisions: 20, updatable: true },
    scene,
  );
  Tags.AddTagsTo(ground, 'ground');
  ground.setEnabled(false);
  ground.isPickable = false;
  return ground;
};

const createAxis = (
  scene: Scene,
  name: string,
  color: Color3,
  size: number,
  direction: Vector3,
  parent: TransformNode
) => {
  const points = [
    Vector3.Zero(),
    direction.scale(size),
    direction.scale(size * 0.95).add(new Vector3(size * 0.05, size * 0.05, size * 0.05).subtract(direction.scale(size * 0.05))),
    direction.scale(size),
    direction.scale(size * 0.95).add(new Vector3(size * -0.05, size * -0.05, size * -0.05).subtract(direction.scale(size * 0.05)))
  ];
  
  const axis = MeshBuilder.CreateLines(name, { points, updatable: true }, scene);
  axis.color = color;
  axis.parent = parent;
  axis.isPickable = false;
  axis.renderingGroupId = 2;
  return axis;
};

const createAxisLabel = (
  scene: Scene,
  text: string,
  color: Color3,
  size: number,
  direction: Vector3,
  parent: TransformNode
) => {
  const label = createTextPlane(text, color.toHexString(), size / 10, 'axis', `axis${text}`, scene);
  label.position = direction.scale(size * 1.1);
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;
  label.parent = parent;
  label.isPickable = false;
  label.renderingGroupId = 2;
  return label;
};

export const createWorldAxis = (scene: Scene, size: number) => {
  if (scene.getTransformNodeByName('worldAxisRoot')) return;

  const worldAxisRoot = new TransformNode('worldAxisRoot', scene);

  const axes = [
    { name: 'X', color: new Color3(1, 0, 0), direction: new Vector3(1, 0, 0) },
    { name: 'Y', color: new Color3(0, 1, 0), direction: new Vector3(0, 1, 0) },
    { name: 'Z', color: new Color3(0, 0, 1), direction: new Vector3(0, 0, 1) }
  ];

  axes.forEach(({ name, color, direction }) => {
    createAxis(scene, `axis${name}`, color, size, direction, worldAxisRoot);
    createAxisLabel(scene, name, color, size, direction, worldAxisRoot);
  });

  Tags.AddTagsTo(worldAxisRoot, 'worldAxis');
  worldAxisRoot.setEnabled(false);
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

  const plane = MeshBuilder.CreatePlane(tag, { size, updatable: true }, scene);
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
  if (scene.getTransformNodeByName('localAxisRoot')) return;

  const localAxisRoot = new TransformNode('localAxisRoot', scene);
  localAxisRoot.position = pivot;

  const axes = [
    { name: 'X', color: new Color3(1, 0, 0), direction: new Vector3(1, 0, 0) },
    { name: 'Y', color: new Color3(0, 1, 0), direction: new Vector3(0, 1, 0) },
    { name: 'Z', color: new Color3(0, 0, 1), direction: new Vector3(0, 0, 1) }
  ];

  axes.forEach(({ name, color, direction }) => {
    createAxis(scene, `local_axis${name}`, color, size, direction, localAxisRoot);
    createAxisLabel(scene, name, color, size, direction, localAxisRoot);
  });

  localAxisRoot.parent = center;
  Tags.AddTagsTo(localAxisRoot, 'localAxis');
  localAxisRoot.setEnabled(false);
};
