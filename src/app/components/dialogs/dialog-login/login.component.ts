import { Component, inject, signal, model } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { IUserData, IUserDataWithoutData } from '@kompakkt/common';
import { FluentPipe } from '../../../pipes/fluent.pipe';
import { BackendService } from '../../../services/backend/backend.service';
import { form, FormField, required, submit } from '@angular/forms/signals';

export type AuthConcern = 'login' | 'delete-annotation';

export type AuthResult = {
  username: string;
  password: string;
  userData: IUserData | IUserDataWithoutData | undefined;
};

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [FormField, FluentPipe, InputComponent, ButtonComponent, ButtonRowComponent],
})
export class LoginComponent {
  dialogRef = inject<MatDialogRef<LoginComponent>>(MatDialogRef);
  backend = inject(BackendService);
  concern = inject<AuthConcern>(MAT_DIALOG_DATA);

  model = model({ username: '', password: '' });
  form = form(this.model, path => {
    required(path.username);
    required(path.password);
  });
  userdata = signal<IUserData | IUserDataWithoutData | undefined>(undefined);

  async login() {
    const data = this.form().value();
    this.dialogRef.disableClose = true;
    const success = await submit(this.form, async () => {
      const result = await this.backend
        .login(data.username, data.password)
        .catch(err => JSON.stringify(err));
      if (typeof result === 'string') {
        return {
          kind: 'serverError',
          message: result,
        };
      }
      this.userdata.set(result);
      return undefined;
    });
    this.dialogRef.disableClose = false;
    if (!success) return;
    this.dialogRef.close({ ...data, userData: this.userdata() } satisfies AuthResult);
  }
}
