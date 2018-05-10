import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  constructor() {
  }

  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;

  public startup(canvas: HTMLCanvasElement, antialiasing: boolean): void {

    this.engine = new BABYLON.Engine(canvas, antialiasing);
    this.scene = new BABYLON.Scene(this.engine);
  }

  public getEngine(): BABYLON.Engine {
    return this.engine;
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public createHemisphericLight(name: string, position: any): BABYLON.HemisphericLight {
    return new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public createArcRotateCam(name: string, alpha: number, beta: number, radius: number, position: any) {
    return new BABYLON.ArcRotateCamera(name, alpha, beta, radius, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public createUniversalCam(name: string, position: any) {
    return new BABYLON.UniversalCamera(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public createCamCollider(name: string, options: any) {
    return BABYLON.MeshBuilder.CreatePlane(name, {height: options.height, width: options.width}, this.scene);
  }

  public setPlaneCollision(plane: BABYLON.Mesh, position: any) {
    return plane.setPositionWithLocalVector(new BABYLON.Vector3(position.x, position.y, position.z)),
      plane.checkCollisions = true;
  }

  public createCamAnimationCycle(name: string, target: any, frames: number) {
    return new BABYLON.Animation(name, target, frames,
      BABYLON.Animation.ANIMATIONTYPE_FLOAT,
      BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE);
  }

  public createCamAnimationStatic(name: string, target: any, frames: number) {
    return new BABYLON.Animation(name, target, frames,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  }

  public loadModel(scene: BABYLON.Scene, rootUrl: string, filename: string) {

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.AppendAsync(rootUrl, filename, this.scene).then(function () {
        resolve();
      }, function (error) {
        reject(error);
      });
    });
  }
}
