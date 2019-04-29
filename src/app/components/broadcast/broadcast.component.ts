import {Component, OnInit} from '@angular/core';

import {SocketService} from '../../services/socket/socket.service';

@Component({
  selector: 'app-broadcast',
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.scss'],
})
export class BroadcastComponent implements OnInit {

  public toggleChecked = false;

  constructor(public socketService: SocketService) {
  }

  ngOnInit() {
  }

  public selectedUser(selected: any) {
    this.socketService.sortUser(selected);
  }

  public onSocketToggleChange() {
    if (this.toggleChecked) {
      this.socketService.loginToSocket();
    } else {
      this.socketService.disconnectSocket();
    }
  }
}
