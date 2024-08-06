import { Injectable } from '@angular/core';
import localForage from 'localforage';

import { IAnnotation } from 'src/common';

@Injectable({
  providedIn: 'root',
})
export class LocalForageService {
  private store: LocalForage = localForage.createInstance({
    name: 'annotationdb',
    driver: localForage.LOCALSTORAGE,
  });

  public async fetch(): Promise<IAnnotation[]> {
    const keys = await this.store.keys();
    const annotations = await Promise.all(keys.map(key => this.store.getItem<IAnnotation>(key)));
    return annotations.filter((annotation): annotation is IAnnotation => annotation !== null);
  }

  public async findAnnotations(entity: string, compilation?: string): Promise<IAnnotation[]> {
    const allAnnotations = await this.fetch();
    return allAnnotations.filter(annotation => {
      const correctCompilation = compilation
        ? annotation.target.source.relatedCompilation === compilation
        : true;
      const correctEntity = annotation.target.source.relatedEntity === entity;
      return correctEntity && correctCompilation;
    });
  }

  public async putAnnotation(annotation: IAnnotation) {
    if (annotation._id === 'DefaultAnnotation') return;
    return this.store.setItem(annotation._id.toString(), annotation);
  }

  public async cleanAndRenewDatabase() {
    return this.store.clear();
  }

  public async deleteAnnotation(id: string) {
    if (id === 'DefaultAnnotation') return;
    return this.store.removeItem(id);
  }

  public async updateAnnotation(annotation: IAnnotation) {
    if (annotation._id === 'DefaultAnnotation') return;
    return this.store.setItem(annotation._id.toString(), annotation);
  }

  public async updateAnnotationRanking(id: string, ranking: number) {
    if (id === 'DefaultAnnotation') return;
    const annotation = await this.store.getItem<IAnnotation>(id);
    if (annotation) {
      annotation.ranking = ranking;
      return this.store.setItem(id, annotation);
    }
  }
}
