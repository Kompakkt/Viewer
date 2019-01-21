import {Component, OnInit} from '@angular/core';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {MessageService} from '../../services/message/message.service';
import {OverlayService} from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public username = '';
  public password = '';
  public success = false;
  private isOpen: boolean;

  constructor(private mongohandlerService: MongohandlerService,
              private catalogueService: CatalogueService,
              private message: MessageService,
              private overlayService: OverlayService) {
  }

  ngOnInit() {
    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });
  }

  public login() {
    this.mongohandlerService.login(this.username, this.password).subscribe(result => {
      if (result.status === 'ok') {
        this.success = true;
        this.catalogueService.bootstrap();
      }
    }, error => {
      this.message.error('Connection to object server refused.');
    });

  }

  public withoutlogin() {
    console.log('username:' + this.username);
  }

}
