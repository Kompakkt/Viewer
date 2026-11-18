import type { IAgent, IAnnotation, ICameraPerspective } from 'src/common';
import { cartesianToArcRotate, pointToBabylon, type Vec3 } from './coordinates';
import type { IIIFComment } from './model';

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
