import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material';

import { BabylonService } from '../../services/babylon/babylon.service';
import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { LoginComponent } from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
  // external
  public isAuthenticated = false;
  // available quality of entity
  public high = '';
  public medium = '';
  public low = '';
  public showLogin = true;
  public fullscreen = false;

  public fullscreenCapable = document.fullscreenEnabled;

  constructor(
    public overlayService: OverlayService,
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    public dialog: MatDialog,
    public userDataService: UserdataService,
  ) {

    this.userDataService.isUserAuthenticatedObservable.subscribe(
      state => (this.isAuthenticated = state),
    );

    this.processingService.Observables.actualEntity.subscribe(entity => {
      if (entity.processed.low !== entity.processed.medium) {
        this.low = entity.processed.low;
      }
      if (entity.processed.medium !== entity.processed.low) {
        this.medium = entity.processed.medium;
      }
      if (entity.processed.high !== entity.processed.medium) {
        this.high = entity.processed.high;
      }
    });
  }

  ngOnInit() {
    document.addEventListener('fullscreenchange', _ => {
      if (
        !document.fullscreen &&
        this.babylonService.getEngine().isFullscreen
      ) {
        this.babylonService.getEngine()
            .switchFullscreen(false);
      }
    });
  }

  toggleFullscreen() {
    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    const _tf = (): Promise<void> => {
      const _docEl = document.documentElement as any;
      return _docEl.mozRequestFullScreen
        ? _docEl.mozRequestFullScreen()
        : _docEl.webkitRequestFullscreen
        ? _docEl.webkitRequestFullscreen()
        : _docEl.requestFullscreen();
    };
    const isFullscreen = document.fullscreen;
    // TODO: not working if user exit fullscreen with esc
    this.fullscreen = !isFullscreen;
    if (isFullscreen) {
      this.babylonService.getEngine()
          .switchFullscreen(false);
    } else {
      _tf()
        .then(() => {})
        .catch(e => console.error(e));
    }
  }

  private loginAttempt() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    this.dialog
      .open(LoginComponent, dialogConfig)
      .afterClosed()
      .toPromise()
      .then(() => this.isAuthenticated && this.processingService.bootstrap())
      .catch(e => {
        console.error(e);
        this.loginAttempt();
      });
  }
}
