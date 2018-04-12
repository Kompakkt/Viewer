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

    let _alpha = 9;
    let _beta = 1.3;
    let _radius = 100;

    let camera1 = new BABYLON.ArcRotateCamera("camera1", _alpha, _beta, _radius, BABYLON.Vector3.Zero(), _scene);
    camera1.setTarget(BABYLON.Vector3.Zero());
    camera1.attachControl(_canvas, true);
    camera1.keysUp.push(87);
    camera1.keysDown.push(83);
    camera1.keysLeft.push(65);
    camera1.keysRight.push(68);


    let _x = 0;
    let _y = 10;
    let _z = -100;

    let camera2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(_x, _y, _z), _scene);
    camera2.keysUp.push(87);
    camera2.keysDown.push(83);
    camera2.keysLeft.push(65);
    camera2.keysRight.push(68);

    //camera changer
    let _cameraChanger = 0;

    //set camera to orbit cam
    let setCamArcRotate = function(_scene, _canvas) {
      _cameraChanger = 0;
      _scene.activeCamera = camera1;
      camera1.attachControl(_canvas, true);
    };
    let arc = document.getElementById("arc").onclick = function() {
      setCamArcRotate(_scene, _canvas);
    }

    //set camera to first-person/universal cam
    let setCamUniversal = function(_scene, _canvas) {
      _cameraChanger = 1;
      _scene.activeCamera = camera2;
      camera2.attachControl(_canvas, true);
    };
    document.getElementById("unv").onclick = function() {
      setCamUniversal(_scene, _canvas);
    }

    //set camera to defautlt
    let setCamToDefault = function(_scene, _canvas) {
      _scene.activeCamera = camera1;
      camera1.attachControl(_canvas, true);

      var animCamAlpha = new BABYLON.Animation("animCam", "alpha", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

      var keysAlpha = [];
      keysAlpha.push({
        frame: 0,
        value: camera1.alpha
      });
      keysAlpha.push({
        frame: 30,
        value: _alpha
      });
      var animCamBeta = new BABYLON.Animation("animCam", "beta", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

      var keysBeta = [];
      keysBeta.push({
        frame: 0,
        value: camera1.beta
      });
      keysBeta.push({
        frame: 30,
        value: _beta
      });
      var animCamRadius = new BABYLON.Animation("animCam", "radius", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

      var keysRadius = [];
      keysRadius.push({
        frame: 0,
        value: camera1.radius
      });
      keysRadius.push({
        frame: 30,
        value: _radius
      });
      animCamAlpha.setKeys(keysAlpha);
      animCamBeta.setKeys(keysBeta);
      animCamRadius.setKeys(keysRadius);
      camera1.animations.push(animCamAlpha);
      camera1.animations.push(animCamBeta);
      camera1.animations.push(animCamRadius);
      _scene.beginAnimation(camera1, 0, 30, false, 1, function () {

      });
    };
    document.getElementById("def").onclick = function () {
        setCamToDefault(_scene, _canvas);
      }


  }


  constructor() {
  }

  ngOnInit() {
  }
}


