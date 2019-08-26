import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { UserdataService } from '../../../services/userdata/userdata.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public username = '';
  public password = '';

  public waitingForResponse = false;
  public loginFailed = false;

  constructor(
    public dialogRef: MatDialogRef<LoginComponent>,
    public account: UserdataService,
    @Inject(MAT_DIALOG_DATA) public concern: string,
  ) {}

  ngOnInit() {}

  public clickedLogin() {
    this.waitingForResponse = true;
    this.dialogRef.disableClose = true;
    this.account
      .attemptLogin(this.username, this.password)
      .then(result => {
        this.waitingForResponse = false;
        this.loginFailed = !result;
        this.dialogRef.disableClose = false;
        if (result) {
          this.dialogRef.close(true);
        }
      })
      .catch(error => {
        console.error(error);
        this.dialogRef.disableClose = false;
        this.waitingForResponse = false;
        this.loginFailed = true;
      });
  }
}
