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
  radius: number,
  ranking: string,
  id: string,
  transparent: boolean,
  color?: string,
  position?: Vector3,
  normal?: Vector3,
) => {
  // Set font
  const font_size = radius * 100;
  const resolution = radius * 100;
  const font = `bold ${font_size}px Calibri`;

  // Create dynamic texture and write the text
  const dynamicTexture = new DynamicTexture(
    `${id}_texture${transparent ? '_transparent' : ''}`,
    { width: resolution, height: resolution },
    scene,
    false,
  );
  const mat = new StandardMaterial(`${id}_material${transparent ? '_transparent' : ''}`, scene);
  mat.diffuseTexture = dynamicTexture;
  dynamicTexture.drawText(
    ranking,
    null,
    null,
    font,
    '#ffffff',
    color ? color : '#000000',
    false,
    true,
  );
  mat.alpha = transparent ? 0.5 : 1;
  mat.emissiveColor = new Color3(1, 1, 1);

  const marker = MeshBuilder.CreateDisc(
    `${id}_marker${transparent ? '_transparent' : ''}`,
    { radius },
    scene,
  );
  Tags.AddTagsTo(marker, 'marker');
  Tags.AddTagsTo(marker, id);
  Tags.AddTagsTo(marker, `${id}_marker${transparent ? '_transparent' : ''}`);
  if (position && normal) {
    marker.position = position;
    marker.translate(normal, 0.5, Space.WORLD);
  }
  marker.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  marker.material = mat;
  marker.renderingGroupId = transparent ? 3 : 2;

  return marker;
};
