import {
  DynamicTexture,
  MeshBuilder,
  Scene,
  Space,
  StandardMaterial,
  Tags,
  Vector3,
  Color3,
} from 'babylonjs';

export const createMarker = (
  scene: Scene,
  ranking: string,
  id: string,
  transparent: boolean,
  color?: string,
  position?: Vector3,
  normal?: Vector3,
) => {
  // Calculate marker size from mesh bounding box
  let actualMeshes = 0;
  const sumOfAvgs = scene.meshes.reduce((acc, mesh) => {
    const tags = (Tags.GetTags(mesh, true) as string | undefined) ?? '';
    if (tags.includes('marker')) return acc;
    actualMeshes += 1;
    const { x, y, z } = mesh._boundingInfo!.boundingBox.extendSize;
    return acc + (x + y + z) / 3;
  }, 0);
  const radius = (sumOfAvgs / actualMeshes) * 0.075;

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
  const fontSize = Math.floor(resolution / (ratio * 2));
  const font = `bold ${fontSize}px Roboto, "Helvetica Neue", sans-serif`;

  const mat = new StandardMaterial(`${id}_material${transparent ? '_transparent' : ''}`, scene);
  mat.diffuseTexture = dynamicTexture;
  mat.alpha = transparent ? 0.5 : 1;
  mat.emissiveColor = new Color3(1, 1, 1);
  mat.specularColor = new Color3(0, 0, 0);

  dynamicTexture.drawText(ranking, null, null, font, '#ffffff', color ?? '#000000', false, true);

  const markerName = `${id}_marker${transparent ? '_transparent' : ''}`;
  const marker = MeshBuilder.CreateDisc(markerName, { radius }, scene);
  Tags.AddTagsTo(marker, 'marker');
  Tags.AddTagsTo(marker, id);
  Tags.AddTagsTo(marker, markerName);
  if (position && normal) {
    marker.position = position;
    marker.translate(normal, 0.5, Space.WORLD);
  }
  marker.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  marker.material = mat;
  marker.renderingGroupId = transparent ? 3 : 2;

  return marker;
};
