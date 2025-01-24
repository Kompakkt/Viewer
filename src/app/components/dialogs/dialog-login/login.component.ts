import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

import { FormsModule } from '@angular/forms';
import { ButtonComponent, ButtonRowComponent, InputComponent } from 'projects/komponents/src';
import { IUserData } from 'src/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { BackendService } from '../../../services/backend/backend.service';

export type AuthConcern = 'login' | 'delete-annotation';

export type AuthResult = {
  username: string;
  password: string;
  userData: IUserData | undefined;
};

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    imports: [
        FormsModule,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        TranslatePipe,
        InputComponent,
        ButtonComponent,
        ButtonRowComponent,
    ]
})
export class LoginComponent {
  public data: AuthResult = {
    username: '',
    password: '',
    userData: undefined,
  };

  public waitingForResponse = false;
  public loginFailed = false;

  constructor(
    public dialogRef: MatDialogRef<LoginComponent>,
    public backend: BackendService,
    @Inject(MAT_DIALOG_DATA) public concern: AuthConcern,
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
        this.dialogRef.close(this.data);
      })
      .catch(error => {
        console.error(error);
        this.dialogRef.disableClose = false;
        this.waitingForResponse = false;
        this.loginFailed = true;
      });
  }
}
