import {Injectable} from '@angular/core';
import PouchDB from 'pouchdb';
import PouchFind from 'pouchdb-find';
import PouchUpsert from 'pouchdb-upsert';

PouchDB.plugin(PouchFind);
PouchDB.plugin(PouchUpsert);

import {Annotation} from '../../interfaces/annotation2/annotation2';
import {MongohandlerService} from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  public pouchdb: any;

  public constructor(private mongo: MongohandlerService) {

    this.pouchdb = new PouchDB('annotationdb');
    this.createIndex();
  }

  public createIndex() {
    this.pouchdb.createIndex({
      index: {
        fields: ['target.source.relatedCompilation', 'target.source.relatedModel'],
      },
    })
      .then(function(result) {
        // yo, a result
      })
      .catch(function(err) {
        console.log('Error create Index Pouch:', err);
        // ouch, an error
      });
  }

  public fetch() {
    return this.pouchdb.allDocs({include_docs: true});
  }

  public find(model: string, compilation?: string) {
    return this.pouchdb.find({
      selector: {
        'target.source.relatedCompilation': compilation,
        'target.source.relatedModel': model,
      },
    });
  }

  public putAnnotation(annotation: any) {
    if (annotation._id === 'DefaultAnnotation') { return; }
    this.pouchdb.put(annotation);
    /*this.mongo.updateAnnotation(annotation).toPromise()
      .then(result => console.log(result))
      .catch(error => console.error(error));*/
  }

  public cleanAndRenewDatabase() {
    this.pouchdb.destroy().then(() => {
      this.pouchdb = new PouchDB('annotationdb');
    });
  }

  public deleteAnnotation(id: string) {
    if (id === 'DefaultAnnotation') { return; }
    this.pouchdb.get(id).then((result: Annotation) =>
      this.pouchdb.remove(result),
    ).catch((error: any) =>
      console.log('Failed removing annotation', error),
    );
  }

  /*public updateAnnotation(annotation: Annotation): void {
    if (annotation._id === 'DefaultAnnotation') { return; }

    this.pouchdb.upsert(annotation._id, function(result) {
      result = annotation;
      return result;
    });
  }*/

  public updateAnnotation(annotation: Annotation): void {
    if (annotation._id === 'DefaultAnnotation') { return; }

    this.pouchdb.get(annotation._id)
      .then(() => annotation)
      .catch(() => {
        this.pouchdb.put(annotation);
      });
  }

  public updateAnnotationRanking(id: string, ranking: number) {
    if (id === 'DefaultAnnotation') { return; }
    this.pouchdb.upsert(id, function(result) {
      console.log('Updating ranking in PouchDB:');
      result.ranking = ranking;
      return result;
    });
  }
}
