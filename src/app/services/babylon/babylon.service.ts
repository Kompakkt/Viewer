import {EventEmitter, Inject, Injectable, Output} from '@angular/core';
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

  @Output() vrModeIsActive: EventEmitter<boolean> = new EventEmitter();

  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private VRHelper: BABYLON.VRExperienceHelper;

  private CanvasSubject = new BehaviorSubject<HTMLCanvasElement>(null);
  public CanvasObservable = this.CanvasSubject.asObservable();

  private backgroundURL = 'assets/textures/backgrounds/darkgrey.jpg';

  private actualControl: BABYLON.AbstractMesh;
  private selectingControl: boolean;
  private selectedControl: boolean;

  constructor(private message: MessageService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              @Inject(DOCUMENT) private document: any) {

    this.CanvasObservable.subscribe(newCanvas => {

      if (newCanvas) {

        this.engine = new BABYLON.Engine(newCanvas, true, {preserveDrawingBuffer: true, stencil: true});
        this.scene = new BABYLON.Scene(this.engine);
        this.engine.loadingScreen = new LoadingScreen(newCanvas, '', '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

        this.engine.runRenderLoop(() => {

          if (this.actualControl !== null) {
            if (this.selectingControl && !this.selectedControl) {
              this.actualControl.scaling.x += 0.005;
              this.actualControl.scaling.y += 0.005;

              if (this.actualControl.scaling.x >= 1.2) {
                this.selectedControl = true;
              }
            }
            if (this.selectedControl) {
              // this.actualControl.material.diffuseColor = BABYLON.Color3.Red();
              // this.actualControl.
            }
            this.scene.render();
          }
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

    this.VRHelper.enableInteractions();

    this.VRHelper.displayGaze = true;

    this.VRHelper.onNewMeshSelected.add(function (mesh) {

      if (mesh.name === 'controlPrevious') {
        this.actualControl = null;
        this.actualControl = mesh;
        this.actualControl.material.diffuseColor = BABYLON.Color3.Blue();
        this.selectingControl = true;
        console.log('PREVIOUS');
      }
      if (mesh.name === 'controlNext') {
        this.actualControl = null;
        this.actualControl = mesh;
        this.actualControl.material.diffuseColor = BABYLON.Color3.Blue();
        this.selectingControl = true;
        console.log('NEXT');
      } else {
        this.selectingControl = false;
        this.selectedControl = false;

        if (this.actualControl !== null) {
          this.actualControl.material.diffuseColor = BABYLON.Color3.White();
          this.actualControl.height = 1;
          this.actualControl.width = 1;
          this.actualControl = null;
        }
      }
    });


    this.VRHelper.onEnteringVRObservable.add(() => {
      this.vrModeIsActive.emit(true);
    });
    this.VRHelper.onExitingVRObservable.add(() => {
      this.vrModeIsActive.emit(false);
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
