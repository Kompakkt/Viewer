import {Component, OnInit} from '@angular/core';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {MessageService} from '../../services/message/message.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public username = '';
  public password = '';
  public success = false;

  constructor(private mongohandlerService: MongohandlerService,
              private catalogueService: CatalogueService,
              private message: MessageService) {
  }


  ngOnInit() {
  }


  public login() {
    console.log('username:' + this.username);
    this.mongohandlerService.login(this.username, this.password).subscribe(result => {
        if (result.status === 'ok') {
          this.catalogueService.bootstrap();
          this.success = true;
        }
      }, error => {
        this.message.error('Connection to object server refused.');
      });

  }

  public withoutlogin() {
    console.log('username:' + this.username);

  }

}
