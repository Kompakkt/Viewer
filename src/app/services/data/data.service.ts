import {Injectable, EventEmitter} from '@angular/core';
import PouchDB from 'pouchdb';
import {isUndefined} from 'util';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public database: any;

  public constructor() {
    this.database = new PouchDB('annotationdb');
  }

  public fetch() {
    return this.database.allDocs({include_docs: true});
  }

  public delete(id: string) {

    this.database.get(id).then((doc) => {
      return this.database.remove(doc);
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
        console.log(isUndefined(doc.validated));

        doc.validated = validated;
      }
      // put them back
      console.log(doc);

      return db.put(doc);
    });
  }

  public updateAnnotationRanking(id: string, ranking: string) {

    const db = this.database;

    db.get(id).then(function (doc) {
      // update
      doc.ranking = ranking;
      // put them back
      return db.put(doc);
    });
  }
}
