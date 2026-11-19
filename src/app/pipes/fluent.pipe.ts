import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate/translate.service';

@Pipe({ name: 'fluent', pure: false })
export class FluentPipe implements PipeTransform {
  #service = inject(TranslateService);
  transform(key: string, args?: any): string {
    return this.#service.getTranslation(key, args);
  }
}
