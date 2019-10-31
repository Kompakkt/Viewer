import { Injectable } from '@angular/core';
import PouchDB from 'pouchdb';

import { IAnnotation } from '../../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public pouchdb: PouchDB.Database = new PouchDB('annotationdb');

  public fetch() {
    return this.pouchdb.allDocs({ include_docs: true });
  }

  public async findAnnotations(
    entity: string,
    compilation?: string,
  ): Promise<IAnnotation[]> {
    const allDocs = await this.fetch();
    const annotationList: IAnnotation[] = [];
    allDocs.rows.forEach(annotation => {
      const isAnnotation = (obj: any): obj is IAnnotation => {
        const _annotation = obj as IAnnotation;
        return (
          _annotation &&
          _annotation.body !== undefined &&
          _annotation.target !== undefined
        );
      };

      if (isAnnotation(annotation)) {
        const correctCompilation = compilation
          ? annotation.target.source.relatedCompilation === compilation
          : true;
        const correctEntity = annotation.target.source.relatedEntity === entity;

        if (!correctEntity || !correctCompilation) {
          throw new Error('Entity or Compilation undefined');
        }

        annotationList.push(annotation);
      }
    });
    console.log(allDocs.rows, annotationList, entity, compilation);
    return annotationList;
  }

  public async putAnnotation(annotation: IAnnotation) {
    return annotation._id === 'DefaultAnnotation'
      ? undefined
      : this.pouchdb.put(annotation);
  }

  public async cleanAndRenewDatabase() {
    return this.pouchdb
      .destroy()
      .then(() => (this.pouchdb = new PouchDB('annotationdb')));
  }

  public async deleteAnnotation(id: string) {
    return id === 'DefaultAnnotation'
      ? undefined
      : this.pouchdb
          .get(id)
          .then(result => this.pouchdb.remove(result))
          .catch((error: any) =>
            console.log('Failed removing annotation', error),
          );
  }

  public async updateAnnotation(annotation: IAnnotation) {
    return annotation._id === 'DefaultAnnotation'
      ? undefined
      : this.pouchdb
          .get(annotation._id)
          .then(() => annotation)
          .catch(() => {
            this.pouchdb.put(annotation);
          });
  }

  public async updateAnnotationRanking(id: string, ranking: number) {
    return id === 'DefaultAnnotation'
      ? undefined
      : this.pouchdb
          .get(id)
          .then(result => {
            (result as PouchDB.Core.IdMeta &
              IAnnotation &
              PouchDB.Core.GetMeta).ranking = ranking;
            this.pouchdb.put(result);
          })
          .catch(e => console.log('Failed updating annotation ranking', e));
  }
}
