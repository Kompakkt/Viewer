import {Component, OnInit} from '@angular/core';
import {CameraService} from '../services/camera/camera.service';

import {BabylonService} from '../services/engine/babylon.service';
import {SkyboxService} from '../services/skybox/skybox.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  public skyboxChanger: number;

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

  public fullscreen() {
    this.babylonService.fullscreen();
  }

  public changeSkybox() {
    this.skyboxService.insert = this.skyboxChanger;
    this.skyboxService.setSkyboxMaterial();
  }
}
