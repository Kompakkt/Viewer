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

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private camera1: BABYLON.ArcRotateCamera;
  private camera2: BABYLON.UniversalCamera;
  private camChanger: number;

  constructor() {
  }


  public createCamera(scene: BABYLON.Scene, canvas: HTMLCanvasElement) {

    const alpha = 9;
    const beta = 1.3;
    const radius = 100;

    this.canvas = canvas;
    this.scene = scene;

    this.camera1 = new BABYLON.ArcRotateCamera('camera1', alpha, beta, radius, BABYLON.Vector3.Zero(), this.scene);
    this.camera1.setTarget(BABYLON.Vector3.Zero());
    this.camera1.attachControl(canvas, true);
    this.camera1.keysUp.push(87);
    this.camera1.keysDown.push(83);
    this.camera1.keysLeft.push(65);
    this.camera1.keysRight.push(68);
    this.camera1.panningSensibility = 25;
    this.camera1.upperRadiusLimit = 230;

    const x = this.camera1.position.x;
    const y = this.camera1.position.y;
    const z = this.camera1.position.z;

    this.camera2 = new BABYLON.UniversalCamera('camera2', new BABYLON.Vector3(x, y, z), this.scene);
    this.camera2.keysUp.push(87);
    this.camera2.keysDown.push(83);
    this.camera2.keysLeft.push(65);
    this.camera2.keysRight.push(68);
    this.camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
    this.camera2.checkCollisions = true;
    this.camera2.setTarget(BABYLON.Vector3.Zero());

    const xRot = this.camera2.rotation.x;
    const yRot = this.camera2.rotation.y;

    // camera changer
    this.camChanger = 0;

    this.canvas.focus();

    this.setCamArcRotateDefault(alpha, beta, radius);
    this.setCamUniversalDefault(x, y, z, xRot, yRot);

    this.setBackToDefault(alpha, beta, radius, x, y, z, xRot, yRot);

    this.setCamCollider();
  }

  ngOnInit() {
  }

  private setCamArcRotate() {

    if (this.camChanger === 1) {

      console.log('works');

      this.camera1 = new BABYLON.ArcRotateCamera('camera1', 0, 0, 0,
        new BABYLON.Vector3(this.camera2.position.x, this.camera2.position.y, this.camera2.position.z), this.scene);

      this.camera1.keysUp.push(87);
      this.camera1.keysDown.push(83);
      this.camera1.keysLeft.push(65);
      this.camera1.keysRight.push(68);
      this.camera1.panningSensibility = 25;
      this.camera1.upperRadiusLimit = 200;
      this.camera1.setTarget(BABYLON.Vector3.Zero());
      this.scene.activeCamera = this.camera1;
      this.camera1.attachControl(this.canvas, true);

      this.canvas.focus();
      this.camChanger = 0;
    }
  }

  private setCamArcRotateDefault(alpha: number, beta: number, radius: number) {

    this.scene.activeCamera = this.camera1;
    this.camera1.attachControl(this.canvas, true);

    const animCamAlpha = new BABYLON.Animation('animCam', 'alpha', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const backAlpha = [];
    backAlpha.push({
      frame: 0,
      value: this.camera1.alpha
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
      value: this.camera1.beta
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
      value: this.camera1.radius
    });
    backRadius.push({
      frame: 30,
      value: radius
    });

    animCamAlpha.setKeys(backAlpha);
    animCamBeta.setKeys(backBeta);
    animCamRadius.setKeys(backRadius);

    this.camera1.animations.push(animCamAlpha);
    this.camera1.animations.push(animCamBeta);
    this.camera1.animations.push(animCamRadius);

    this.camera1.setTarget(BABYLON.Vector3.Zero());

    this.scene.beginAnimation(this.camera1, 0, 30, false, 1, function () {
    });
  }

  public setCamUniversal() {

    console.log('works');

    if (this.camChanger === 0) {

      console.log('works');
      this.camera2 = new BABYLON.UniversalCamera('camera2',
        new BABYLON.Vector3(this.camera1.position.x, this.camera1.position.y, this.camera1.position.z), this.scene);
      this.camera2.keysUp.push(87);
      this.camera2.keysDown.push(83);
      this.camera2.keysLeft.push(65);
      this.camera2.keysRight.push(68);
      this.camera2.setTarget(BABYLON.Vector3.Zero());
      this.scene.activeCamera = this.camera2;
      this.camera2.attachControl(this.canvas, true);
      this.camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10);
      this.camera2.checkCollisions = true;

      this.canvas.focus();
      this.camChanger = 1;
    }
  }

  private setCamUniversalDefault(x: number, y: number, z: number, xRot: number, yRot: number) {

    const setBackAnm = new BABYLON.Animation('camPos', 'position', 30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    const setBackPos = [{
      frame: 0,
      value: new BABYLON.Vector3(this.camera2.position.x, this.camera2.position.y, this.camera2.position.z)
    }, {
      frame: 30,
      value: new BABYLON.Vector3(x, y, z)
    }];

    const setBackRotXAnm = new BABYLON.Animation('camPos', 'rotation.x', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotX = [{
      frame: 15,
      value: this.camera2.rotation.x
    }, {
      frame: 30,
      value: xRot
    }];

    const setBackRotYAnm = new BABYLON.Animation('camPos', 'rotation.y', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotY = [{
      frame: 15,
      value: this.camera2.rotation.y
    }, {
      frame: 30,
      value: yRot
    }];

    setBackAnm.setKeys(setBackPos);
    setBackRotXAnm.setKeys(setBackRotX);
    setBackRotYAnm.setKeys(setBackRotY);

    this.camera2.animations.push(setBackAnm);
    this.camera2.animations.push(setBackRotXAnm);
    this.camera2.animations.push(setBackRotYAnm);

    this.scene.beginAnimation(this.camera2, 0, 30, false, 1, function () {

    });
  }

  private setCamCollider() {

    // sides
    const plane2 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, this.scene);
    plane2.visibility = 0;
    const plane3 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, this.scene);
    plane3.rotation.y = 90 * Math.PI / 180;
    plane3.visibility = 0;
    const plane4 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, this.scene);
    plane4.rotation.x = Math.PI;
    plane4.visibility = 0;
    const plane5 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, this.scene);
    plane5.rotation.y = 270 * Math.PI / 180;
    plane5.visibility = 0;

    // lower
    const plane1 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500}, this.scene);
    plane1.rotation.x = 90 * Math.PI / 180;
    plane1.visibility = 0;

    // upper
    const plane6 = BABYLON.MeshBuilder.CreatePlane('plane', {height: 500, width: 500,}, this.scene);
    plane6.rotation.x = 270 * Math.PI / 180;
    plane6.visibility = 0;

    plane1.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane2.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane3.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane4.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane5.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));
    plane6.setPositionWithLocalVector(new BABYLON.Vector3(0, 0, 240));

    this.scene.collisionsEnabled = true;
    plane1.checkCollisions = true;
    plane2.checkCollisions = true;
    plane3.checkCollisions = true;
    plane4.checkCollisions = true;
    plane5.checkCollisions = true;
    plane6.checkCollisions = true;
  }

  private setBackToDefault(alpha: number, beta: number, radius: number,
                           x: number, y: number, z: number, xRot: number, yRot: number) {

    this.canvas.focus();
    if (this.camChanger === 0) {
      this.setCamArcRotateDefault(alpha, beta, radius);
    } else if (this.camChanger === 1) {
      this.setCamUniversalDefault(x, y, z, xRot, yRot);
    }
  }
}
