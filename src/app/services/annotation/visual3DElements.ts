import { MeshBuilder, Scene, Space, Tags, Vector3, Mesh } from '@babylonjs/core';

export const createMarker = (scene: Scene, id: string, position?: Vector3, normal?: Vector3) => {
  // const mat = new StandardMaterial(`${id}_material`, scene);

  const markerName = `${id}_marker`;
  const marker = MeshBuilder.CreateDisc(markerName, { radius: 1 }, scene);
  Tags.AddTagsTo(marker, 'marker');
  Tags.AddTagsTo(marker, 'solid_marker');
  Tags.AddTagsTo(marker, id);
  Tags.AddTagsTo(marker, markerName);
  if (position && normal) {
    marker.position = position;
    marker.translate(normal, 0.5, Space.WORLD);
  }
  marker.billboardMode = Mesh.BILLBOARDMODE_ALL;
  // marker.material = mat;
  marker.renderingGroupId = 3;
  marker.visibility = 0;

  return marker;
};
