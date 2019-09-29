import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';

import {ILDAPData} from '../../../interfaces/interfaces';
import {MongohandlerService} from '../../../services/mongohandler/mongohandler.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

    public data: {
        username: string;
        password: string;
        userData: ILDAPData | undefined;
    } = {
        username: '',
        password: '',
        userData: undefined,
    };

    public waitingForResponse = false;
    public loginFailed = false;

    constructor(
        public dialogRef: MatDialogRef<LoginComponent>,
        public mongoService: MongohandlerService,
        @Inject(MAT_DIALOG_DATA) public concern: string,
    ) {
    }

    ngOnInit() {
    }

    public login() {
        this.waitingForResponse = true;
        this.dialogRef.disableClose = true;
        this.mongoService
            .login(this.data.username, this.data.password)
            .then(result => {
                if (result.status === 'ok') {
                    this.waitingForResponse = false;
                    this.loginFailed = false;
                    this.dialogRef.disableClose = false;
                    this.data.userData = result;
                    this.dialogRef.close({result: true, data: this.data});
                } else {
                    this.dialogRef.disableClose = false;
                    this.waitingForResponse = false;
                    this.loginFailed = true;
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
