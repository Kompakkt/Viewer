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
    background.texture.level = 0;
  };

  public loadModel(rootUrl: string, filename: string) {

    var myMaterial = new BABYLON.StandardMaterial('myMaterial', this.scene);
    myMaterial.diffuseTexture = new BABYLON.Texture('assets/textures/skybox/blue/blue_nx.jpg', this.scene);
    myMaterial.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
    myMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    myMaterial.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);
    myMaterial.pointsCloud = true;
    myMaterial.wireframe = true;

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene).then(function (result) {
        console.log(result);
        //result.meshes[0].showSubM eshesBoundingBox = true;
        result.meshes[0].material = myMaterial;
        result.meshes[1].dispose();
        result.meshes[2].dispose();
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
