/*
 * Default Entity for:
 *  - KompakktLogo(Default)
 */

import { IEntity } from '@kompakkt/shared';
import { baseEntity } from '../defaults';
import { settingsFallback, settingsKompakktLogo } from '../settings/settings';

export const defaultEntity: IEntity = {
  ...baseEntity(),
  _id: 'default',
  name: 'Cube',
  files: [
    {
      file_name: 'kompakkt.babylon',
      file_link: 'assets/models/kompakkt.babylon',
      file_size: 0,
      file_format: '.babylon',
    },
  ],
  annotationList: [],
  relatedDigitalEntity: { _id: 'default_entity' },
  creator: {
    _id: '',
    username: 'kompakkt',
    fullname: 'kompakkt',
  },
  mediaType: 'entity',
  processed: {
    low: 'assets/models/kompakkt.babylon',
    medium: 'assets/models/kompakkt.babylon',
    high: 'assets/models/kompakkt.babylon',
    raw: 'assets/models/kompakkt.babylon',
  },
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
  annotationList: [],
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
