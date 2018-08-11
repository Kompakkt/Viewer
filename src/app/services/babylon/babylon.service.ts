import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  constructor() {
  }

  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private canvas: HTMLCanvasElement;

  public startup(canvas: HTMLCanvasElement, antialiasing: boolean): void {

    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, antialiasing);
    this.scene = new BABYLON.Scene(this.engine);
  }

  public resize(): void {

    this.engine.resize();
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
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

  public createCamCollider(name: string, options: any) {
    return BABYLON.MeshBuilder.CreatePlane(name, {height: options.height, width: options.width}, this.scene);
  }

  public loadModel(scene: BABYLON.Scene, rootUrl: string, filename: string) {

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene).then(function (result) {
        console.log(result);
        resolve();
      }, function (error) {
        reject(error);
      });
    });
  }

  public saveScene() {
    return BABYLON.SceneSerializer.Serialize(this.scene);
  }
}
