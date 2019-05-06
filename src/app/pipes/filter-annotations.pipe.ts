import { Pipe, PipeTransform } from '@angular/core';

import { IAnnotation } from '../interfaces/interfaces';

@Pipe({
  name: 'filterAnnotations',
  pure: false,
})
export class FilterAnnotationsPipe implements PipeTransform {

  transform(items: IAnnotation[], compilationAnnotations: boolean): IAnnotation[] {
    const isCompilationAnnotation = (ann: IAnnotation) =>
      ann.target.source.relatedCompilation !== undefined
      && ann.target.source.relatedCompilation.length > 0;
    return items.filter(ann => isCompilationAnnotation(ann) === compilationAnnotations);
  }

}
