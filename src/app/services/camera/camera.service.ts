import { Injectable } from '@angular/core';
import * as BABYLON from 'babylonjs';

import { BabylonService } from '../babylon/babylon.service';
import Vector3 = BABYLON.Vector3;
import { AnnotationmarkerService } from '../annotationmarker/annotationmarker.service';

import { DeviceDetectorService } from 'ngx-device-detector';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;

  private arcRotateCamera: BABYLON.ArcRotateCamera;
  private universalCamera: BABYLON.UniversalCamera;
  private vrCamera: BABYLON.VRDeviceOrientationFreeCamera | BABYLON.VRDeviceOrientationArcRotateCamera;

  private alpha: number;
  private beta: number;
  private radius: number;
  private x: number;
  private y: number;
  private z: number;
  private xRot: number;
  private yRot: number;

  constructor(
    private babylonService: BabylonService,
    private deviceService: DeviceDetectorService
  ) {
    this.babylonService.CanvasObservable.subscribe((newCanvas) => {
      if (newCanvas) {
        this.alpha = 9;
        this.beta = 1.3;
        this.radius = 100;

        this.scene = this.babylonService.getScene();
        this.canvas = newCanvas;

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

        this.arcRotateCamera.attachControl(newCanvas, false);

        this.vrCamera = this.deviceService.isMobile() ? new BABYLON.VRDeviceOrientationFreeCamera('vrCamera',
          new BABYLON.Vector3(this.x, this.y, this.z), this.scene) :
          new BABYLON.VRDeviceOrientationArcRotateCamera('vrCamera', Math.PI / 2, Math.PI / 4, 25, new BABYLON.Vector3(0, 0, 0), this.scene);

        // Remove mouse input on mobile VR Camera to prevent flickering of meshes
        if (this.vrCamera instanceof BABYLON.VRDeviceOrientationFreeCamera) {
          this.vrCamera.inputs.remove(this.vrCamera.inputs.attached.mouse);
        }
      }
    });
  }

  public setVRCam(): void {

    if (this.scene.activeCamera.getClassName() !== 'vrCamera') {
      this.vrCamera.position = this.scene.activeCamera.position;
      this.setCameraActive(this.vrCamera);
    }
  }

  public setCamArcRotate(): void {

    if (this.scene.activeCamera.getClassName() !== 'ArcRotateCamera') {

      this.setCameraActive(this.arcRotateCamera);
      this.arcRotateSettings();
    }
  }

  public setCamUniversal(): void {

    if (this.scene.activeCamera.getClassName() !== 'UniversalCamera') {

      this.setCameraActive(this.universalCamera);
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

  public setActiveCameraTarget(target: Vector3): void {
    this.arcRotateCamera.setTarget(target);
  }

  private setCameraDefaults(camera: any): void {

    camera.keysUp.push(87);
    camera.keysDown.push(83);
    camera.keysLeft.push(65);
    camera.keysRight.push(68);
    camera.setTarget(Vector3.Zero());
  }

  private setCameraActive(newActiveCamera: any): void {
    this.scene.activeCamera.detachControl(this.canvas);
    this.scene.activeCamera = newActiveCamera;
    newActiveCamera.attachControl(this.canvas, false);
  }

  private arcRotateSettings(): void {

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
    this.arcRotateCamera.attachControl(this.canvas, false);

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

    this.scene.beginAnimation(this.arcRotateCamera, 0, 30, false, 1, function() {
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

    this.scene.beginAnimation(this.universalCamera, 0, 30, false, 1, function() {
    });
  }

  public createScreenshot(): Promise<string> {
    return this.babylonService.createScreenshot();
  }

  public moveCameraToTarget(positionVector: BABYLON.Vector3) {


    this.scene.activeCamera = this.arcRotateCamera;
    this.arcRotateCamera.attachControl(this.canvas, false);

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
        value: positionVector.x
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
        value: positionVector.y
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
        value: positionVector.z
      }]);
    this.arcRotateCamera.animations.push(animCamRadius);

    this.arcRotateCamera.setTarget(Vector3.Zero());

    this.scene.beginAnimation(this.arcRotateCamera, 0, 30, false, 1, function() {
    });
  }

  public getActualCameraPosAnnotation() {
    const cameraPosition = [{ dimension: 'x', value: this.arcRotateCamera.alpha },
    { dimension: 'y', value: this.arcRotateCamera.beta },
    { dimension: 'z', value: this.arcRotateCamera.radius }];
    return cameraPosition;
  }

}
