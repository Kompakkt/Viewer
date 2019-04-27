import {Injectable} from '@angular/core';
import PouchDB from 'pouchdb';

import {IAnnotation, ICompilation, IModel} from '../../interfaces/interfaces';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  public pouchdb: PouchDB.Database = new PouchDB('annotationdb');

  public fetch() {
    return this.pouchdb.allDocs({include_docs: true});
  }

  public async findAnnotations(model: string, compilation?: string): Promise<IAnnotation[]> {
    const allDocs = await this.fetch();
    const annotationList: IAnnotation[] = [];
    allDocs.rows.forEach(annotation => {
      const isAnnotation = (obj: any): obj is IAnnotation => {
        const _annotation = obj as IAnnotation;
        return _annotation && _annotation.body !== undefined && _annotation.target !== undefined;
      };

      if (!isAnnotation(annotation)) return;

      const correctCompilation = (compilation)
        ? annotation.target.source.relatedCompilation === compilation : true;
      const correctModel = annotation.target.source.relatedModel === model;

      if (!correctModel || !correctModel) return;

      annotationList.push(annotation);
    });
    console.log(allDocs.rows, annotationList, model, compilation);
    return annotationList;
  }

  public putAnnotation(annotation: IAnnotation) {
    if (annotation._id === 'DefaultAnnotation') return;
    this.pouchdb.put(annotation);
  }

  public cleanAndRenewDatabase() {
    this.pouchdb
      .destroy()
      .then(() => this.pouchdb = new PouchDB('annotationdb'));
  }

  public deleteAnnotation(id: string) {
    if (id === 'DefaultAnnotation') return;
    this.pouchdb.get(id)
      .then(result => this.pouchdb.remove(result))
      .catch((error: any) => console.log('Failed removing annotation', error));
  }

  public updateAnnotation(annotation: IAnnotation): void {
    if (annotation._id === 'DefaultAnnotation') return;

    this.pouchdb.get(annotation._id)
      .then(() => annotation)
      .catch(() => {
        this.pouchdb.put(annotation);
      });
  }

  public updateAnnotationRanking(id: string, ranking: number) {
    if (id === 'DefaultAnnotation') return;
    this.pouchdb.get(id)
      .then((result: PouchDB.Core.IdMeta & IAnnotation & PouchDB.Core.GetMeta) => {
        result.ranking = ranking;
        this.pouchdb.put(result);
      })
      .catch(e => console.log('Failed updating annotation ranking', e));
  }
}
