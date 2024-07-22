import { Mesh, MeshBuilder, Scene, Space, StandardMaterial, Tags, Vector3 } from '@babylonjs/core';

export const createMarker = (scene: Scene, id: string, position?: Vector3, normal?: Vector3) => {
  const radius = 0.1;
  const mat = new StandardMaterial(`${id}_material`, scene);
  mat.alpha = 0;
  const markerName = `${id}_marker`;
  const marker = MeshBuilder.CreateDisc(markerName, { radius }, scene);
  Tags.AddTagsTo(marker, 'marker');
  Tags.AddTagsTo(marker, 'solid_marker');
  Tags.AddTagsTo(marker, id);
  Tags.AddTagsTo(marker, markerName);
  if (position && normal) {
    marker.position = position;
    // TODO: Discuss if this is needed
    // When uncommented, this breaks the IIIF example
    // If its needed, the distance parameter should be relative to the model size
    marker.translate(normal, 1 / 1_000, Space.LOCAL);
  }
  marker.billboardMode = Mesh.BILLBOARDMODE_ALL;
  marker.material = mat;
  marker.renderingGroupId = 1;

  marker.occlusionType = Mesh.OCCLUSION_TYPE_OPTIMISTIC;
  marker.occlusionQueryAlgorithmType = Mesh.OCCLUSION_ALGORITHM_TYPE_ACCURATE;

  return marker;
};
