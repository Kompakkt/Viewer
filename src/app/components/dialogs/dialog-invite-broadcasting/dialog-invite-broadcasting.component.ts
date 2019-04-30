import {Component, OnInit} from '@angular/core';

import {ProcessingService} from '../../../services/processing/processing.service';

@Component({
  selector: 'app-dialog-invite-broadcasting',
  templateUrl: './dialog-invite-broadcasting.component.html',
  styleUrls: ['./dialog-invite-broadcasting.component.scss'],
})
export class DialogInviteBroadcastingComponent implements OnInit {

  public text = 'Hi! Do you like new innovative things? Come and join me on Kompakkt and ' +
    'let us use the collaborative Annotationmode! Join me on: ';

  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/?compilation=';
  public defaultURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/';
  public collectionId: string;

  constructor(public processingService: ProcessingService) {
  }

  ngOnInit() {
  }

  copyInputMessage(inputElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
}
