import {Component, Inject, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {MatDialog, MatDialogConfig, MatIconRegistry} from '@angular/material';

import {DOCUMENT} from '@angular/common';

import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {SkyboxService} from '../../services/skybox/skybox.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {AnnotationvrService} from '../../services/annotationvr/annotationvr.service';
import {MessageService} from '../../services/message/message.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {LoginComponent} from '../login/login.component';

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  private menuIsEnabled = true;
  private isSingleModel: boolean;
  private isSingleCollection: boolean;

  private editActive = false;
  private collectionsActive = false;

  constructor(
    private message: MessageService,
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    private overlayService: OverlayService,
    private babylonService: BabylonService,
    private annotationService: AnnotationService,
    private mongohandlerService: MongohandlerService,
    private catalogueService: CatalogueService,
    private annotationVRService: AnnotationvrService,
    private loadModelService: LoadModelService,
    public dialog: MatDialog,
    @Inject(DOCUMENT) private document: any) {

    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl('assets/img/google-cardboard.svg'));

    this.babylonService.vrModeIsActive.subscribe(vrModeIsActive => {
      this.menuIsEnabled = !vrModeIsActive;
    });
  }

  public fullscreen: Boolean = false;

  ngOnInit() {

    this.loadModelService.singleModel.subscribe(singleModel => {
      this.isSingleModel = singleModel;
    });

    this.loadModelService.singleCollection.subscribe(singleCollection => {
      this.isSingleCollection = singleCollection;
    });
  }

  public setCamArcRotate() {
    this.cameraService.setCamArcRotate();
  }

  public setCamUniversal() {
    this.cameraService.setCamUniversal();
  }

  public setBackToDefault() {
    this.cameraService.setBackToDefault();
  }


  public setModelQuality(quality: string) {
    if (this.loadModelService.quality !== quality) {
      this.loadModelService.updateModelQuality(quality);
    }
  }

  public quitFullscreen() {
    this.babylonService.getEngine().switchFullscreen(false);
    this.fullscreen = false;
  }

  // VR BUTTON
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

  public saveScene() {
    console.log(this.babylonService.saveScene());
  }

  public editScene(): void {

    if (this.collectionsActive) {
      this.overlayService.toggleCollectionsOverview();
      this.collectionsActive = false;
    }
    this.editActive = this.overlayService.toggleEditor();
  }

  public toggleCollectionsOverview(): void {

    if (this.editActive) {
      this.overlayService.toggleEditor();
      this.editActive = false;
    }
    this.collectionsActive = this.overlayService.toggleCollectionsOverview();
  }

  public takeScreenshot() {
    this.babylonService.createScreenshot();
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

}
