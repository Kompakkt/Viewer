import { Component } from '@angular/core';
import { filter, map } from 'rxjs';
import { isCompilation, isEntity } from 'src/common';
import { environment } from 'src/environments/environment';
import { ProcessingService } from '../../services/processing/processing.service';

import { TranslateService } from './../../services/translate/translate.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
})
export class CompilationBrowserComponent {
  public server_url = environment.server_url;
  translateItems: string[] = [];

  constructor(private translate: TranslateService, public processing: ProcessingService) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.translateStrings();
  }

  async translateStrings () {
    let translateSet = ["Object","Objects"];
    this.translateItems = await this.translate.loadFromFile(translateSet);
  }

  get compilation$() {
    return this.processing.compilation$;
  }

  get entity$() {
    return this.processing.entity$;
  }

  get entities$() {
    return this.compilation$.pipe(
      filter(isCompilation),
      map(({ entities }) => Object.values(entities)),
      map(entities => entities.filter(isEntity)),
    );
  }
}
