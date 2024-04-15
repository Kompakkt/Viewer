import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';

import { MessageService } from '../../../services/message/message.service';
import { BackendService } from '../../../services/backend/backend.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';

@Component({
  selector: 'app-dialog-get-user-data',
  templateUrl: './dialog-get-user-data.component.html',
  styleUrls: ['./dialog-get-user-data.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    FormsModule,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslatePipe,
  ],
})
export class DialogGetUserDataComponent {
  public username = '';
  public password = '';
  public success = false;
  private id = '';

  constructor(
    private backend: BackendService,
    private userdata: UserdataService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogGetUserDataComponent>,
    @Inject(MAT_DIALOG_DATA) data: { id: string },
  ) {
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
