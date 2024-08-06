import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { IUserData } from 'src/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { BackendService } from '../../../services/backend/backend.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    MatLabel,
    MatDialogActions,
    MatButton,
    TranslatePipe,
  ],
})
export class LoginComponent {
  public data: {
    username: string;
    password: string;
    userData: IUserData | undefined;
  } = {
    username: '',
    password: '',
    userData: undefined,
  };

  public waitingForResponse = false;
  public loginFailed = false;

  constructor(
    public dialogRef: MatDialogRef<LoginComponent>,
    public backend: BackendService,
    @Inject(MAT_DIALOG_DATA) public concern: string,
  ) {}

  public login() {
    this.waitingForResponse = true;
    this.dialogRef.disableClose = true;
    this.backend
      .login(this.data.username, this.data.password)
      .then(result => {
        this.waitingForResponse = false;
        this.loginFailed = false;
        this.dialogRef.disableClose = false;
        this.data.userData = result;
        this.dialogRef.close({ result: true, data: this.data });
      })
      .catch(error => {
        console.error(error);
        this.dialogRef.disableClose = false;
        this.waitingForResponse = false;
        this.loginFailed = true;
      });
  }
}
