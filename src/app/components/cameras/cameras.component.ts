import { Component, OnInit } from '@angular/core';
import { ViewChild } from '@angular/core';

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
    camera1.panningSensibility = 25;
    camera1.upperRadiusLimit = 230;


    let _x = camera1.position.x;
    let _y = camera1.position.y;
    let _z = camera1.position.z;

    let camera2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(_x, _y, _z), _scene);
    camera2.keysUp.push(87);
    camera2.keysDown.push(83);
    camera2.keysLeft.push(65);
    camera2.keysRight.push(68);
    camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
    camera2.checkCollisions = true;
    camera2.setTarget(BABYLON.Vector3.Zero());

    let _xRot = camera2.rotation.x;
    let _yRot = camera2.rotation.y;

    //camera changer
    let _camChanger = 0;

    //set camera to orbit cam
    let setCamArcRotate = function(_scene, _canvas) {
      camera1 = new BABYLON.ArcRotateCamera("camera1",null,null,null, new BABYLON.Vector3(camera2.position.x, camera2.position.y, camera2.position.z), _scene);
      camera1.keysUp.push(87);
      camera1.keysDown.push(83);
      camera1.keysLeft.push(65);
      camera1.keysRight.push(68);
      camera1.panningSensibility = 25;
      camera1.upperRadiusLimit = 200;
      camera1.setTarget(BABYLON.Vector3.Zero());
      _scene.activeCamera = camera1;
      camera1.attachControl(_canvas, true);
    };

    let arc = document.getElementById("arc").onclick = function() {
      if(_camChanger == 1) {
        _camChanger = 0;
        setCamArcRotate(_scene,_canvas);
        console.log(camera1.alpha)
        console.log(camera1.beta)
        console.log(camera1.radius)
      }
      else {}
    }

    //set camera to first-person/universal cam
    let setCamUniversal = function(_scene, _canvas) {
      camera2 = new BABYLON.UniversalCamera("camera2", new BABYLON.Vector3(camera1.position.x, camera1.position.y, camera1.position.z), _scene);
      camera2.keysUp.push(87);
      camera2.keysDown.push(83);
      camera2.keysLeft.push(65);
      camera2.keysRight.push(68);
      camera2.setTarget(BABYLON.Vector3.Zero());
      _scene.activeCamera = camera2;
      camera2.attachControl(_canvas, true);
      camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
      camera2.checkCollisions = true;
    };
    document.getElementById("unv").onclick = function() {
      if(_camChanger == 0) {
        _camChanger = 1;
        setCamUniversal(_scene, _canvas);
      }
      else {}
    }

    //set camera to defautlt
    let setArcCamToDefault = function(_scene, _canvas) {
      _scene.activeCamera = camera1;
        camera1.attachControl(_canvas, true);

        var animCamAlpha = new BABYLON.Animation("animCam", "alpha", 30,
          BABYLON.Animation.ANIMATIONTYPE_FLOAT,
          BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

        var backAlpha = [];
        backAlpha.push({
          frame: 0,
          value: camera1.alpha
        });
        backAlpha.push({
          frame: 30,
          value: _alpha
        });
        var animCamBeta = new BABYLON.Animation("animCam", "beta", 30,
          BABYLON.Animation.ANIMATIONTYPE_FLOAT,
          BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

        var backBeta = [];
        backBeta.push({
          frame: 0,
          value: camera1.beta
        });
        backBeta.push({
          frame: 30,
          value: _beta
        });
        var animCamRadius = new BABYLON.Animation("animCam", "radius", 30,
          BABYLON.Animation.ANIMATIONTYPE_FLOAT,
          BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

        var backRadius = [];
        backRadius.push({
          frame: 0,
          value: camera1.radius
        });
        backRadius.push({
          frame: 30,
          value: _radius
        });

        animCamAlpha.setKeys(backAlpha);
        animCamBeta.setKeys(backBeta);
        animCamRadius.setKeys(backRadius);

        camera1.animations.push(animCamAlpha);
        camera1.animations.push(animCamBeta);
        camera1.animations.push(animCamRadius);

        camera1.setTarget(BABYLON.Vector3.Zero());

        _scene.beginAnimation(camera1, 0, 30, false, 1, function () {

        });
      }

    let setUnvCamToDefault = function(_scene, _canvas) {

      var setBackAnm = new BABYLON.Animation("camPos", "position", 30,
        BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

      var setBackPos = [{
        frame : 0,
        value : new BABYLON.Vector3(camera2.position.x, camera2.position.y, camera2.position.z)
      }, {
        frame : 30,
        value : new BABYLON.Vector3(_x,_y,_z)
      }];

      var setBackRotXAnm = new BABYLON.Animation("camPos", "rotation.x", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

      var setBackRotX = [{
        frame : 15,
        value : camera2.rotation.x
      }, {
        frame : 30,
        value : _xRot
      }];

      var setBackRotYAnm = new BABYLON.Animation("camPos", "rotation.y", 30,
        BABYLON.Animation.ANIMATIONTYPE_FLOAT,
        BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

      var setBackRotY = [{
        frame : 15,
        value : camera2.rotation.y
      }, {
        frame : 30,
        value : _yRot
      }];



      setBackAnm.setKeys(setBackPos)
      setBackRotXAnm.setKeys(setBackRotX)
      setBackRotYAnm.setKeys(setBackRotY)

      camera2.animations.push(setBackAnm)
      camera2.animations.push(setBackRotXAnm)
      camera2.animations.push(setBackRotYAnm)

      _scene.beginAnimation(camera2, 0, 30, false, 1, function () {

      });

    };

    document.getElementById("def").onclick = function () {
      if(_camChanger == 0) {
        setArcCamToDefault(_scene, _canvas);
      }
      else if(_camChanger == 1){
        setUnvCamToDefault(_scene, _canvas);
        console.log(camera2.rotation.x)
        console.log(camera2.rotation.y)
      }
      }

      //bugfix
    setArcCamToDefault(_scene, _canvas);
    setUnvCamToDefault(_scene, _canvas);

    //cam collider
    //sides
    let plane2 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500}, _scene);
        plane2.visibility = 0;
    let plane3 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500}, _scene);
        plane3.rotation.y = 90 * Math.PI / 180;
        plane3.visibility = 0;
    let plane4 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500}, _scene);
        plane4.rotation.x = Math.PI;
        plane4.visibility = 0;
    let plane5 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500}, _scene);
        plane5.rotation.y = 270 * Math.PI / 180;
        plane5.visibility = 0;

    //lower
    let plane1 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500}, _scene);
      plane1.rotation.x = 90 * Math.PI / 180;
      plane1.visibility = 0;

    //upper
    let plane6 = BABYLON.MeshBuilder.CreatePlane("plane", {height: 500, width: 500,}, _scene);
        plane6.rotation.x = 270 * Math.PI / 180;
        plane6.visibility = 0;

    plane1.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane2.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane3.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane4.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane5.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane6.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));


    _scene.collisionsEnabled = true;
    plane1.checkCollisions = true;
    plane2.checkCollisions = true;
    plane3.checkCollisions = true;
    plane4.checkCollisions = true;
    plane5.checkCollisions = true;
    plane6.checkCollisions = true;



  }

  constructor() {
  }

  ngOnInit() {
  }
}


