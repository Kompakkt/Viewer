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


    if (!this.isInstantiated) {
      this.database = new PouchDB('annotationdb');
      this.isInstantiated = true;
      /*this.database.bulkDocs(this.annotations).then(function (result) {
        // handle result
      }).catch(function (err) {
        console.log(err);
      });*/
    }

    // this.database.destroy();

    this.database.info().then(function (info) {
      console.log(info);
    });

  }

  public fetch() {
    return this.database.allDocs({include_docs: true});
  }

  public updateAnnotation(id: string, title: string, description: string, preview: string): void {
    const db = this.database;
    db.get(id).then(function (doc) {
      console.log(doc);
      // update
      doc.title = title;
      doc.description = description;
      doc.preview = preview;
      // doc.ranking = ranking;


      // put them back
      return db.put(doc);
    }).then(function (doc) {
      console.log(doc);

    });
  }

}
