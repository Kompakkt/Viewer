/**
 * @author Jan G. Wieners
 */

import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';

@Injectable()
export class BabylonService {

  constructor() {
  }

  private engine: BABYLON.Engine;
  private scene: BABYLON.Scene;

  public createEngine(canvas: HTMLCanvasElement, antialiasing: boolean): BABYLON.Engine {
    return this.engine = new BABYLON.Engine(canvas, true);
  }

  public getEngine(): BABYLON.Engine {
    return this.engine;
  }

  public createScene(): BABYLON.Scene {
    return this.scene = new BABYLON.Scene(this.engine);
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
  }

  public fullscreen(): void {
    this.engine.switchFullscreen(false);
  }

  public createHemisphericLight(name: string, position: any): BABYLON.HemisphericLight {
    return new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public loadObject(meshNames: string, rootUrl: string, sceneFilename: string) {
    return BABYLON.SceneLoader.ImportMesh(meshNames, rootUrl, sceneFilename, this.scene);
  }
}
