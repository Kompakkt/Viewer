import { describe, expect, test } from 'bun:test';
import { commentToAnnotation, perspectiveFromCamera } from './comments';
import { pointToBabylon, rotationToBabylon } from './coordinates';
import { makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest } from './exporter';
import { parseManifest } from './parser';

const closeTo = (actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }) => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.z).toBeCloseTo(expected.z);
};

describe('round trip: exportManifest → parseManifest', () => {
  const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 45, z: -30 }, translate: { x: 1, y: 2, z: 3 } });
  const input = makeInput({ settings });
  const model = parseManifest(JSON.parse(JSON.stringify(exportManifest(input).manifest)));

  test('model, transforms and background survive', () => {
    expect(model.label).toBe('Pawn');
    expect(model.models[0].url).toBe(input.modelUrl);
    expect(model.backgroundColor).toEqual({ r: 153, g: 204, b: 255 });
    const [scale, rotate, translate] = model.models[0].transforms;
    expect(scale).toEqual({ kind: 'scale', value: { x: 2, y: 2, z: 2 } });
    expect(rotationToBabylon(rotate.value)).toEqual({ x: 10, y: 45, z: -30 });
    expect(pointToBabylon(translate.value)).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('initial camera survives', () => {
    const camera = model.cameras.find(c => !c.hidden)!;
    const perspective = perspectiveFromCamera(camera, { x: 0, y: 0, z: 0 })!;
    closeTo(perspective.position as any, settings.cameraPositionInitial.position);
    closeTo(perspective.target as any, settings.cameraPositionInitial.target);
  });

  test('comments survive with order, text, point and perspective', () => {
    const sorted = [...input.annotations].sort((a, b) => a.ranking - b.ranking);
    expect(model.comments).toHaveLength(sorted.length);

    model.comments.forEach((comment, index) => {
      const original = sorted[index];
      const camera = model.cameras.find(c => c.annotationId === comment.cameraAnnotationId)!;
      expect(camera.hidden).toBe(true);
      const perspective = perspectiveFromCamera(camera, comment.point)!;
      const annotation = commentToAnnotation(comment, index + 1, perspective, { x: 0, y: 1, z: 0 });

      expect(annotation.ranking).toBe(original.ranking);
      expect(annotation.body.content.title).toBe(original.body.content.title);
      expect(annotation.body.content.description).toBe(original.body.content.description);
      closeTo(annotation.target.selector.referencePoint as any, original.target.selector.referencePoint as any);
      closeTo(perspective.position as any, original.body.content.relatedPerspective.position as any);
      closeTo(perspective.target as any, original.body.content.relatedPerspective.target as any);
    });
  });
});
