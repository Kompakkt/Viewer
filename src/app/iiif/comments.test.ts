import { describe, expect, test } from 'bun:test';
import { ARC_ROTATE_CAMERA_TYPE, commentToAnnotation, perspectiveFromPoints } from './comments';

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
