import { Component, OnInit } from '@angular/core';
import {CameraService} from '../services/camera/camera.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {

  constructor(private cameraService: CameraService) { }

  ngOnInit() {
  }

  public setCamArcRotate() {
    this.cameraService.setCamArcRotate();
  }

  public setCamUniversal() {
    this.cameraService.setCamUniversal();
  }

  public setBackToDefault() {
    // this.cameraService.setBackToDefault();
  }
}
