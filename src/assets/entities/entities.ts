/*
 * Default Entity for:
 *  - KompakktLogo(Default)
 */

import { IEntity } from '../../app/interfaces/interfaces';
import {baseEntity} from '../defaults';
import {settingsKompakktLogo} from '../settings/settings';

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
    relatedDigitalEntity: {_id: 'default_entity'},
    relatedEntityOwners: [{
        _id: '',
        username: 'kompakkt',
        fullname: 'kompakkt',
    }],
    mediaType: 'model',
    processed: {
        low: 'assets/models/kompakkt.babylon',
        medium: 'assets/models/kompakkt.babylon',
        high: 'assets/models/kompakkt.babylon',
        raw: 'assets/models/kompakkt.babylon',
    },
    settings: settingsKompakktLogo,
};
