import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';

import {BabylonService} from '../babylon/babylon.service';
import Vector3 = BABYLON.Vector3;

@Injectable({
  providedIn: 'root'
})

export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private arcRotateCamera: BABYLON.ArcRotateCamera;
  private universalCamera: BABYLON.UniversalCamera;
  private alpha: number;
  private beta: number;
  private radius: number;
  private x: number;
  private y: number;
  private z: number;
  private xRot: number;
  private yRot: number;

  constructor(
    private babylonService: BabylonService
  ) {
  }

  public bootstrap(): void {

    this.alpha = 9;
    this.beta = 1.3;
    this.radius = 100;

    this.scene = this.babylonService.getScene();
    this.canvas = this.babylonService.getCanvas();

    this.arcRotateCamera = this.babylonService.createArcRotateCam('arcRotateCamera',
      this.alpha, this.beta, this.radius, Vector3.Zero());

    this.arcRotateSettings();

    this.x = 0;
    this.y = 50;
    this.z = 100;

    this.universalCamera = new BABYLON.UniversalCamera('universalCamera',
      new BABYLON.Vector3(this.x, this.y, this.z), this.scene);

    this.universalSettings();

    this.xRot = this.universalCamera.rotation.x;
    this.yRot = this.universalCamera.rotation.y;

    this.arcRotateCamera.attachControl(this.canvas, true);
  }

  public setCamArcRotate(): void {

    if (this.scene.activeCamera.getClassName() !== 'ArcRotateCamera') {

      this.setCameraActive(this.arcRotateCamera, this.universalCamera);
      this.arcRotateSettings();
    }
  }

  public setCamUniversal(): void {

    if (this.scene.activeCamera.getClassName() !== 'UniversalCamera') {

      this.setCameraActive(this.universalCamera, this.arcRotateCamera);
      this.universalSettings();
    }
  }

  public setBackToDefault(): void {

    switch (this.scene.activeCamera.getClassName()) {

      case 'ArcRotateCamera':
        this.setCamArcRotateDefault();
        break;
      case 'UniversalCamera':
        this.setCamUniversalDefault();
        break;
    }

    this.canvas.focus();
  }

  private setCameraDefaults(camera: any): void {

    camera.keysUp.push(87);
    camera.keysDown.push(83);
    camera.keysLeft.push(65);
    camera.keysRight.push(68);
    camera.setTarget(Vector3.Zero());
  }

  private setCameraActive(camera1: any, camera2: any): void {

    camera2.detachControl(this.canvas);
    this.scene.activeCamera = camera1;
    camera1.attachControl(this.canvas, true);
  }

  private arcRotateSettings(): void {

    this.arcRotateCamera.alpha = this.alpha;
    this.arcRotateCamera.beta = this.beta;
    this.arcRotateCamera.radius = this.radius;
    this.arcRotateCamera.panningSensibility = 25;
    this.arcRotateCamera.upperRadiusLimit = 200;
    this.setCameraDefaults(this.arcRotateCamera);
    this.canvas.focus();
  }

  private universalSettings(): void {

    this.universalCamera.position.x = this.x;
    this.universalCamera.position.y = this.y;
    this.universalCamera.position.z = this.z;
    this.universalCamera.ellipsoid = new BABYLON.Vector3(10, 10, 10);
    this.universalCamera.checkCollisions = true;
    this.setCameraDefaults(this.universalCamera);
    this.canvas.focus();
  }

  private setCamArcRotateDefault() {

    this.scene.activeCamera = this.arcRotateCamera;
    this.arcRotateCamera.attachControl(this.canvas, true);

    const name = 'animCam',
      frames = 30;

    const animCamAlpha = new BABYLON.Animation(name, 'alpha', frames,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamAlpha.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.alpha
      }, {
        frame: 30,
        value: this.alpha
      }
    ]);
    this.arcRotateCamera.animations.push(animCamAlpha);

    const animCamBeta = new BABYLON.Animation(name, 'beta', frames,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamBeta.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.beta
      }, {
        frame: 30,
        value: this.beta
      }]);
    this.arcRotateCamera.animations.push(animCamBeta);

    const animCamRadius = new BABYLON.Animation(name, 'radius', frames,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamRadius.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.radius
      }, {
        frame: 30,
        value: this.radius
      }]);
    this.arcRotateCamera.animations.push(animCamRadius);

    this.arcRotateCamera.setTarget(Vector3.Zero());

    this.scene.beginAnimation(this.arcRotateCamera, 0, 30, false, 1, function () {
    });
  }

  private setCamUniversalDefault() {

    const setBackAnm = new BABYLON.Animation('animCam', 'position', 30,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

    const setBackRotXAnm = new BABYLON.Animation('animCam', 'rotation.x', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotYAnm = new BABYLON.Animation('animCam', 'rotation.y', 30,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);

    setBackAnm.setKeys([{
      frame: 0,
      value: new BABYLON.Vector3(this.universalCamera.position.x, this.universalCamera.position.y, this.universalCamera.position.z)
    }, {
      frame: 30,
      value: new BABYLON.Vector3(this.x, this.y, this.z)
    }]);
    setBackRotXAnm.setKeys([{
      frame: 15,
      value: this.universalCamera.rotation.x
    }, {
      frame: 30,
      value: this.xRot
    }]);
    setBackRotYAnm.setKeys([{
      frame: 15,
      value: this.universalCamera.rotation.y
    }, {
      frame: 30,
      value: this.yRot
    }]);

    this.universalCamera.animations.push(setBackAnm);
    this.universalCamera.animations.push(setBackRotXAnm);
    this.universalCamera.animations.push(setBackRotYAnm);

    this.scene.beginAnimation(this.universalCamera, 0, 30, false, 1, function () {
    });
  }

  public createScreenshot(): void {
    BABYLON.Tools.CreateScreenshot(this.babylonService.getEngine(), this.scene.activeCamera, {precision: 2});
  }
}
