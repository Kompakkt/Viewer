import { Component, OnInit } from '@angular/core';

/*import {MessageService} from '../../../services/message/message.service';
import {ProcessingService} from '../../../services/processing/processing.service';
import {UserdataService} from '../../../services/userdata/userdata.service';*/

@Component({
  selector: 'app-dialog-delete-single-annotation',
  templateUrl: './dialog-delete-single-annotation.component.html',
  styleUrls: ['./dialog-delete-single-annotation.component.scss'],
})
export class DialogDeleteSingleAnnotationComponent implements OnInit {
  public username = '';
  public password = '';
  public success = false;

  /*constructor(private processingService: ProcessingService,
              private message: MessageService,
              private userdataService: UserdataService) { }*/

  ngOnInit() {}

  public login() {
    /*
    if (this.userdataService.cachedUser.username && this.userdataService.cachedUser.password) {
      if (this.userdataService.cachedUser.username === this.username &&
        this.userdataService.cachedUser.password === this.password) {
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
