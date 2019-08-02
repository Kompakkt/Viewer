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
      digobj_title: 'Kompakkt',
      digobj_description:
        'Kompakkt brings your 3D entities to the web and makes them annotatable! See our code here: ' +
        'https://github.com/DH-Cologne/Kompakkt',
      digobj_licence: 'MIT',
      digobj_rightsowner_person: [],
      digobj_rightsowner_institution: [
        {
          _id: 'default_institution',
          roles: {},
          institution_address: {
            address_building: '',
            address_city: 'Köln',
            address_country: 'Deutschland',
            address_number: '22',
            address_postcode: '50923',
            address_street: 'Universitätsstraße',
          },
          institution_name: 'Institut für Digital Humanities',
          institution_note: '',
          institution_role: ['RIGHTS_OWNER'],
          institution_university: 'Universität zu Köln',
        },
      ],
      contact_person: [
        {
          _id: 'default_contact_person',
          person_surname: 'Schubert',
          person_prename: 'Zoe',
          person_email: 'zoe.schubert@uni-koeln.de',
          person_role: ['CONTACT_PERSON'],
          person_phonenumber: '',
          person_note: '',
          person_institution: '',
          person_institution_data: [],
          roles: {},
        },
      ],
      contact_person_existing: [],
      digobj_type: 'type_3d',
      digobj_discipline: [],
      digobj_tags: [],
      digobj_entitytype: 'Typ',
      digobj_externalIdentifier: [],
      digobj_creation: [],
      digobj_dimensions: [],
      digobj_files: [],
      digobj_rightsowner: [],
      digobj_statement: '',
      digobj_externalLink: [],
      digobj_metadata_files: [],
      digobj_person: [],
      digobj_person_existing: [],
      digobj_person_existing_role: [],
      digobj_rightsownerSelector: 1,
      phyObjs: [],
    });
  }
}
