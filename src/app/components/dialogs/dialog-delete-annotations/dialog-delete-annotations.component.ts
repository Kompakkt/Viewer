import { Component } from '@angular/core';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-dialog-ask-delete-all-annotations',
  templateUrl: './dialog-delete-annotations.component.html',
})
export class DialogDeleteAnnotationsComponent {
  constructor (private translate: TranslateService) {
    this.translate.use(window.navigator.language.split("-")[0]);
  }
}
