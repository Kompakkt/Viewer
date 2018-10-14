import {Injectable, EventEmitter} from '@angular/core';
import PouchDB from 'pouchdb';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private isInstantiated: boolean;
  private database: any;
  private listener: EventEmitter<any> = new EventEmitter();
  public annotations: Array<any>;

  // private annotations = [] as Array<Annotation>;


  public constructor() {

    // example data


    this.annotations = [

      {
        model: 'example', id: 11, sequence: 1, positionx: 1, positiony: 1, babylonVectorx: 1, babylonVectory: 1, babylonVectorz: 1,
        validated: true, title: 'Interesting Annotation',
        description: 'Here you can write interesting or uninteresting things about your annotation.',
        person: 'x', date: 1, preview: './assets/exampleDataAnnotations/images/anno1.png'
      },
      {
        model: 'example', id: 12, sequence: 2, positionx: 1, positiony: 1, babylonVectorx: 1, babylonVectory: 1, babylonVectorz: 1,
        validated: true, title: 'Interesting Annotation',
        description: 'Here you can write interesting or uninteresting things about your annotation.',
        person: 'x', date: 1, preview: './assets/exampleDataAnnotations/images/anno1.png'
      },
      {
        model: 'example', id: 13, sequence: 3, positionx: 1, positiony: 1, babylonVectorx: 1, babylonVectory: 1, babylonVectorz: 1,
        validated: true, title: 'Interesting Annotation',
        description: 'Here you can write interesting or uninteresting things about your annotation.',
        person: 'x', date: 1, preview: './assets/exampleDataAnnotations/images/anno1.png'
      },
      {
        model: 'example', id: 14, sequence: 4, positionx: 1, positiony: 1, babylonVectorx: 1, babylonVectory: 1, babylonVectorz: 1,
        validated: true, title: 'Interesting Annotation',
        description: 'Here you can write interesting or uninteresting things about your annotation.',
        person: 'x', date: 1, preview: './assets/exampleDataAnnotations/images/anno1.png'
      }
    ];

    if (!this.isInstantiated) {
      this.database = new PouchDB('annotationdb');
      this.isInstantiated = true;
      this.database.bulkDocs(this.annotations).then(function (result) {
        // handle result
      }).catch(function (err) {
        console.log(err);
      });
    }

    this.database.info().then(function (info) {
      console.log(info);

    });

  }

  public fetch() {
    return this.database.allDocs({include_docs: true});
  }

  public get(id: string) {
    return this.database.get(id);
  }

  public put(id: string, document: any) {
    document._id = id;
    return this.get(id).then(result => {
      document._rev = result._rev;
      return this.database.put(document);
    }, error => {
      if (error.status === '404') {
        return this.database.put(document);
      } else {
        return new Promise((resolve, reject) => {
          reject(error);
        });
      }
    });
  }

  public sync(remote: string) {
    const remoteDatabase = new PouchDB(remote);
    this.database.sync(remoteDatabase, {
      live: true
    }).on('change', change => {
      this.listener.emit(change);
    }).on('error', error => {
      console.error(JSON.stringify(error));
    });
  }

  public getChangeListener() {
    return this.listener;
  }

}
