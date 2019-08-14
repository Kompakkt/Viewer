import { Injectable } from '@angular/core';

import { IMetaDataDigitalEntity } from '../../interfaces/interfaces';
import { MessageService } from '../message/message.service';
import { MongohandlerService } from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})
export class MetadataService {
  private actualEntityMetadata: IMetaDataDigitalEntity | undefined;
  private entitiesMetadata: IMetaDataDigitalEntity[] = [];

  constructor(
    private mongohandlerService: MongohandlerService,
    private message: MessageService,
  ) {}

  public updateMetadata(metadata: IMetaDataDigitalEntity) {
    this.entitiesMetadata.push(metadata);
  }

  public async fetchMetadata(
    metadata_id: string,
  ): Promise<IMetaDataDigitalEntity> {
    this.actualEntityMetadata = this.entitiesMetadata.find(
      e => e['_id'] === metadata_id,
    );

    if (this.actualEntityMetadata) {
      return this.actualEntityMetadata;
    } else {
      this.actualEntityMetadata = undefined;
      return new Promise((resolve, reject) => {
        this.mongohandlerService
          .getEntityMetadata(metadata_id)
          .then(result => {
            if (result['_id']) {
              console.log('Metadaten: ', result);
              this.updateMetadata(result);
              this.actualEntityMetadata = result;
              resolve(result);
            } else {
              this.actualEntityMetadata = undefined;
              reject(this.actualEntityMetadata);
            }
          })
          .catch(error => {
            this.message.error('Connection to entity server refused.');
            reject(error);
          });
      });
    }
  }

  public addDefaultMetadata() {
    this.updateMetadata({
      _id: 'default_entity',
      title: 'Kompakkt',
      description:
        'Kompakkt brings your 3D entities to the web and makes them annotatable! See our code here: ' +
        'https://github.com/DH-Cologne/Kompakkt',
      licence: 'MIT',
      persons: [
        {
          _id: 'default_contact_person',
          name: 'Schubert',
          prename: 'Zoe',
          contact_references: {
            default_entity: {
              mail: 'zoe.schubert@uni-koeln.de',
              phonenumber: '',
              note: '',
              creation_date: Date.now(),
            },
          },
          roles: {
            default_entity: ['CONTACT_PERSON'],
          },
          institutions: {
            default_entity: [],
          },
        },
      ],
      institutions: [
        {
          _id: 'default_institution',
          name: 'Institut für Digital Humanities',
          university: 'Universität zu Köln',

          addresses: {
            default_entity: {
              building: '',
              city: 'Köln',
              country: 'Deutschland',
              number: '22',
              postcode: '50923',
              street: 'Universitätsstraße',
              creation_date: Date.now(),
            },
          },
          notes: {
            default_entity: '',
          },
          roles: {
            default_entity: ['RIGHTS_OWNER'],
          },
        },
      ],
      type: 'type_3d',
      discipline: [],
      tags: [],
      objecttype: 'Typ',
      externalId: [],
      creation: [],
      dimensions: [],
      files: [],
      statement: '',
      externalLink: [],
      metadata_files: [],
      phyObjs: [],
    });
  }
}
