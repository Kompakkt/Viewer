import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material';

import {AnnotationService} from "../../services/annotation/annotation.service";
// tslint:disable-next-line:max-line-length
import { DialogInviteBroadcastingComponent } from '../dialogs/dialog-invite-broadcasting/dialog-invite-broadcasting.component';

@Component({
  selector: 'app-broadcast',
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.scss'],
})
export class BroadcastComponent implements OnInit {
  public toggleChecked = false;

  constructor(public annotationService: AnnotationService, public dialog: MatDialog) {}

  ngOnInit() {}

  public selectedUser(selected: any) {
    this.annotationService.sortUser(selected);
  }

  public onSocketToggleChange() {
    if (this.toggleChecked) {
      this.annotationService.loginToSocket();
    } else {
      this.annotationService.disconnectSocket();
    }
  }

  public inviteCollaborators() {
    this.dialog.open(DialogInviteBroadcastingComponent);
  }
}
