import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '../services/translate/translate.service';

@Pipe({
  name: 'translate',
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  constructor(private translateService: TranslateService) {}

  transform(key: any): any {
    return this.translateService.getTranslatedKey(key);
  }
}
