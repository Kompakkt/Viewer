/*
 * Default Entity for:
 *  - KompakktLogo(Default)
 */

import { IEntity } from 'src/common/interfaces';
import { baseEntity } from '../defaults';
import { settingsFallback, settingsKompakktLogo } from '../settings/settings';

export const defaultEntity: IEntity = {
  ...baseEntity(),
  _id: 'default',
  name: 'Cube',
  annotations: {},
  relatedDigitalEntity: { _id: 'default_entity' },
  creator: {
    _id: '',
    username: 'kompakkt',
    fullname: 'kompakkt',
  },
  mediaType: 'entity',
  settings: settingsKompakktLogo,
};

export const fallbackEntity: IEntity = {
  ...baseEntity(),
  _id: 'fallback',
  name: 'Cat',
  files: [
    {
      file_name: 'scene.gltf',
      file_link: 'assets/models/sketch_cat/scene.gltf',
      file_size: 0,
      file_format: '.gltf',
    },
  ],
  annotations: {},
  relatedDigitalEntity: { _id: 'fallback_entity' },
  creator: {
    _id: '',
    username: 'kompakkt',
    fullname: 'kompakkt',
  },
  mediaType: 'entity',
  processed: {
    low: 'assets/models/sketch_cat/scene.gltf',
    medium: 'assets/models/sketch_cat/scene.gltf',
    high: 'assets/models/sketch_cat/scene.gltf',
    raw: 'assets/models/sketch_cat/scene.gltf',
  },
  settings: settingsFallback,
};
