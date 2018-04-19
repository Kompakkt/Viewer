import {Component, OnInit} from '@angular/core';
import {ViewChild} from '@angular/core';

import * as BABYLON from 'babylonjs';
import {ImportService} from '../../services/import/import.service';

@Component({
  selector: 'app-cameras',
  templateUrl: './cameras.component.html',
  styleUrls: ['./cameras.component.css']
})
export class CamerasComponent implements OnInit {

  constructor() {
  }

  public createCamera(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    const alpha = 9;
    const beta = 1.3;
    const radius = 100;

    let camera1 = new BABYLON.ArcRotateCamera('camera1', alpha, beta, radius, BABYLON.Vector3.Zero(), scene);
    camera1.setTarget(BABYLON.Vector3.Zero());
    camera1.attachControl(canvas, true);
    camera1.keysUp.push(87);
    camera1.keysDown.push(83);
    camera1.keysLeft.push(65);
    camera1.keysRight.push(68);
    camera1.panningSensibility = 25;
    camera1.upperRadiusLimit = 230;


    const x = camera1.position.x;
    const y = camera1.position.y;
    const z = camera1.position.z;

    let camera2 = new BABYLON.UniversalCamera('camera2', new BABYLON.Vector3(x, y, z), scene);
    camera2.keysUp.push(87);
    camera2.keysDown.push(83);
    camera2.keysLeft.push(65);
    camera2.keysRight.push(68);
    camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
    camera2.checkCollisions = true;
    camera2.setTarget(BABYLON.Vector3.Zero());

    const xRot = camera2.rotation.x;
    const yRot = camera2.rotation.y;

    //camera changer
    let camChanger = 0;

    canvas.focus();

    this.setCamArcRotate(scene, canvas, camera1, camera2, camChanger);
    this.setCamUniversal(scene, canvas, camera1, camera2, camChanger);

    this.setCamArcRotateDefault(scene, canvas, camera1, camera2, camChanger, alpha, beta, radius);
    this.setCamUniversalDefault(scene, canvas, camera1, camera2, camChanger, x, y, z, xRot, yRot);

    this.setBackToDefault(scene, canvas, camera1, camera2, camChanger, alpha, beta, radius, x, y, z, xRot, yRot);

    this.setCamCollider(scene);
  }

  ngOnInit() {
  }

  private setCamArcRotate(scene: BABYLON.Scene, canvas: HTMLCanvasElement,
                          camera1: BABYLON.ArcRotateCamera, camera2: BABYLON.UniversalCamera, camChanger: number) {
console.log("works")
    if(camChanger === 1){
      console.log("works")
      camera1 = new BABYLON.ArcRotateCamera('camera1', 0, 0, 0,
        new BABYLON.Vector3(camera2.position.x, camera2.position.y, camera2.position.z), scene);
      camera1.keysUp.push(87);
      camera1.keysDown.push(83);
      camera1.keysLeft.push(65);
      camera1.keysRight.push(68);
      camera1.panningSensibility = 25;
      camera1.upperRadiusLimit = 200;
      camera1.setTarget(BABYLON.Vector3.Zero());
      scene.activeCamera = camera1;
      camera1.attachControl(canvas, true);

      canvas.focus();
      camChanger = 0;
    }
    else{}
  }

  private setCamArcRotateDefault(scene: BABYLON.Scene, canvas: HTMLCanvasElement,
                          camera1: BABYLON.ArcRotateCamera, camera2: BABYLON.UniversalCamera, camChanger: number,
                          alpha: number, beta: number, radius: number) {

    scene.activeCamera = camera1;
    camera1.attachControl(canvas, true);

    const animCamAlpha = new BABYLON.Animation('animCam', 'alpha', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const backAlpha = [];
    backAlpha.push({
      frame: 0,
      value: camera1.alpha
    });
    backAlpha.push({
      frame: 30,
      value: alpha
    });
    const animCamBeta = new BABYLON.Animation('animCam', 'beta', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const backBeta = [];
    backBeta.push({
      frame: 0,
      value: camera1.beta
    });
    backBeta.push({
      frame: 30,
      value: beta
    });
    const animCamRadius = new BABYLON.Animation('animCam', 'radius', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const backRadius = [];
    backRadius.push({
      frame: 0,
      value: camera1.radius
    });
    backRadius.push({
      frame: 30,
      value: radius
    });

    animCamAlpha.setKeys(backAlpha);
    animCamBeta.setKeys(backBeta);
    animCamRadius.setKeys(backRadius);

    camera1.animations.push(animCamAlpha);
    camera1.animations.push(animCamBeta);
    camera1.animations.push(animCamRadius);

    camera1.setTarget(BABYLON.Vector3.Zero());

    scene.beginAnimation(camera1, 0, 30, false, 1, function () {
    });
  }

  private setCamUniversal(scene: BABYLON.Scene, canvas: HTMLCanvasElement,
                          camera1: BABYLON.ArcRotateCamera, camera2: BABYLON.UniversalCamera, camChanger: number) {
    console.log("works")

      console.log("works")
      camera2 = new BABYLON.UniversalCamera('camera2',
        new BABYLON.Vector3(camera1.position.x, camera1.position.y, camera1.position.z), scene);
      camera2.keysUp.push(87);
      camera2.keysDown.push(83);
      camera2.keysLeft.push(65);
      camera2.keysRight.push(68);
      camera2.setTarget(BABYLON.Vector3.Zero());
      scene.activeCamera = camera2;
      camera2.attachControl(canvas, true);
      camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
      camera2.checkCollisions = true;

      canvas.focus();
      camChanger = 1;

  }

  private setCamUniversalDefault(scene: BABYLON.Scene, canvas: HTMLCanvasElement,
                          camera1: BABYLON.ArcRotateCamera, camera2: BABYLON.UniversalCamera, camChanger: number,
                          x: number, y: number, z: number, xRot: number, yRot: number) {

    const setBackAnm = new BABYLON.Animation('camPos', 'position', 30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    const setBackPos = [{
      frame: 0,
      value: new BABYLON.Vector3(camera2.position.x, camera2.position.y, camera2.position.z)
    }, {
      frame: 30,
      value: new BABYLON.Vector3(x, y, z)
    }];

    const setBackRotXAnm = new BABYLON.Animation('camPos', 'rotation.x', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotX = [{
      frame: 15,
      value: camera2.rotation.x
    }, {
      frame: 30,
      value: xRot
    }];

    const setBackRotYAnm = new BABYLON.Animation('camPos', 'rotation.y', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotY = [{
      frame: 15,
      value: camera2.rotation.y
    }, {
      frame: 30,
      value: yRot
    }];

    setBackAnm.setKeys(setBackPos);
    setBackRotXAnm.setKeys(setBackRotX);
    setBackRotYAnm.setKeys(setBackRotY);

    camera2.animations.push(setBackAnm);
    camera2.animations.push(setBackRotXAnm);
    camera2.animations.push(setBackRotYAnm);

    scene.beginAnimation(camera2, 0, 30, false, 1, function () {

    });
  }

  private setCamCollider(scene: BABYLON.Scene) {
    //sides
    const plane2 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, scene);
    plane2.visibility = 0;
    const plane3 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, scene);
    plane3.rotation.y = 90 * Math.PI / 180;
    plane3.visibility = 0;
    const plane4 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, scene);
    plane4.rotation.x = Math.PI;
    plane4.visibility = 0;
    const plane5 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, scene);
    plane5.rotation.y = 270 * Math.PI / 180;
    plane5.visibility = 0;

    // lower
    const plane1 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, scene);
    plane1.rotation.x = 90 * Math.PI / 180;
    plane1.visibility = 0;

    // upper
    const plane6 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500,}, scene);
    plane6.rotation.x = 270 * Math.PI / 180;
    plane6.visibility = 0;

    plane1.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane2.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane3.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane4.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane5.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane6.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));

    scene.collisionsEnabled = true;
    plane1.checkCollisions = true;
    plane2.checkCollisions = true;
    plane3.checkCollisions = true;
    plane4.checkCollisions = true;
    plane5.checkCollisions = true;
    plane6.checkCollisions = true;
  }

  private setBackToDefault(scene: BABYLON.Scene, canvas: HTMLCanvasElement, camera1: BABYLON.ArcRotateCamera,
                    camera2: BABYLON.UniversalCamera, camChanger: number, alpha: number, beta: number, radius: number,
                    x: number, y: number, z: number, xRot: number, yRot: number) {

    canvas.focus();
    if (camChanger === 0) {
      this.setCamArcRotateDefault(scene, canvas, camera1, camera2, camChanger, alpha, beta, radius);
    }
    else if (camChanger === 1) {
      this.setCamUniversalDefault(scene, canvas, camera1, camera2, camChanger, x, y, z, xRot, yRot);
    }
  }
}


