import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AsyncPipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialogActions, MatDialogClose, MatDialogContent } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ProcessingService } from '../../../services/processing/processing.service';

@Component({
  selector: 'app-dialog-invite-broadcasting',
  templateUrl: './dialog-invite-broadcasting.component.html',
  styleUrls: ['./dialog-invite-broadcasting.component.scss'],
  standalone: true,
  imports: [
    MatDialogContent,
    MatFormField,
    MatInput,
    MatLabel,
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
