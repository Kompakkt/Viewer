import {DOCUMENT} from '@angular/common';
import {AfterViewInit, Component, Inject, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatIconRegistry} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationvrService} from '../../services/annotationvr/annotationvr.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {MessageService} from '../../services/message/message.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {SkyboxService} from '../../services/skybox/skybox.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit, AfterViewInit {

  public fullscreen = false;

  public isLoggedIn: boolean;

  public isShowCatalogue = true;

  public loaded = false;

  public high = '';
  public medium = '';
  public low = '';

  constructor(
    private message: MessageService,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    public overlayService: OverlayService,
    public babylonService: BabylonService,
    private annotationService: AnnotationService,
    private mongohandlerService: MongohandlerService,
    public catalogueService: CatalogueService,
    private annotationVRService: AnnotationvrService,
    public loadModelService: LoadModelService,
    public dialog: MatDialog,
    @Inject(DOCUMENT) private document: any) {

    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl('assets/img/google-cardboard.svg'));
  }

  ngOnInit() {

    this.catalogueService.showCatalogue.subscribe(showCatalogue => {
      if (showCatalogue) {
        this.isShowCatalogue = showCatalogue;
      }
    });

    this.catalogueService.loggedIn.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

  }

  ngAfterViewInit() {

    this.loadModelService.loaded.subscribe(loaded => {
      this.loaded = loaded;
      const currentModel = this.loadModelService.getCurrentModel();
      if (currentModel && currentModel.processed) {
        this.high = this.loadModelService.getCurrentModel().processed.high;
        this.medium = this.loadModelService.getCurrentModel().processed.medium;
        this.low = this.loadModelService.getCurrentModel().processed.low;
      }
    });

  }

  /*
  public setCamArcRotate() {
    this.cameraService.setCamArcRotate();
  }

  public setCamUniversal() {
    this.cameraService.setCamUniversal();
  }*/

  public setBackToDefault() {
    this.cameraService.backToDefault();
  }

  public setModelQuality(quality: string) {
    this.loadModelService.updateModelQuality(quality);
  }

  public quitFullscreen() {
    this.babylonService.getEngine()
      .switchFullscreen(false);
    this.fullscreen = false;
  }

  public pressVrButton() {
    this.cameraService.createVrHelperInCamera();
  }

  public enterFullscreen(): void {

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

  /*
  public changeSkybox(skyboxID) {
    this.skyboxService.setSkyboxMaterial(skyboxID);
  }*/

  public takeScreenshot() {
    this.babylonService.createScreenshot();
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

  public logout() {
    this.mongohandlerService.logout()
      .then(() => {
        this.catalogueService.bootstrap();
      });
  }

}
