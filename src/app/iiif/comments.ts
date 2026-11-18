import type { IAgent, IAnnotation, ICameraPerspective } from 'src/common';
import { cartesianToArcRotate, pointToBabylon, type Vec3 } from './coordinates';
import type { IIIFCameraItem, IIIFComment } from './model';

/** Value that cameraManager.getInitialPosition() returns for ArcRotate cameras. */
export const ARC_ROTATE_CAMERA_TYPE = 'arcRotateCam';

const KOMPAKKT_SOFTWARE = {
  _id: 'kompakkt',
  type: 'software',
  name: 'Kompakkt',
  homepage: 'https://github.com/Kompakkt/Kompakkt',
} as IAgent;

const KOMPAKKT_PERSON = { _id: 'kompakkt', type: 'person', name: 'Kompakkt' } as IAgent;

/** Kompakkt perspective from camera position and target, both in Babylon space. */
export const perspectiveFromPoints = (position: Vec3, target: Vec3): ICameraPerspective => {
  const { alpha, beta, radius } = cartesianToArcRotate(position, target);
  return {
    cameraType: ARC_ROTATE_CAMERA_TYPE,
    position: { x: alpha, y: beta, z: radius },
    target: { ...target },
    preview: '',
  };
};

/** Perspective from a IIIF camera. fallbackTarget (IIIF space) applies when lookAt is not a point. */
export const perspectiveFromCamera = (
  camera: IIIFCameraItem,
  fallbackTarget: Vec3,
): ICameraPerspective | undefined => {
  if (!camera.position) return undefined;
  const target = camera.lookAtPoint ?? fallbackTarget;
  return perspectiveFromPoints(pointToBabylon(camera.position), pointToBabylon(target));
};

/** Camera at `distance` along `normal` in front of `target` (both in Babylon space). */
export const perspectiveAlongNormal = (target: Vec3, normal: Vec3, distance: number): ICameraPerspective => {
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  const position = {
    x: target.x + (normal.x / length) * distance,
    y: target.y + (normal.y / length) * distance,
    z: target.z + (normal.z / length) * distance,
  };
  return perspectiveFromPoints(position, target);
};

export const commentToAnnotation = (
  comment: IIIFComment,
  ranking: number,
  perspective: ICameraPerspective,
  referenceNormal: Vec3,
): IAnnotation =>
  ({
    _id: comment.annotationId,
    identifier: comment.annotationId,
    ranking,
    validated: true,
    created: new Date().toISOString(),
    motivation: 'defaultMotivation',
    creator: KOMPAKKT_PERSON,
    lastModifiedBy: KOMPAKKT_PERSON,
    generator: KOMPAKKT_SOFTWARE,
    body: {
      type: 'annotation',
      content: {
        type: 'text',
        title: comment.title,
        description: comment.description,
        relatedPerspective: perspective,
      },
    },
    target: {
      source: { relatedEntity: 'standalone', relatedCompilation: '' },
      selector: {
        referencePoint: pointToBabylon(comment.point),
        referenceNormal,
      },
    },
  }) as IAnnotation;
