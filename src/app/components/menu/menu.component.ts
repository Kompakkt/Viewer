import {Component, Inject, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {MatIconRegistry} from '@angular/material';

import {DOCUMENT} from '@angular/common';

import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {SkyboxService} from '../../services/skybox/skybox.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {AnnotationvrService} from '../../services/annotationvr/annotationvr.service';

/**
 * @author Zoe Schubert
 */

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  private activeModel;

  constructor(
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
    @Inject(DOCUMENT) private document: any) {

    iconRegistry.addSvgIcon(
      'cardboard',
      sanitizer.bypassSecurityTrustResourceUrl('assets/img/google-cardboard.svg'));
  }

  public fullscreen: Boolean = false;

  ngOnInit() {
    this.catalogueService.Observables.model.subscribe((newModel) => {
      this.activeModel = newModel;
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
    if (this.catalogueService.Observables.quality.source['value'] !== quality) {
      this.catalogueService.updateQuality(quality);
    }
  }

  public quitFullscreen() {
    this.babylonService.getEngine().switchFullscreen(false);
    this.fullscreen = false;
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

  public changeSkybox(skyboxID) {
    this.skyboxService.setSkyboxMaterial(skyboxID);
  }

  public saveScene() {
    console.log(this.babylonService.saveScene());
  }

  public editScene(): void {
    this.overlayService.toggleEditor();
  }

  public toggleCollectionsOverview(): void {
    this.overlayService.toggleCollectionsOverview();
  }

  public takeScreenshot() {
    this.cameraService.createScreenshot();
    this.babylonService.createPreviewScreenshot().then((screenshot) => {
      if (this.activeModel !== null) {
        this.mongohandlerService.updateScreenshot(this.activeModel._id, screenshot).then((result) => {
          // TODO: Find out why picture isn't refreshed once the server sends the result
          this.catalogueService.Observables.models.source['value']
            .filter(model => model._id === this.activeModel._id)
            .map(model => model.preview = result.value.preview);
        });
      }
    });
  }
}
