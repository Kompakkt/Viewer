import {Injectable, EventEmitter} from '@angular/core';
import PouchDB from 'pouchdb';
import {isUndefined} from 'util';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private isInstantiated: boolean;

  public database: any;
  public annotations: Array<any>;

  public constructor() {

    if (!this.isInstantiated) {
      this.database = new PouchDB('annotationdb');
      this.isInstantiated = true;
    }

    // this.destroyDB();

    this.database.info().then(function (info) {
      console.log(info);
    });
  }

  public destroyDB(): void {
    this.database.destroy();
  }

  public put(document) {
    this.database.put(document);
  }

  public fetch() {
    return this.database.allDocs({include_docs: true});
  }

  public delete(id: string, rev: string) {

    this.database.remove(id, rev).then(function (result) {
      // console.log(result);
    }).catch(function (error) {
      console.log(error);
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
