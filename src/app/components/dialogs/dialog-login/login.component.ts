import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';

import {CatalogueService} from '../../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../../services/load-model/load-model.service';
import {MessageService} from '../../../services/message/message.service';
import {MongohandlerService} from '../../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../../services/overlay/overlay.service';
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
              private catalogueService: CatalogueService,
              private message: MessageService,
              private overlayService: OverlayService,
              private userDataService: UserdataService,
              private loadModelService: LoadModelService) {
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
        this.catalogueService.bootstrap();
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
