import {DOCUMENT} from '@angular/common';
import {Component, Inject, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';

import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {

  // external
  public isLoggedIn: boolean;
  public isVRModeActive: boolean;
    // available quality of object
  public high = '';
  public medium = '';
  public low = '';

  // internal
  public fullscreen: boolean;

  constructor(
    public iconRegistry: MatIconRegistry,
    public sanitizer: DomSanitizer,
    public cameraService: CameraService,
    public overlayService: OverlayService,
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    private mongohandlerService: MongohandlerService,
    public dialog: MatDialog,
    @Inject(DOCUMENT) private document: any) {

    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl('assets/img/google-cardboard.svg'));
  }

  ngOnInit() {

    this.fullscreen = false;
    this.isVRModeActive = this.babylonService.isVRModeActive;

    this.babylonService.vrModeIsActive.subscribe(isActive => {
      this.isVRModeActive = isActive;
    });

    this.processingService.loggedIn.subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });

    this.processingService.Observables.actualModel.subscribe(model => {
      if (model.processed) {
        this.high = (model.processed.high) ? model.processed.high : '';
        this.medium = (model.processed.medium) ? model.processed.medium : '';
        this.low = (model.processed.low) ? model.processed.low : '';
      }
    });

  }

  // TODO fullscreen = falls if exit fullscreen by hitting esc Button
  enterFullscreen(): void {

    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    const element = this.document.documentElement;

    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
    } else {
      this.fullscreen = false;
      return;
    }

    this.fullscreen = true;
  }

  quitFullscreen() {
    this.babylonService.getEngine()
      .switchFullscreen(false);
    this.fullscreen = false;
  }

  loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

  logout() {
    this.mongohandlerService.logout()
      .then(() => {
        this.processingService.bootstrap();
      });
  }

}
