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

  public bootstrap(canvas: HTMLCanvasElement, antialiasing: boolean): void {

    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, antialiasing, {preserveDrawingBuffer: true, stencil: true});
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

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setClearColor(r: number, g: number, b: number, a: number): void {
    this.scene.clearColor = new BABYLON.Color4(r, g, b, a);
  }

  public createHemisphericLight(name: string, position: any): BABYLON.HemisphericLight {
    return new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public createArcRotateCam(name: string, alpha: number, beta: number, radius: number, position: any) {
    return new BABYLON.ArcRotateCamera(name, alpha, beta, radius, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public setBackgroundImage(imgUrl: string): void {

    const background = new BABYLON.Layer('background', imgUrl, this.scene, true);
    background.isBackground = true;
  };

  public loadModel(rootUrl: string, filename: string) {

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene).then(function (result) {
        resolve(result);
      }, function (error) {
        reject(error);
      });
    });
  }

  public saveScene() {
    return BABYLON.SceneSerializer.Serialize(this.scene);
  }
}
