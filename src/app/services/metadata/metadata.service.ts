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

  public fetchMetadata(metadata_id: string): string {

    this.actualModelMetadata = '';
    this.actualModelMetadata = this.modelsMetadata.find(e => e['_id'] === metadata_id);

    console.log('Ergebnis der Suche: ',  this.actualModelMetadata);
    console.log('Ich suche hier: ',  this.modelsMetadata);
    console.log('nach: ',  metadata_id);

    if (this.actualModelMetadata !== '' && this.actualModelMetadata !== undefined) {
      console.log('return1: ', this.actualModelMetadata);
      return this.actualModelMetadata;
    } else {
      this.actualModelMetadata = '';
      this.mongohandlerService.getModelMetadata(metadata_id).subscribe(result => {
        if (result['_id']) {
          console.log('Das kommt vom Server: ', result);
          this.updateMetadata(result);
          this.actualModelMetadata = result;
          console.log('return2: ', this.actualModelMetadata);
          return result;
        } else {
          this.actualModelMetadata = '';
          console.log('return3: ', this.actualModelMetadata);
          return this.actualModelMetadata;
        }
      }, error => {
        this.message.error('Connection to object server refused.');
      });
    }
  }

  public addDefaultMetadata() {
    this.updateMetadata(
      {
        _id: 'default_model',
      digobj_type: 'type_3d',
      digobj_title: 'Kompakkt',
      digobj_description: 'Kompakkt brings your 3D models to the web and makes it annotatable! See our code here: ' +
      'https://github.com/DH-Cologne/Kompakkt',
      digobj_licence: 'MIT License'});
  }
}

