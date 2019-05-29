import {Component, OnInit} from '@angular/core';
import {MatDialog} from '@angular/material';

import {SocketService} from '../../services/socket/socket.service';
import {DialogInviteBroadcastingComponent} from '../dialogs/dialog-invite-broadcasting/dialog-invite-broadcasting.component';
import {DialogMeshsettingsComponent} from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

@Component({
  selector: 'app-broadcast',
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.scss'],
})
export class BroadcastComponent implements OnInit {

  public toggleChecked = false;

  constructor(public socketService: SocketService,
              public dialog: MatDialog) {
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

  public inviteCollaborators() {
    this.dialog.open(DialogInviteBroadcastingComponent);
  }
}
