import { describe, expect, test } from 'bun:test';
import {
  ARC_ROTATE_CAMERA_TYPE,
  commentToAnnotation,
  perspectiveAlongNormal,
  perspectiveFromCamera,
  perspectiveFromPoints,
} from './comments';

describe('comments', () => {
  test('perspectiveFromPoints stores alpha/beta/radius in position', () => {
    const perspective = perspectiveFromPoints({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 });
    expect(perspective.cameraType).toBe(ARC_ROTATE_CAMERA_TYPE);
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.x).toBeCloseTo(Math.PI / 2);
    expect(position.y).toBeCloseTo(Math.PI / 2);
    expect(position.z).toBeCloseTo(10);
    expect(perspective.target).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('commentToAnnotation converts point to Babylon space', () => {
    const annotation = commentToAnnotation(
      { annotationId: 'c1', title: 'T', description: 'D', point: { x: 1, y: 2, z: 3 } },
      4,
      perspectiveFromPoints({ x: 0, y: 0, z: 10 }, { x: -1, y: 2, z: 3 }),
      { x: 0, y: 1, z: 0 },
    );
    expect(annotation._id).toBe('c1');
    expect(annotation.ranking).toBe(4);
    expect(annotation.body.content.title).toBe('T');
    expect(annotation.body.content.description).toBe('D');
    expect(annotation.target.selector.referencePoint).toEqual({ x: -1, y: 2, z: 3 });
    expect(annotation.target.selector.referenceNormal).toEqual({ x: 0, y: 1, z: 0 });
    expect(annotation.target.source.relatedEntity).toBe('standalone');
  });
});

describe('perspectives', () => {
  test('perspectiveFromCamera converts IIIF camera to Babylon arc-rotate values', () => {
    const perspective = perspectiveFromCamera(
      {
        annotationId: 'cam',
        projection: 'perspective',
        position: { x: 0, y: 0, z: 10 },
        lookAtPoint: { x: 0, y: 0, z: 0 },
        transforms: [],
        hidden: true,
      },
      { x: 5, y: 5, z: 5 },
    )!;
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.x).toBeCloseTo(Math.PI / 2);
    expect(position.y).toBeCloseTo(Math.PI / 2);
    expect(position.z).toBeCloseTo(10);
    expect(perspective.target).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('perspectiveFromCamera falls back to comment point as target', () => {
    const perspective = perspectiveFromCamera(
      { annotationId: 'cam', projection: 'perspective', position: { x: 1, y: 0, z: 0 }, transforms: [], hidden: true },
      { x: 2, y: 0, z: 0 },
    )!;
    expect(perspective.target).toEqual({ x: -2, y: 0, z: 0 });
  });

  test('perspectiveFromCamera returns undefined without position', () => {
    expect(
      perspectiveFromCamera({ annotationId: 'cam', projection: 'perspective', transforms: [], hidden: true }, { x: 0, y: 0, z: 0 }),
    ).toBeUndefined();
  });

  test('perspectiveAlongNormal places the camera along the normal', () => {
    const perspective = perspectiveAlongNormal({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 4);
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.y).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(4);
  });
});
