import {Component, OnInit} from '@angular/core';

import {MessageService} from '../../../services/message/message.service';
import {MongohandlerService} from '../../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../../services/overlay/overlay.service';
import {ProcessingService} from '../../../services/processing/processing.service';
import {UserdataService} from '../../../services/userdata/userdata.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

  public username = '';
  public password = '';
  public success = false;
  private isOpen: boolean;

  constructor(private mongohandlerService: MongohandlerService,
              private message: MessageService,
              private overlayService: OverlayService,
              private userDataService: UserdataService,
              private processingService: ProcessingService) {
  }

  ngOnInit() {

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });
  }

  public login() {

    this.mongohandlerService.login(this.username, this.password)
      .subscribe(result => {
      if (result.status === 'ok') {
        this.userDataService.setcachedLoginData(this.password, this.username);
        this.success = true;
        this.processingService.bootstrap();
      }
    },           error => {
      this.message.error('Connection to object server refused.');
      this.userDataService.setcachedLoginData('', '');
    });

  }

  public withoutlogin() {
    console.log('username:' + this.username);
  }

}
