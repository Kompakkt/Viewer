import {Inject, Injectable} from '@angular/core';
import {DOCUMENT} from '@angular/common';

import * as BABYLON from 'babylonjs';

import {MessageService} from '../message/message.service';

import 'babylonjs-loaders';
import {LoadingScreen} from './loadingscreen';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';

import {BehaviorSubject} from 'rxjs';

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
  private VRHelper: BABYLON.VRExperienceHelper;

  private CanvasSubject = new BehaviorSubject<HTMLCanvasElement>(null);
  public CanvasObservable = this.CanvasSubject.asObservable();

  private backgroundURL = 'assets/textures/backgrounds/darkgrey.jpg';

  constructor(private message: MessageService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              @Inject(DOCUMENT) private document: any) {
    this.CanvasObservable.subscribe(newCanvas => {
      if (newCanvas) {
        this.engine = new BABYLON.Engine(newCanvas, true, {preserveDrawingBuffer: true, stencil: true});
        this.scene = new BABYLON.Scene(this.engine);
        this.engine.loadingScreen = new LoadingScreen(newCanvas, '', '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

        this.engine.runRenderLoop(() => {
          this.scene.render();
        });

        this.setBackgroundImage(this.backgroundURL);

        this.setClearColor(0.2, 0.2, 0.2, 0.8);

        this.createHemisphericLight('light1', {x: 0, y: 1, z: 0});
      }
    });
  }

  public updateCanvas(newCanvas: HTMLCanvasElement) {
    this.CanvasSubject.next(newCanvas);
  }

  public resize(): void {
    this.engine.resize();
  }

  public getEngine(): BABYLON.Engine {
    return this.engine;
  }

  public getScene(): BABYLON.Scene {
    return this.scene;
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

  public createVRHelper() {

    const vrButton: HTMLButtonElement = this.document.getElementById('vrbutton');

    this.VRHelper = this.scene.createDefaultVRExperience({
      createDeviceOrientationCamera: false,
      useCustomVRButton: true,
      customVRButton: vrButton
    });

    // Example use of gaze tracker functionality
    // this.VRHelper.gazeTrackerMesh = BABYLON.Mesh.CreateSphere('sphere1', 4, 0.3, this.scene);
    // this.VRHelper.changeGazeColor(BABYLON.Color3.Red());

    this.VRHelper.enableInteractions();

    this.VRHelper.displayGaze = true;

    // Example for handling mesh selection events in VR
    // See https://doc.babylonjs.com/how_to/webvr_helper#gaze-and-interaction
    this.VRHelper.onNewMeshSelected.add(function (mesh) {
      console.log(mesh);
    });

    return this.VRHelper;
  }

  public getVRHelper() {
    return this.VRHelper;
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
        BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera, {width: 250, height: 140}, (screenshot) => {
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
