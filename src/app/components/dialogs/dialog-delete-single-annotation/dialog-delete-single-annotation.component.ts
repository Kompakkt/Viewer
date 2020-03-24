import { Component } from '@angular/core';

/*import {MessageService} from '../../../services/message/message.service';
import {ProcessingService} from '../../../services/processing/processing.service';
import {UserdataService} from '../../../services/userdata/userdata.service';*/

@Component({
  selector: 'app-dialog-delete-single-annotation',
  templateUrl: './dialog-delete-single-annotation.component.html',
  styleUrls: ['./dialog-delete-single-annotation.component.scss'],
})
export class DialogDeleteSingleAnnotationComponent {
  public username = '';
  public password = '';
  public success = false;

  /*constructor(private processing: ProcessingService,
              private message: MessageService,
              private userdata: UserdataService) { }*/

  public login() {
    /*
    if (this.userdata.cachedUser.username && this.userdata.cachedUser.password) {
      if (this.userdata.cachedUser.username === this.username &&
        this.userdata.cachedUser.password === this.password) {
        this.success = true;
      } else {
        this.success = false;
        this.message.error('Sorry, this was not correct.');
      }
    } else {
      this.success = false;
      this.message.error('Sorry, you are not logged in.');
    }*/
  }

  public withoutlogin() {
    console.log('username:' + this.username);
  }
}
