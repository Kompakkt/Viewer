import { IEntity } from 'src/common/interfaces';

// Creates a basic entity to be used as a building block
export const baseEntity = (): IEntity => ({
  _id: 'default',
  name: 'Cube',
  files: [],
  annotations: {},
  relatedDigitalEntity: { _id: 'default_entity' },
  creator: {
    _id: '',
    username: 'kompakkt',
    fullname: 'kompakkt',
  },

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
    low: 'assets/models/kompakkt.glb',
    medium: 'assets/models/kompakkt.glb',
    high: 'assets/models/kompakkt.glb',
    raw: 'assets/models/kompakkt.glb',
  },

  whitelist: {
    enabled: false,
    persons: [],
    groups: [],
  },
});
