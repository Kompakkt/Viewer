import {Component, OnInit} from '@angular/core';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  public username = '';
  public password = '';

  constructor(private mongohandlerService: MongohandlerService) {
  }


  ngOnInit() {
  }


  public login() {
    console.log('username:' + this.username);
    this.mongohandlerService.login(this.username, this.password);
  }

  public withoutlogin() {
    console.log('username:' + this.username);

  }

}
