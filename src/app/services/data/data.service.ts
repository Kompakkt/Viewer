import {Injectable, EventEmitter} from '@angular/core';
import PouchDB from 'pouchdb';
import {Annotation} from '../../interfaces/annotation/annotation';
import {isUndefined} from 'util';
import {ifTrue} from 'codelyzer/util/function';


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

  public delete(id: string, rev: string) {
    this.database.remove(id, rev, function (error, response) {
      if (error) {
        return console.log(error);
      }
    });
  }

  public updateAnnotation(id: string, title: string, description: string, preview?: string, cameraPosition?, validated?: boolean): void {
    const db = this.database;
    db.get(id).then(function (doc) {
      // update
      doc.title = title;
      doc.description = description;

      if (!isUndefined(preview)) {
        doc.preview = preview;
      }
      if (!isUndefined(cameraPosition)) {

        doc.cameraPosition = cameraPosition;
      }
      if (!isUndefined(validated)) {
        console.log(isUndefined(doc.validated ));

        doc.validated = validated;
      }

      // doc.ranking = ranking;

      // put them back
      console.log(doc);

      return db.put(doc);
      console.log(doc);

    });
  }

}
