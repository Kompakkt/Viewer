import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig, MatIconRegistry } from '@angular/material';
import { DomSanitizer } from '@angular/platform-browser';

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
  private firstAttempt = true;
  // available quality of entity
  public high = '';
  public medium = '';
  public low = '';

  public fullscreenCapable = document.fullscreenEnabled;

  constructor(
    public iconRegistry: MatIconRegistry,
    public sanitizer: DomSanitizer,
    public overlayService: OverlayService,
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    public dialog: MatDialog,
    public userDataService: UserdataService,
  ) {
    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/img/google-cardboard.svg',
      ),
    );

    this.userDataService.isUserAuthenticatedObservable.subscribe(
      state => (this.isAuthenticated = state),
    );

    this.userDataService.isUserAuthenticatedObservable.subscribe(isLoggedIn => {
      this.isAuthenticated = isLoggedIn;
    });

    this.processingService.Observables.actualEntity.subscribe(entity => {
      if (entity.processed) {
        this.high = entity.processed.high ? entity.processed.high : '';
        this.medium = entity.processed.medium ? entity.processed.medium : '';
        this.low = entity.processed.low ? entity.processed.low : '';
      }
    });
  }

  ngOnInit() {
    document.addEventListener('fullscreenchange', _ => {
      if (
        !document.fullscreen &&
        this.babylonService.getEngine().isFullscreen
      ) {
        this.babylonService.getEngine().switchFullscreen(false);
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
    if (isFullscreen) {
      this.babylonService.getEngine().switchFullscreen(false);
    } else {
      _tf()
        .then(() => {})
        .catch(e => console.error(e));
    }
  }

  public loginAttempt() {
    this.isAuthenticated
      ? this.processingService.bootstrap()
      : this.firstAttempt
      ? this.openLoginDialog()
      : this.processingService.bootstrap();
  }

  private openLoginDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    this.firstAttempt = false;
    this.dialog
      .open(LoginComponent, dialogConfig)
      .afterClosed()
      .toPromise()
      .then(() => this.loginAttempt())
      .catch(e => {
        console.error(e);
        this.loginAttempt();
      });
  }
}
