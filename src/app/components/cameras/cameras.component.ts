import { Component, OnInit } from '@angular/core';

import * as BABYLON from "babylonjs";
import {ImportService} from "../../services/import/import.service";

@Component({
  selector: 'app-cameras',
  templateUrl: './cameras.component.html',
  styleUrls: ['./cameras.component.css']
})
export class CamerasComponent implements OnInit {

  public createCamera(_scene, _canvas) {

    let camera1 = new BABYLON.ArcRotateCamera("camera1", 0, 0.8, 100, BABYLON.Vector3.Zero(), _scene);
    camera1.setTarget(BABYLON.Vector3.Zero());
    camera1.attachControl(_canvas, true);

    let camera2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(0, 20, -50), _scene);

  /*
    _scene.onDispose =()=>{
      if (document.getElementById('buttonbox')) {
        document.getElementById('buttonbox').parentNode.removeChild(document.getElementById('buttonbox'));
      }
    }

//-----------------------------------------------------------
// camera activators

    let setCamArcRotate = function(_scene, _canvas) {
      _scene.activeCamera = camera1;
      console.log("!works")
      camera1.attachControl(_canvas, true);
    };
    let setCamUniversal = function(_scene, _canvas) {
      _scene.activeCamera = camera2;
      camera2.attachControl(_canvas, true);
    };
  */
  }

  constructor() {
  }

  ngOnInit() {
  }
}


