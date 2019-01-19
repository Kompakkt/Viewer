import {Injectable} from '@angular/core';
import {MongohandlerService} from '../mongohandler/mongohandler.service';
import {MessageService} from '../message/message.service';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  private actualModelMetadata = '';
  private modelsMetadata: Array<any> = [];

  constructor(private mongohandlerService: MongohandlerService,
              private message: MessageService) {
  }


  public updateMetadata(metadata: any) {
    this.modelsMetadata.push(metadata);
  }

  public async fetchMetadata(metadata_id: string): Promise<any> {
    this.actualModelMetadata = this.modelsMetadata.find(e => e['_id'] === metadata_id);

    if (this.actualModelMetadata) {
      return this.actualModelMetadata;
    } else {
      this.actualModelMetadata = '';
      return await new Promise((resolve, reject) => {
        this.mongohandlerService.getModelMetadata(metadata_id).toPromise().then(result => {
          if (result['_id']) {
            this.updateMetadata(result);
            this.actualModelMetadata = result;
            resolve(result);
          } else {
            this.actualModelMetadata = '';
            reject(this.actualModelMetadata);
          }
        }).catch(error => {
          this.message.error('Connection to object server refused.');
          reject(error);
        });
      });
    }
  }

  public addDefaultMetadata() {
    this.updateMetadata(
      {
        _id: 'default_model',
      digobj_type: 'type_3d',
      digobj_title: 'Kompakkt',
      digobj_description: 'Kompakkt brings your 3D models to the web and makes them annotatable! See our code here: ' +
      'https://github.com/DH-Cologne/Kompakkt',
      digobj_licence: 'MIT License'});
  }
}

