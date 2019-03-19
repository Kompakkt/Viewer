import {Injectable} from '@angular/core';
import PouchDB from 'pouchdb';
import {Annotation} from '../../interfaces/annotation2/annotation2';
import {MongohandlerService} from '../mongohandler/mongohandler.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  public pouchdb: any;

  public constructor(private mongo: MongohandlerService) {
    
    PouchDB.plugin(require('pouchdb-upsert'));

    this.pouchdb = new PouchDB('annotationdb');

  }

  public fetch() {
    return this.pouchdb.allDocs({include_docs: true});
  }

  public putAnnotation(annotation: any) {
    if (annotation._id === 'DefaultAnnotation') return;
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
    if (id === 'DefaultAnnotation') return;
    this.pouchdb.get(id).then((result: Annotation) =>
      this.pouchdb.remove(result)
    ).catch((error: any) =>
      console.log('Failed removing annotation', error)
    );
  }

  public updateAnnotation(annotation: Annotation): void {
    if (annotation._id === 'DefaultAnnotation') return;

    this.pouchdb.upsert(annotation._id, function (result) {
      // console.log('Updating annotation in PouchDB:');
      result = annotation;
      return result;
    });
  }

  public updateAnnotationRanking(id: string, ranking: number) {
    if (id === 'DefaultAnnotation') return;
    
    this.pouchdb.upsert(id, function (result) {
      console.log('Updating ranking in PouchDB:');
      result.ranking = ranking;
      return result;
    });
    // this.pouchdb.get(id).then((result: Annotation) => {
    //   console.log('Updating ranking in PouchDB', result, ranking);
    //   result.ranking = ranking;
    //   return result;
    // });
  }
}
