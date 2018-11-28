import {Injectable} from '@angular/core';

import * as BABYLON from 'babylonjs';

import {MessageService} from '../message/message.service';

import 'babylonjs-loaders';
import {LoadingScreen} from './loadingscreen';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root'
})
export class BabylonService {

  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private canvas: HTMLCanvasElement;

  constructor(private message: MessageService, private loadingScreenHandler: LoadingscreenhandlerService) {
  }

  public bootstrap(canvas: HTMLCanvasElement, antialiasing: boolean): void {

    this.canvas = canvas;
    this.engine = new BABYLON.Engine(canvas, antialiasing, {preserveDrawingBuffer: true, stencil: true});
    this.scene = new BABYLON.Scene(this.engine);
    this.engine.loadingScreen = new LoadingScreen(this.canvas, '', '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);
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

  public createArcRotateCam(name: string, alpha: number, beta: number, radius: number, position: any): BABYLON.ArcRotateCamera {
    return new BABYLON.ArcRotateCamera(name, alpha, beta, radius, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
  }

  public setBackgroundImage(imgUrl: string): void {

    const background = new BABYLON.Layer('background', imgUrl, this.scene, true);
    background.isBackground = true;
  }

  public loadModel(rootUrl: string, filename: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;

    engine.displayLoadingUI();

    return new Promise<any>((resolve, reject) => {

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene, function (progress) {

        if (progress.lengthComputable) {
          engine.loadingUIText = (progress.loaded * 100 / progress.total).toFixed() + '%';
        }
      }).then(function (result) {
        engine.hideLoadingUI();
        resolve(result);
      }, function (error) {

        engine.hideLoadingUI();
        message.error(error);
        reject(error);
      });
    });
  }

  public saveScene(): void {
    return BABYLON.SceneSerializer.Serialize(this.scene);
  }

  public createScreenshot(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera, {precision: 2}, (screenshot) => {
        resolve(screenshot);
      });
    });
  }

  public createPreviewScreenshot(width?: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (width === undefined) {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera, {width:250, height:140}, (screenshot) => {
          resolve(screenshot);
        });
      } else {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera, width, (screenshot) => {
          resolve(screenshot);
        });
      }
    });
  }
}
