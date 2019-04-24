import {Component, OnInit} from '@angular/core';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {SocketService} from '../../services/socket/socket.service';

@Component({
  selector: 'app-active-users',
  templateUrl: './active-users.component.html',
  styleUrls: ['./active-users.component.scss'],
})
export class ActiveUsersComponent implements OnInit {

  constructor(public socketService: SocketService,
              public annotationService: AnnotationService) {
  }

  ngOnInit() {
  }

  public selectedUser(selected: any) {
    console.log('AUSGEWÄHLT', selected);
    this.socketService.sortUser(selected);
  }
}
