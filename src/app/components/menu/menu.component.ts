import {Component, OnInit} from '@angular/core';
import {CameraService} from '../../services/camera/camera.service';

import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {BabylonService} from '../../services/engine/babylon.service';
import {SkyboxService} from '../../services/skybox/skybox.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  constructor(
    private skyboxService: SkyboxService,
    private cameraService: CameraService,
    private babylonService: BabylonService
  ) {}

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

  public consoleLogging() {
    this.cameraService.consoleLogging();
  }

  public fullscreen() {
    this.babylonService.fullscreen();
  }

  public changeSkybox(skyboxID) {
    this.skyboxService.setSkyboxMaterial(skyboxID);
  }
}
