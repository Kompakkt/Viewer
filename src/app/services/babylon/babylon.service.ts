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

  private actualControl: any = false;
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

        const that = this;

        this.scene.registerBeforeRender(function () {

          if (that.actualControl) {

            that.actualControl.scaling.x += 0.005;
            that.actualControl.scaling.y += 0.005;

            if (that.actualControl.scaling.x >= 1.2) {
              that.selectedControl = true;
            }
          }

          /*
          if (that.actualControl !== null) {

            if (that.selectingControl && !that.selectedControl) {

              that.actualControl.scaling.x += 0.005;
              that.actualControl.scaling.y += 0.005;

              if (that.actualControl.scaling.x >= 1.2) {
                that.selectedControl = true;
              }
            }
            if (that.selectedControl) {
              // this.actualControl.material.diffuseColor = BABYLON.Color3.Red();
              // this.actualControl.
            }
          }
          */
        });

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

    this.VRHelper.enableInteractions();

    this.VRHelper.displayGaze = true;

    const that = this;

    this.VRHelper.onNewMeshSelected.add(function (mesh) {

      const material = new BABYLON.StandardMaterial('meshMaterial', that.scene);

      switch (mesh.name) {

        case 'controlPrevious':
          material.diffuseColor = BABYLON.Color3.Blue();
          mesh.material = material;
          that.actualControl = mesh;
          break;

        case 'controlNext':
          material.diffuseColor = BABYLON.Color3.Red();
          mesh.material = material;
          that.actualControl = mesh;
          break;

        default:
          material.diffuseColor = BABYLON.Color3.White();
          that.actualControl.material = material;
          that.actualControl.scaling.x = 1;
          that.actualControl.scaling.y = 1;
          that.actualControl = false;
      }

      /*
      if (mesh.name === 'controlPrevious') {
        that.actualControl = null;
        that.actualControl = mesh;
        that.actualControl.material.diffuseColor = BABYLON.Color3.Blue();
        that.selectingControl = true;
        console.log('PREVIOUS');
      }
      if (mesh.name === 'controlNext') {
        that.actualControl = null;
        that.actualControl = mesh;
        that.actualControl.material.diffuseColor = BABYLON.Color3.Blue();
        that.selectingControl = true;
        console.log('NEXT');
      } else {
        that.selectingControl = false;
        that.selectedControl = false;

        if (that.actualControl !== null) {
          that.actualControl.material.diffuseColor = BABYLON.Color3.White();
          that.actualControl.height = 1;
          that.actualControl.width = 1;
          that.actualControl = null;
        }
        */
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
    new BABYLON.Layer('background', imgUrl, this.scene, true).isBackground = true;
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
