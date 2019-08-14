import { IEntity } from '../app/interfaces/interfaces';

// Creates a basic entity to be used as a building block
export const baseEntity = (): IEntity => ({
  _id: 'default',
  name: 'Cube',
  files: [],
  annotationList: [],
  relatedDigitalEntity: { _id: 'default_entity' },
  relatedEntityOwners: [
    {
      _id: '',
      username: 'kompakkt',
      fullname: 'kompakkt',
    },
  ],
  finished: false,
  online: false,

  mediaType: 'model',
  dataSource: {
    isExternal: false,
    service: 'kompakkt',
  },

  settings: {
    preview: '',
    cameraPositionInitial: {
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      target: {
        x: 0,
        y: 0,
        z: 0,
      },
    },
    background: {
      color: {
        r: 51,
        g: 51,
        b: 51,
        a: 229.5,
      },
      effect: false,
    },
    lights: [
      {
        type: 'HemisphericLight',
        position: {
          x: 0,
          y: -1,
          z: 0,
        },
        intensity: 1,
      },
      {
        type: 'HemisphericLight',
        position: {
          x: 0,
          y: 1,
          z: 0,
        },
        intensity: 1,
      },
      {
        type: 'PointLight',
        position: {
          x: 1,
          y: 10,
          z: 1,
        },
        intensity: 1,
      },
    ],
    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },
    scale: 1,
  },

  processed: {
    low: 'assets/models/kompakkt.babylon',
    medium: 'assets/models/kompakkt.babylon',
    high: 'assets/models/kompakkt.babylon',
    raw: 'assets/models/kompakkt.babylon',
  },

  whitelist: {
    enabled: false,
    persons: [],
    groups: [],
  },
});
