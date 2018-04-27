/**
 * @author Benedikt Mildenberger
 */

import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';

import {BabylonService} from '../engine/babylon.service';
import Vector3 = BABYLON.Vector3;

@Injectable()
export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private arcRotateCamera: BABYLON.ArcRotateCamera;
  private universalCamera: BABYLON.UniversalCamera;
  private camChanger: number;
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

  public createCameras(canvas: HTMLCanvasElement) {

    this.alpha = 9;
    this.beta = 1.3;
    this.radius = 100;

    this.canvas = canvas;
    this.scene = this.babylonService.getScene();

    this.arcRotateCamera = this.babylonService.createArcRotateCam('arcRotateCamera', this.alpha, this.beta, this.radius, Vector3.Zero());

    this.arcRotateSettings();

    this.x = this.arcRotateCamera.position.x;
    this.y = this.arcRotateCamera.position.y;
    this.z = this.arcRotateCamera.position.z;

    this.universalCamera = this.babylonService.createUniversalCam('universalCamera', new BABYLON.Vector3(this.x, this.y, this.z));
    this.universalSettings();

    this.xRot = this.universalCamera.rotation.x;
    this.yRot = this.universalCamera.rotation.y;

    this.camChanger = 0;

    this.arcRotateCamera.attachControl(canvas, true);

    this.setCamCollider();
  }

  public setCamArcRotate() {

    if (this.camChanger === 1) {

      this.arcRotateCamera = this.babylonService.createArcRotateCam('arcRotateCamera', 0, 0, 0,
        {x: this.universalCamera.position.x, y: this.universalCamera.position.y, z: this.universalCamera.position.z});
      this.arcRotateSettings();
      this.scene.activeCamera = this.arcRotateCamera;
      this.arcRotateCamera.attachControl(this.canvas, true);
      this.camChanger = 0;
    }
  }

  public setCamUniversal() {

    if (this.camChanger === 0) {

      this.universalCamera = this.babylonService.createUniversalCam('universalCamera',
        {x: this.arcRotateCamera.position.x, y: this.arcRotateCamera.position.y, z: this.arcRotateCamera.position.z});
      this.universalSettings();
      this.scene.activeCamera = this.universalCamera;
      this.universalCamera.attachControl(this.canvas, true);
      this.camChanger = 1;
    }
  }

  public setBackToDefault() {

    if (this.camChanger === 0) {
      this.setCamArcRotateDefault();
    } else {
      this.setCamUniversalDefault();
    }
    this.canvas.focus();
  }

  private setCameraDefaults(camera: any) {

    camera.keysUp.push(87);
    camera.keysDown.push(83);
    camera.keysLeft.push(65);
    camera.keysRight.push(68);
    camera.setTarget(Vector3.Zero());
  }

  private arcRotateSettings() {

    this.setCameraDefaults(this.arcRotateCamera);
    this.arcRotateCamera.panningSensibility = 25;
    this.arcRotateCamera.upperRadiusLimit = 200;
    this.canvas.focus();
  }

  private universalSettings() {

    this.setCameraDefaults(this.universalCamera);
    this.universalCamera.ellipsoid = new BABYLON.Vector3(10, 10, 10);
    this.universalCamera.checkCollisions = true;
    this.canvas.focus();
  }

  private setCamArcRotateDefault() {

    this.scene.activeCamera = this.arcRotateCamera;
    this.arcRotateCamera.attachControl(this.canvas, true);

    const animCamAlpha = this.babylonService.createCamAnimationCycle('animCam', 'alpha', 30);
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

    const animCamBeta = this.babylonService.createCamAnimationCycle('animCam', 'beta', 30);
    animCamBeta.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.beta
      }, {
        frame: 30,
        value: this.beta
      }]);
    this.arcRotateCamera.animations.push(animCamBeta);

    const animCamRadius = this.babylonService.createCamAnimationCycle('animCam', 'radius', 30);
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

    const setBackAnm = this.babylonService.createCamAnimationStatic('animCam', 'position', 30);

    const setBackRotXAnm = this.babylonService.createCamAnimationCycle('animCam', 'rotation.x', 30);
    const setBackRotYAnm = this.babylonService.createCamAnimationCycle('animCam', 'rotation.y', 30);

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

  // Suggestion: change to
  // https://doc.babylonjs.com/babylon101/cameras,_mesh_collisions_and_gravity#web-worker-based-collision-system-since-21
  private setCamCollider() {

    // sides
    const plane2 = this.babylonService.createCamCollider('plane2', {height: 500, width: 500});
    plane2.visibility = 0;

    const plane3 = this.babylonService.createCamCollider('plane3', {height: 500, width: 500});
    plane3.rotation.y = 90 * Math.PI / 180;
    plane3.visibility = 0;

    const plane4 = this.babylonService.createCamCollider('plane4', {height: 500, width: 500});
    plane4.rotation.x = Math.PI;
    plane4.visibility = 0;

    const plane5 = this.babylonService.createCamCollider('plane5', {height: 500, width: 500});
    plane5.rotation.y = 270 * Math.PI / 180;
    plane5.visibility = 0;

    // lower
    const plane1 = this.babylonService.createCamCollider('plane1', {height: 500, width: 500});
    plane1.rotation.x = 90 * Math.PI / 180;
    plane1.visibility = 0;

    // upper
    const plane6 = this.babylonService.createCamCollider('plane6', {height: 500, width: 500});
    plane6.rotation.x = 270 * Math.PI / 180;
    plane6.visibility = 0;

    this.babylonService.setPlaneCollision(plane1, {x: 0, y: 0, z: 240});
    this.babylonService.setPlaneCollision(plane2, {x: 0, y: 0, z: 240});
    this.babylonService.setPlaneCollision(plane3, {x: 0, y: 0, z: 240});
    this.babylonService.setPlaneCollision(plane4, {x: 0, y: 0, z: 240});
    this.babylonService.setPlaneCollision(plane5, {x: 0, y: 0, z: 240});
    this.babylonService.setPlaneCollision(plane6, {x: 0, y: 0, z: 240});

    this.scene.collisionsEnabled = true;
  }
}
