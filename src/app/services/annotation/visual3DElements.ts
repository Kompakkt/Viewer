import {
  DynamicTexture,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Tags,
  Vector3,
  Color3,
  Mesh,
} from '@babylonjs/core';

const calcRadius = (scene: Scene) => {
  // Try to get size from root mesh, only works for glTF models
  const rootMesh = scene.getMeshByName('__root__');
  if (rootMesh) {
    const rootSize = rootMesh?.getBoundingInfo().boundingBox.maximumWorld;
    if (rootSize) {
      const avgRootAxisLength = rootSize.asArray().sort()[1];
      return avgRootAxisLength * 0.025;
    }
  }

  // Calculate marker size from mesh bounding box
  // TODO: Use .getHierarchyBoundingVectors() instead of .getBoundingInfo()
  const max = { x: 0, y: 0, z: 0 };
  for (const mesh of scene.meshes) {
    const { x, y, z } = mesh.getBoundingInfo().boundingBox.extendSizeWorld;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.x = z;
  }
  return Math.max(...Object.values(max)) * 0.05;
};

export const createMarker = (
  scene: Scene,
  ranking: string,
  id: string,
  transparent: boolean,
  color?: string,
  position?: Vector3,
  normal?: Vector3,
) => {
  const radius = calcRadius(scene);

  // Create dynamic texture and write the text
  const resolution = 256;
  const dynamicTexture = new DynamicTexture(
    `${id}_texture${transparent ? '_transparent' : ''}`,
    { width: resolution, height: resolution },
    scene,
    true,
  );
  const ctx = dynamicTexture.getContext();
  ctx.font = `bold 16px Roboto, "Helvetica Neue", sans-serif`;
  const textWidth = ctx.measureText('00').width;
  const ratio = textWidth / 16;
  const fontSize = Math.floor(resolution / (ratio * 1.5));
  const font = `bold ${fontSize}px Roboto, "Helvetica Neue", sans-serif`;

  const mat = new StandardMaterial(`${id}_material${transparent ? '_transparent' : ''}`, scene);
  mat.diffuseTexture = dynamicTexture;
  mat.alpha = transparent ? 0.5 : 1;
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.specularColor = new Color3(0, 0, 0);

  dynamicTexture.drawText(ranking, null, 180, font, '#ffffff', color ?? '#000000', false, true);

  const markerName = `${id}_marker${transparent ? '_transparent' : ''}`;
  const marker = MeshBuilder.CreateDisc(markerName, { radius }, scene);
  Tags.AddTagsTo(marker, 'marker');
  Tags.AddTagsTo(marker, transparent ? 'transparent_marker' : 'solid_marker');
  Tags.AddTagsTo(marker, id);
  Tags.AddTagsTo(marker, markerName);
  if (position && normal) {
    marker.position = position;
    // TODO: Discuss if this is needed
    // When uncommented, this breaks the IIIF example
    // If its needed, the distance parameter should be relative to the model size
    // marker.translate(normal, 0.5, Space.WORLD);
  }
  marker.billboardMode = Mesh.BILLBOARDMODE_ALL;
  marker.material = mat;
  marker.renderingGroupId = transparent ? 3 : 2;

  return marker;
};
