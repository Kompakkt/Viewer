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

}
