import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MessageService } from '../../../services/message/message.service';
import { BackendService } from '../../../services/backend/backend.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-dialog-get-user-data',
  templateUrl: './dialog-get-user-data.component.html',
  styleUrls: ['./dialog-get-user-data.component.scss'],
})
export class DialogGetUserDataComponent {
  public username = '';
  public password = '';
  public success = false;
  private id = '';

  constructor(private translate: TranslateService,
    private backend: BackendService,
    private userdata: UserdataService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogGetUserDataComponent>,
    @Inject(MAT_DIALOG_DATA) data: { id: string },
  ) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.id = data.id;
  }

  public send() {
    if (this.id && this.password !== '') {
      this.backend
        .deleteRequest(this.id, 'annotation', this.username, this.password)
        .then(() => {
          this.userdata.loginData$.next({ username: this.username, password: this.password });
          this.dialogRef.close(true);
          this.message.info('Deleted from Server');
        })
        .catch((errorMessage: any) => {
          console.log(errorMessage);
          this.message.error('Not possible to deleted from Server');
          this.dialogRef.close();
        });
    } else {
      this.message.error('Please enter a password');
    }
  }

  public withoutlogin() {
    console.log('canceled');
    this.dialogRef.close();
  }
}
