import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ICompilation } from '@kompakkt/shared';
import { MessageService } from '../../../services/message/message.service';
import { BackendService } from '../../../services/backend/backend.service';

@Component({
  selector: 'app-password',
  templateUrl: './dialog-password.component.html',
  styleUrls: ['./dialog-password.component.scss'],
})
export class DialogPasswordComponent {
  public password = '';
  public identifierCollection: string;

  private compilation: ICompilation | undefined;

  constructor(
    private backend: BackendService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogPasswordComponent>,
    @Inject(MAT_DIALOG_DATA) data,
  ) {
    this.identifierCollection = data.id;
  }

  public check() {
    this.dialogRef.disableClose = true;
    if (this.identifierCollection && this.password !== '') {
      this.backend
        .getCompilation(this.identifierCollection, this.password)
        .then(compilation => {
          if (!compilation) {
            this.message.error('Password is wrong.');
          } else {
            this.compilation = compilation as ICompilation;
            this.dialogRef.close({ result: true, data: this.compilation });
          }
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to server refused.');
          this.dialogRef.close();
        });
    }
  }
}
