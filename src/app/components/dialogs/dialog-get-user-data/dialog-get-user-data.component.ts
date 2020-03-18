import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MessageService } from '../../../services/message/message.service';
import { BackendService } from '../../../services/backend/backend.service';
import { UserdataService } from '../../../services/userdata/userdata.service';

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

  constructor(
    private backend: BackendService,
    private userdataService: UserdataService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogGetUserDataComponent>,
    @Inject(MAT_DIALOG_DATA) data,
  ) {
    this.id = data.id;
  }

  public send() {
    if (this.id && this.password !== '') {
      this.backend
        .deleteRequest(this.id, 'annotation', this.username, this.password)
        .then((result: any) => {
          if (result.status === 'ok') {
            this.userdataService.loginData = {
              username: this.username,
              password: this.password,
              isCached: true,
            };
            this.dialogRef.close(true);
            this.message.info('Deleted from Server');
          } else {
            this.message.info('Not possible to deleted from Server');
          }
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
