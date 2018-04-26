/**
 * @author Benedikt Mildenberger
 */

import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';

import {BabylonService} from '../../services/engine/babylon.service';
import Vector3 = BABYLON.Vector3;

@Injectable()
export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: BABYLON.Scene;
  private camera1: BABYLON.ArcRotateCamera;
  private camera2: BABYLON.UniversalCamera;
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
  ) {}

  public createCamera(canvas: HTMLCanvasElement) {
    this.alpha = 9;
    this.beta = 1.3;
    this.radius = 100;

    this.canvas = canvas;
    this.scene = this.babylonService.getScene();

    this.camera1 =  this.babylonService.createArcRotateCam('camera1', this.alpha, this.beta, this.radius, Vector3.Zero());
    this.arcRotateSettings();

    this.x = this.camera1.position.x;
    this.y = this.camera1.position.y;
    this.z = this.camera1.position.z;

    this.camera2 = this.babylonService.createUniversalCam('camera2', new BABYLON.Vector3(this.x, this.y, this.z));
    this.universalSettings();

    this.xRot = this.camera2.rotation.x;
    this.yRot = this.camera2.rotation.y;

    this.camChanger = 0;

    this.camera1.attachControl(canvas, true);

    this.setCamCollider();
  }

  public setCamArcRotate() {
    if (this.camChanger === 1) {
      this.camera1 = this.babylonService.createArcRotateCam('camera1', 0, 0, 0,
        {x: this.camera2.position.x, y: this.camera2.position.y, z: this.camera2.position.z});
      this.arcRotateSettings();
      this.scene.activeCamera = this.camera1;
      this.camera1.attachControl(this.canvas, true);
      this.camChanger = 0;
    }
  }

  public setCamUniversal() {
    if (this.camChanger === 0) {
      this.camera2 = this.babylonService.createUniversalCam('camera2',
        {x: this.camera1.position.x, y: this.camera1.position.y, z: this.camera1.position.z});
      this.universalSettings();
      this.scene.activeCamera = this.camera2;
      this.camera2.attachControl(this.canvas, true);
      this.camChanger = 1;
    }
  }

  public setBackToDefault() {
    if (this.camChanger === 0) {
      this.setCamArcRotateDefault();
    } else if (this.camChanger === 1) {
      this.setCamUniversalDefault();
    }
    this.canvas.focus();
  }

  private arcRotateSettings() {
    this.camera1.keysUp.push(87);
    this.camera1.keysDown.push(83);
    this.camera1.keysLeft.push(65);
    this.camera1.keysRight.push(68);
    this.camera1.panningSensibility = 25;
    this.camera1.upperRadiusLimit = 200;
    this.camera1.setTarget(Vector3.Zero());
    this.canvas.focus();
  }

  private universalSettings() {
    this.camera2.keysUp.push(87);
    this.camera2.keysDown.push(83);
    this.camera2.keysLeft.push(65);
    this.camera2.keysRight.push(68);
    this.camera2.setTarget(Vector3.Zero());
    this.camera2.ellipsoid = new BABYLON.Vector3(10, 10, 10)
    this.camera2.checkCollisions = true;
    this.canvas.focus();
  }

  private setCamArcRotateDefault() {
    this.scene.activeCamera = this.camera1;
    this.camera1.attachControl(this.canvas, true);

    const animCamAlpha = this.babylonService.createCamAnimationCycle('animCam', 'alpha', 30);
    const backAlpha = [];
    backAlpha.push({
      frame: 0,
      value: this.camera1.alpha
    });
    backAlpha.push({
      frame: 30,
      value: this.alpha
    });

    const animCamBeta = this.babylonService.createCamAnimationCycle('animCam', 'beta', 30);
    const backBeta = [];
    backBeta.push({
      frame: 0,
      value: this.camera1.beta
    });
    backBeta.push({
      frame: 30,
      value: this.beta
    });

    const animCamRadius = this.babylonService.createCamAnimationCycle('animCam', 'radius', 30);
    const backRadius = [];
    backRadius.push({
      frame: 0,
      value: this.camera1.radius
    });
    backRadius.push({
      frame: 30,
      value: this.radius
    });

    animCamAlpha.setKeys(backAlpha);
    animCamBeta.setKeys(backBeta);
    animCamRadius.setKeys(backRadius);

    this.camera1.animations.push(animCamAlpha);
    this.camera1.animations.push(animCamBeta);
    this.camera1.animations.push(animCamRadius);

    this.camera1.setTarget(Vector3.Zero());

    this.scene.beginAnimation(this.camera1, 0, 30, false, 1, function () {
    });
  }

  private setCamUniversalDefault() {
    const setBackAnm = this.babylonService.createCamAnimationStatic('animCam', 'position', 30);
    const setBackPos = [{
      frame: 0,
      value: new BABYLON.Vector3(this.camera2.position.x, this.camera2.position.y, this.camera2.position.z)
    }, {
      frame: 30,
      value: new BABYLON.Vector3(this.x, this.y, this.z)
    }];

    const setBackRotXAnm = this.babylonService.createCamAnimationCycle('animCam', 'rotation.x', 30);
    const setBackRotX = [{
      frame: 15,
      value: this.camera2.rotation.x
    }, {
      frame: 30,
      value: this.xRot
    }];

    const setBackRotYAnm = this.babylonService.createCamAnimationCycle('animCam', 'rotation.y', 30);
    const setBackRotY = [{
      frame: 15,
      value: this.camera2.rotation.y
    }, {
      frame: 30,
      value: this.yRot
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
