import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';

import { MessageService } from '../../../services/message/message.service';
import { MongohandlerService } from '../../../services/mongohandler/mongohandler.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public username = '';
  public password = '';

  constructor(
    private mongohandlerService: MongohandlerService,
    private message: MessageService,
    private userDataService: UserdataService,
    private processingService: ProcessingService,
    private dialog: MatDialog,
  ) {}

  ngOnInit() {}

  public login() {
    this.mongohandlerService
      .login(this.username, this.password)
      .then(result => {
        if (result.status === 'ok') {
          this.userDataService.setcachedLoginData(this.password, this.username);
          this.processingService.bootstrap();
          this.dialog.closeAll();
        }
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to entity server refused.');
        this.userDataService.setcachedLoginData('', '');
      });
  }

  public withoutlogin() {
    console.log('username:' + this.username);
  }
}
