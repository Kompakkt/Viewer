import {Component, Inject, OnInit} from '@angular/core';

import {DOCUMENT} from '@angular/common';

import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {SkyboxService} from '../../services/skybox/skybox.service';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import {AnnotationService} from '../../services/annotation/annotation.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  constructor(
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    private sidenavService: SidenavService,
    private babylonService: BabylonService,
    private annotationService: AnnotationService,
    @Inject(DOCUMENT) private document: any
  ) {
  }

  public fullscreen: Boolean = false;
  public pickable: Boolean = false;

  ngOnInit() {
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

  public editScene() {

    this.sidenavService.toggle();

    if (this.pickable) {
      this.annotationService.pickableModel('Texture_0', false);
      this.pickable = false;
    } else {
      this.annotationService.pickableModel('Texture_0', true);
      this.pickable = true;
    }
  }
}
