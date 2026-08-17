import { ProfileType } from '@kompakkt/common';
import { IEntity } from '@kompakkt/common';

const logoPath =
  Math.random() > 0.5
    ? 'assets/models/KompakktLogoRotate.glb'
    : 'assets/models/KompakktLogoShake.glb';

// Creates a basic entity to be used as a building block
export const baseEntity = (): IEntity => ({
  _id: 'default',
  name: 'Cube',
  annotations: {},
  relatedDigitalEntity: { _id: 'default_entity' },
  creator: {
    _id: '',
    username: 'kompakkt',
    fullname: 'kompakkt',
    profile: { profileId: '', type: ProfileType.user },
  },

  finished: false,
  online: false,

  mediaType: 'model',
  dataSource: { isExternal: false, service: 'kompakkt' },

  settings: {
    preview: '',
    cameraPositionInitial: {
      position: { x: 0, y: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
    },
    background: {
      color: { r: 51, g: 51, b: 51, a: 229.5 },
      effect: false,
    },
    lights: [
      {
        type: 'Ambient',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        intensity: 5,
        color: { r: 255, g: 255, b: 255, a: 255 },
        name: 'Ambient',
      },
    ],
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  },

  files: [
    {
      file_name: logoPath.split('/').pop()!,
      file_link: logoPath,
      file_size: 0,
      file_format: '.glb',
    },
  ],

  processed: {
    low: logoPath,
    medium: logoPath,
    high: logoPath,
    raw: logoPath,
  },

  access: [],
});
