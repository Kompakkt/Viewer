import { Component } from '@angular/core';
import { ProcessingService } from '../../../services/processing/processing.service';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-dialog-invite-broadcasting',
  templateUrl: './dialog-invite-broadcasting.component.html',
  styleUrls: ['./dialog-invite-broadcasting.component.scss'],
})
export class DialogInviteBroadcastingComponent {
  public text =
    'Hi! Do you like new innovative things? Come and join me on Kompakkt and ' +
    'let us use the collaborative Annotationmode! Join me on: ';

  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/?compilation=';
  public defaultURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/';
  public collectionId: string | undefined;
  translateItems: string[] = [];

  constructor(private translate: TranslateService,public processing: ProcessingService) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.translateStrings();
  }

  async translateStrings () {
    let translateSet = [this.text];
    this.translateItems = await this.translate.loadFromFile(translateSet);
  }

  get compilation$() {
    return this.processing.compilation$;
  }

  copyInputMessage(inputElement: HTMLTextAreaElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
}
