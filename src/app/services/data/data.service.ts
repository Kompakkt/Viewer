import {Injectable, EventEmitter} from '@angular/core';
import PouchDB from 'pouchdb';
import {Annotation} from '../../interfaces/annotation/annotation';


@Injectable({
  providedIn: 'root'
})
export class DataService {

  private isInstantiated: boolean;
  public database: any;
  private listener: EventEmitter<any> = new EventEmitter();

  public annotations: Array<any>;


  public constructor() {

    //TODO
    // delete example data
    this.annotations = [
      {
        relatedModel: 'example', id: 11, ranking: 1,
        referencePoint: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        cameraPosition: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        preview: './assets/exampleDataAnnotations/images/anno1.png', originatorID: 'x', validated: true,
        title: 'Interesting Annotation', description: 'Here you can write interesting', date: 'sometime'
      },
      {
        relatedModel: 'example', id: 11, ranking: 1,
        referencePoint: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        cameraPosition: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        preview: './assets/exampleDataAnnotations/images/anno1.png', originatorID: 'x', validated: true,
        title: 'Interesting Annotation', description: 'Here you can write interesting', date: 'sometime'
      },
      {
        relatedModel: 'example', _id: 11, ranking: 1,
        referencePoint: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        cameraPosition: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        preview: './assets/exampleDataAnnotations/images/anno1.png', originatorID: 'x', validated: true,
        title: 'Interesting Annotation', description: 'Here you can write interesting', date: 'sometime'
      }
    ];

    if (!this.isInstantiated) {
      this.database = new PouchDB('annotationdb');
      this.isInstantiated = true;
      /*this.database.bulkDocs(this.annotations).then(function (result) {
        // handle result
      }).catch(function (err) {
        console.log(err);
      });*/
    }

    this.database.info().then(function (info) {
      console.log(info);
    });

  }

  public fetch() {
    return this.database.allDocs({include_docs: true});
  }

}
