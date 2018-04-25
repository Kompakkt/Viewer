import {Component, OnInit} from '@angular/core';
import {CameraService} from '../services/camera/camera.service';

import {BabylonService} from '../services/engine/babylon.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  constructor(private cameraService: CameraService,
              private babylonService: BabylonService) {
  }

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

}
