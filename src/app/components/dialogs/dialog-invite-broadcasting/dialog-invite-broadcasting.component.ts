import { Component } from '@angular/core';
import { ProcessingService } from '../../../services/processing/processing.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatButton } from '@angular/material/button';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import { MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-invite-broadcasting',
  templateUrl: './dialog-invite-broadcasting.component.html',
  styleUrls: ['./dialog-invite-broadcasting.component.scss'],
  standalone: true,
  imports: [
    MatDialogContent,
    MatFormField,
    MatInput,
    CdkTextareaAutosize,
    MatDialogActions,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatButton,
    MatDialogClose,
    AsyncPipe,
    TranslatePipe,
  ],
})
export class DialogInviteBroadcastingComponent {
  public text =
    'Hi! Do you like new innovative things? Come and join me on Kompakkt and ' +
    'let us use the collaborative Annotationmode! Join me on: ';

  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/?compilation=';
  public defaultURL = 'https://blacklodge.hki.uni-koeln.de/builds/Kompakkt/live/';
  public collectionId: string | undefined;

  constructor(public processing: ProcessingService) {}

  get compilation$() {
    return this.processing.compilation$;
  }

  copyInputMessage(inputElement: HTMLTextAreaElement) {
    inputElement.select();
    document.execCommand('copy');
    inputElement.setSelectionRange(0, 0);
  }
}
