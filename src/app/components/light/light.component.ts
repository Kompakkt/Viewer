/**
 * Light Component
 * @author: Benedikt Mildenberger
 */
import { Component, OnInit } from '@angular/core';
import * as BABYLON from "babylonjs";

@Component({
  selector: 'app-light',
  templateUrl: './light.component.html',
  styleUrls: ['./light.component.css']
})
export class LightComponent implements OnInit {

  public createLight(_scene: BABYLON.Scene) {
    let light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(1,0,1), _scene);
    light.groundColor = new BABYLON.Color3(.1, .1, .1);
  }

  constructor() { }

  ngOnInit() {
  }

}
