import type { IAnnotation, IEntitySettings } from 'src/common';
import type { ManifestExportInput } from '../exporter';

export const makeSettings = (overrides: Partial<IEntitySettings> = {}): IEntitySettings => ({
  preview: '',
  cameraPositionInitial: { position: { x: Math.PI / 2, y: Math.PI / 2, z: 10 }, target: { x: 0, y: 0, z: 0 } },
  lights: [],
  background: { color: { r: 153, g: 204, b: 255, a: 1 }, effect: false },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  ...overrides,
});

export const makeAnnotation = (
  id: string,
  ranking: number,
  title: string,
  description: string,
  point: { x: number; y: number; z: number },
): IAnnotation =>
  ({
    _id: id,
    ranking,
    body: {
      type: 'annotation',
      content: {
        type: 'text',
        title,
        description,
        relatedPerspective: {
          cameraType: 'arcRotateCam',
          position: { x: 0.8, y: 1.2, z: 6 },
          target: point,
          preview: 'data:image/png;base64,xyz',
        },
      },
    },
    target: {
      source: { relatedEntity: 'e1' },
      selector: { referencePoint: point, referenceNormal: { x: 0, y: 1, z: 0 } },
    },
  }) as unknown as IAnnotation;

export const makeInput = (overrides: Partial<ManifestExportInput> = {}): ManifestExportInput => ({
  entityId: 'e1',
  entityName: 'Pawn',
  modelUrl: 'https://kompakkt.de/server/models/pawn/high.glb',
  manifestId: 'https://viewer.example/viewer/?entity=e1',
  baseId: 'https://viewer.example/viewer/iiif/e1',
  settings: makeSettings(),
  annotations: [
    makeAnnotation('a2', 2, 'Second', 'Two', { x: 1, y: 0, z: 0 }),
    makeAnnotation('a1', 1, 'First', '', { x: -1, y: 2, z: 3 }),
  ],
  ...overrides,
});
