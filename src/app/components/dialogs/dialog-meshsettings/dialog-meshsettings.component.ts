import { Component } from '@angular/core';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-dialog-meshsettings',
  templateUrl: './dialog-meshsettings.component.html',
  styleUrls: ['./dialog-meshsettings.component.scss'],
})
export class DialogMeshsettingsComponent {
  constructor(private translate: TranslateService) {
    this.translate.use(window.navigator.language.split("-")[0]);
  }
}
