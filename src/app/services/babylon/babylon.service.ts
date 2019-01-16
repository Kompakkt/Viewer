import {EventEmitter, Inject, Injectable, Output} from '@angular/core';
import {DOCUMENT} from '@angular/common';

import * as BABYLON from 'babylonjs';

import {MessageService} from '../message/message.service';

import 'babylonjs-loaders';
import {LoadingScreen} from './loadingscreen';
import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';

import {BehaviorSubject} from 'rxjs';
import ActionEvent = BABYLON.ActionEvent;

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

  private color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };

  private pointlight: BABYLON.Light;
  private ambientlightUp: BABYLON.Light;
  private ambientlightDown: BABYLON.Light;

  private pointlightPosX: number;
  private pointlightPosY: number;
  private pointlightPosZ: number;
  private pointlightIntensity: number;

  private background: BABYLON.Layer;
  private isBackground: boolean;

  constructor(private message: MessageService,
              private loadingScreenHandler: LoadingscreenhandlerService,
              @Inject(DOCUMENT) private document: any) {

    this.CanvasObservable.subscribe(newCanvas => {

      if (newCanvas) {

        this.engine = new BABYLON.Engine(newCanvas, true, {preserveDrawingBuffer: true, stencil: true});
        this.scene = new BABYLON.Scene(this.engine);
        this.engine.loadingScreen = new LoadingScreen(newCanvas, '',
          '#111111', 'assets/img/kompakkt-icon.png', this.loadingScreenHandler);

        this.scene.registerBeforeRender(() => {

          if (this.actualControl && this.selectingControl && !this.selectedControl) {

            this.actualControl.scaling.x += 0.005;
            this.actualControl.scaling.y += 0.005;

            if (this.actualControl.scaling.x >= 1.2) {
              this.selectedControl = true;
              console.log('Big enough');
            }

          }

          // Achtung das Folgende wird unendlich oft aufgerufen...
          if (this.selectedControl) {

            console.log('Dont stare at me this way. I should be clicked.');

            this.actualControl.actionManager = new BABYLON.ActionManager(this.scene);
            this.actualControl.actionManager.processTrigger(BABYLON.ActionManager.OnPickTrigger, ActionEvent.CreateNew(this.actualControl));

            this.selectedControl = false;
            this.actualControl = false;

            // const material = new BABYLON.StandardMaterial('meshMaterial', this.scene);
            // material.diffuseColor = BABYLON.Color3.Purple();
            // this.actualControl.material = material;

          }


        });

        this.engine.runRenderLoop(() => {
          this.scene.render();
        });

        this.isBackground = false;

        this.color = {
          r: 0.2,
          g: 0.2,
          b: 0.2,
          a: 0.9
        };

        this.setClearColor(this.color);

        this.pointlightPosX = 1;
        this.pointlightPosY = 10;
        this.pointlightPosZ = 1;
        this.pointlight = this.createPointLight('pointlight', {x: this.pointlightPosX, y: this.pointlightPosY, z: this.pointlightPosZ});
        this.pointlightIntensity = 1;
        this.setLightIntensity('pointlight', this.pointlightIntensity);

        this.ambientlightUp = this.createHemisphericLight('ambientlightUp', {x: 0, y: 1, z: 0});
        this.setLightIntensity('ambientlightUp', 1);

        this.ambientlightDown = this.createHemisphericLight('ambientlightDown', {x: 0, y: -1, z: 0});
        this.setLightIntensity('ambientlightDown', 1);

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

  public createPointLight(name: string, position: any): BABYLON.PointLight {
    return new BABYLON.PointLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
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

    this.VRHelper.onNewMeshSelected.add((mesh) => {

      // const material = new BABYLON.StandardMaterial('meshMaterial', this.scene);

      switch (mesh.name) {

        case 'controlPrevious':
          // material.diffuseColor = BABYLON.Color3.Blue();
          //  mesh.material = material;
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        case 'controlNext':
          //  material.diffuseColor = BABYLON.Color3.Red();
          //  mesh.material = material;
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        default:
          this.selectingControl = false;
          this.selectedControl = false;

          if (this.actualControl !== false) {
            //   material.diffuseColor = BABYLON.Color3.White();
            //  this.actualControl.material = material;
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl = false;

          }
          break;
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


  public loadModel(rootUrl: string, filename: string): Promise<any> {

    const message = this.message;
    const engine = this.engine;

    engine.displayLoadingUI();

    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];

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

  public async createScreenshot() {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(() => resolve()));
    const result = await new Promise<string>((resolve, reject) => {
      BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera, {precision: 2},
        (screenshot) => {
          fetch(screenshot).then(res => res.blob()).then(blob => BABYLON.Tools.Download(blob, `Kompakkt-${Date.now().toString()}`));
          resolve(screenshot);
        });
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(width?: number): Promise<string> {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(() => resolve()));
    const result = await new Promise<string>((resolve, reject) => {
      BABYLON.Tools.CreateScreenshot(this.getEngine(), this.getScene().activeCamera,
        (width === undefined) ? {width: 400, height: 225} : {width: width, height: Math.round((width / 16) * 9)},
        (screenshot) => {
          resolve(screenshot);
        });
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public hideMesh(tag: string, visibility: boolean) {
    this.scene.getMeshesByTags(tag, mesh => mesh.isVisible = visibility);
  }

  public setBackgroundImage(background: boolean): void {
    if (background && !this.isBackground) {
      this.background = new BABYLON.Layer('background', this.backgroundURL, this.scene, true);
      this.background.alphaBlendingMode = BABYLON.Engine.ALPHA_ADD;
      this.background.isBackground = true;
      this.isBackground = true;
    }
    if (!background && this.background) {
      this.background.dispose();
      this.isBackground = false;
    } else {
      return;
    }
  }

  public setBackgroundColor(color: any): void {
    this.color = color;
    this.scene.clearColor = new BABYLON.Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  }

  public setClearColor(color: any): void {
    this.scene.clearColor = new BABYLON.Color4(color.r, color.g, color.b, color.a);
  }

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointlight' && this.pointlight !== undefined) {
      this.pointlight.intensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp !== undefined) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown !== undefined) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public setLightPosition(dimension: string, pos: number) {
    if (this.pointlight != null) {
      switch (dimension) {
        case 'x':
          this.pointlightPosX = pos;
          break;
        case 'y':
          this.pointlightPosX = pos;
          break;
        case 'z':
          this.pointlightPosX = pos;
          break;
      }
      this.pointlight.dispose();
      this.pointlight = this.createHemisphericLight('pointlight', {x: this.pointlightPosX, y: this.pointlightPosY, z: this.pointlightPosZ});
      this.pointlight.intensity = this.pointlightIntensity;
    }
  }
}
