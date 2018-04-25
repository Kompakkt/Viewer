import { Injectable } from '@angular/core';

import PouchDB from 'pouchdb';

@Injectable()
export class DataService {

  constructor() {

    const db = new PouchDB('exampledb');

    db.info().then(function (info) {
      console.log(info);
    });
  }
}
