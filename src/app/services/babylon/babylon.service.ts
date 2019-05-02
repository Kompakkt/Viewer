import {DOCUMENT} from '@angular/common';
import {EventEmitter, Inject, Injectable, Output} from '@angular/core';
import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import {ReplaySubject} from 'rxjs';

import {LoadingscreenhandlerService} from '../loadingscreenhandler/loadingscreenhandler.service';
import {MessageService} from '../message/message.service';

import {LoadingScreen} from './loadingscreen';
import ActionEvent = BABYLON.ActionEvent;

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root',
})
export class BabylonService {

  @Output() vrModeIsActive: EventEmitter<boolean> = new EventEmitter();
  public isVRModeActive = false;

  private scene: BABYLON.Scene;
  private engine: BABYLON.Engine;
  private VRHelper: BABYLON.VRExperienceHelper;

  private CanvasSubject = new ReplaySubject<HTMLCanvasElement>();
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

  private pointlight: BABYLON.PointLight;
  private ambientlightUp: BABYLON.HemisphericLight;
  private ambientlightDown: BABYLON.HemisphericLight;

  private pointlightPosX: number;
  private pointlightPosY: number;
  private pointlightPosZ: number;
  public pointlightIntensity: number;

  private background: BABYLON.Layer;
  private isBackground: boolean;

  // FOR VR-HUD
  public vrJump: boolean;

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

          // VR-Annotation-Text-Walk
          if (this.actualControl && this.selectingControl && !this.selectedControl) {

            this.actualControl.scaling.x += 0.005;
            this.actualControl.scaling.y += 0.005;
            this.actualControl.material.diffuseColor = BABYLON.Color3.Red();

            if (this.actualControl.scaling.x >= 1.5) {
              this.selectedControl = true;
            }
          }

          if (this.selectedControl) {

            this.actualControl.metadata = '1';
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl.material.diffuseColor = BABYLON.Color3.Black();
            this.selectedControl = false;
            this.actualControl = false;
          }

          // Annotation_Marker -- Fixed_Size_On_Zoom
          const _cam = this.scene.getCameraByName('arcRotateCamera');
          if (_cam && _cam['radius']) {
            const radius = Math.abs(_cam['radius']);
            this.scene.getMeshesByTags('plane', mesh => mesh.scalingDeterminant = radius / 35);
            this.scene.getMeshesByTags('label', mesh => mesh.scalingDeterminant = radius / 35);
          }

          // FOR VR-HUD
          const _activeCamera = this.getActiveCamera();
          if (this.vrJump && _activeCamera) {
            this.vrJump = false;
            let i = 1;
            this.scene.getMeshesByTags('control', mesh => {

              const newPosition = new BABYLON.Vector3();
              if ((i % 2) != 0) {
                newPosition.x = _activeCamera.position.x - 5;
                newPosition.y = _activeCamera.position.y;
                newPosition.z = _activeCamera.position.z;
                i++;
              } else {
                newPosition.x = _activeCamera.position.x + 5;
                newPosition.y = _activeCamera.position.y;
                newPosition.z = _activeCamera.position.z;
              }
              mesh.setAbsolutePosition(newPosition);
            });
          }
        });

        this.engine.runRenderLoop(() => {
          this.scene.render();
        });
      }
    });
  }

  public getActiveCamera() {
    return this.scene.activeCamera;
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

  public createArcRotateCam(alpha: number, beta: number, radius: number): BABYLON.ArcRotateCamera {
    return new BABYLON.ArcRotateCamera('arcRotateCamera', alpha, beta, radius, BABYLON.Vector3.Zero(), this.scene);
  }

  public createVRHelper() {

    const vrButton: HTMLButtonElement = this.document.getElementById('vrbutton');

    this.VRHelper = this.scene.createDefaultVRExperience({
      // Camera für VR ohne Cardboard!
      createDeviceOrientationCamera: false,
      // createDeviceOrientationCamera: false,
      useCustomVRButton: true,
      customVRButton: vrButton,
    });

    // this.VRHelper.gazeTrackerMesh = BABYLON.Mesh.CreateSphere("sphere1", 32, 0.1, this.scene);
    this.VRHelper.enableInteractions();
    // this.VRHelper.displayGaze = true;

    this.VRHelper.onNewMeshSelected.add(mesh => {

      switch (mesh.name) {

        case 'controlPrevious':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        case 'controlNext':
          this.selectingControl = true;
          this.actualControl = mesh;
          this.selectingControl = true;
          break;

        default:
          this.selectingControl = false;
          this.selectedControl = false;

          if (this.actualControl !== false) {
            this.actualControl.scaling.x = 1;
            this.actualControl.scaling.y = 1;
            this.actualControl = false;

          }
      }
    });

    this.VRHelper.onEnteringVRObservable.add(() => {
      this.vrModeIsActive.emit(true);
      this.isVRModeActive = true;
    });
    this.VRHelper.onExitingVRObservable.add(() => {
      this.vrModeIsActive.emit(false);
      this.isVRModeActive = false;
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

      BABYLON.SceneLoader.ImportMeshAsync(null, rootUrl, filename, this.scene, function(progress) {

        if (progress.lengthComputable) {
          engine.loadingUIText = (progress.loaded * 100 / progress.total).toFixed() + '%';
        }
      }).then(function(result) {
        engine.hideLoadingUI();
        resolve(result);
      },      function(error) {

        engine.hideLoadingUI();
        message.error(error);
        reject(error);
      });
    });

  }

  public loadImage(rootUrl: string) {
    /*
    const rootUrlTest = '/assets/img/BYSA.png';

    const message = this.message;
    const engine = this.engine;

    engine.displayLoadingUI();

    this.scene.meshes.forEach(mesh => mesh.dispose());
    this.scene.meshes = [];

    const diffuseXHR = new XMLHttpRequest();

    const img = new Image();
    img.src = rootUrlTest;
    img.onload = function(e) {
      alert(this.width + 'x' + this.height);
      const ground = BABYLON.Mesh.CreateGround('gnd',
        this.width / 100,
        this.height / 100, 1, this.scene);

      diffuseXHR.open('GET', rootUrlTest);
      diffuseXHR.responseType = 'arraybuffer';
      diffuseXHR.onprogress = function(e) {
      if (e.lengthComputable) {
        console.log('diffuse progress: ', e.loaded);
        engine.loadingUIText = (e.loaded * 100 / e.total).toFixed() + '%';

      }
    };
      diffuseXHR.onload = function(e) {
      if (this.status === 200) {
          const mypicture = BABYLON.Texture.LoadFromDataString('diffuse',
            this.response, this.scene);
          const gndmat = new BABYLON.StandardMaterial('gmat', this.scene);
          ground.material = gndmat;
          gndmat.diffuseTexture = mypicture;
          engine.hideLoadingUI();

      }
    };
      diffuseXHR.send();
    };*/

    /*
        const mypicture = new BABYLON.Texture('https://crossorigin.me/' + rootUrl, this.scene);

        const ground = BABYLON.Mesh.CreateGround('gnd', width / 100, height / 100, 1, this.scene);

        const gndmat = new BABYLON.StandardMaterial('gmat', this.scene);
        ground.material = gndmat;
        gndmat.diffuseTexture = mypicture;

        engine.hideLoadingUI();

        const ground = BABYLON.Mesh.CreateGround('gnd', width / 100, height / 100, 1, this.scene);

        const material = new BABYLON.StandardMaterial('texture1', this.scene);
        material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        //var texture = new BABYLON.Texture("https://upload.wikimedia.org/wikipedia/commons/b/ba/Dent_de_Vaulion_-_360_degree_panorama.jpg", scene);
        const texture = new BABYLON.Texture('https://crossorigin.me/' + rootUrl, this.scene);
        console.log('Texture from' + 'https://crossorigin.me/', rootUrl, texture);
        material.diffuseTexture = texture;
        material.diffuseTexture.coordinatesMode = BABYLON.Texture.SPHERICAL_MODE;
        material.backFaceCulling = false;
        ground.material = material;
        engine.hideLoadingUI();*/

    // sphere1.infiniteDistance = true;

    /*
        BABYLON.Tools.LoadImage(rootUrl, function () {
          console.log('loaded');
        }, function (item, err) {
          console.log('error:', err, item, 'not loaded');
        });

        const assetsManager = new BABYLON.AssetsManager(this.scene);
        const imageTask = assetsManager.addImageTask('image task', rootUrl);
        imageTask.onSuccess = function (task) {
          console.log(task.image.width, 'assetManager');
        };
    */

    /*
        const mypicture = new BABYLON.Texture(rootUrl, this.scene);

        const ground = BABYLON.Mesh.CreateGround('gnd', width / 100, height / 100, 1, this.scene);

        const gndmat = new BABYLON.StandardMaterial('gmat', this.scene);
        ground.material = gndmat;
        gndmat.diffuseTexture = mypicture;

        engine.hideLoadingUI();*/

  }

  public saveScene(): void {
    return BABYLON.SceneSerializer.Serialize(this.scene);
  }

  public async createScreenshot() {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof BABYLON.Camera) {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), _activeCamera, {precision: 2}, screenshot => {
          fetch(screenshot).then(res => res.blob()).then(blob => BABYLON.Tools.Download(blob, `Kompakkt-${Date.now().toString()}`));
          resolve(screenshot);
        });
      }
    });
    this.hideMesh('plane', true);
    this.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(width?: number): Promise<string> {
    this.hideMesh('plane', false);
    this.hideMesh('label', false);
    await new Promise<any>((resolve, reject) => this.engine.onEndFrameObservable.add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.getScene().activeCamera;
      if (_activeCamera instanceof BABYLON.Camera) {
        BABYLON.Tools.CreateScreenshot(this.getEngine(), _activeCamera,
                                       (width === undefined) ? {width: 400, height: 225} : {width, height: Math.round((width / 16) * 9)}, screenshot => {
            resolve(screenshot);
          });
      }
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

  public setLightIntensity(light: string, intensity: number) {
    if (light === 'pointlight' && this.pointlight !== undefined) {
      this.pointlight.intensity = intensity;
      this.pointlightIntensity = intensity;
    }
    if (light === 'ambientlightUp' && this.ambientlightUp !== undefined) {
      this.ambientlightUp.intensity = intensity;
    }
    if (light === 'ambientlightDown' && this.ambientlightDown !== undefined) {
      this.ambientlightDown.intensity = intensity;
    }
  }

  public createPointLight(name: string, position: any) {
    if (this.pointlight !== undefined && this.pointlight !== null) {
      this.pointlight.dispose();
    }
    const pointLight = new BABYLON.PointLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.pointlightPosX = position.x;
    this.pointlightPosY = position.y;
    this.pointlightPosZ = position.z;

    this.pointlight = pointLight;
    this.pointlight.intensity = this.pointlightIntensity;

    // return this.pointlight;
  }

  public createAmbientlightDown(name: string, position: any) {
    if (this.ambientlightDown !== undefined) {
      this.ambientlightDown.dispose();
    }
    const hemiLight = new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.ambientlightDown = hemiLight;
  }

  public createAmbientlightUp(name: string, position: any) {
    if (this.ambientlightUp !== undefined) {
      this.ambientlightUp.dispose();
    }
    const hemiLight = new BABYLON.HemisphericLight(name, new BABYLON.Vector3(position.x, position.y, position.z), this.scene);
    this.ambientlightUp = hemiLight;
  }

  public setLightPosition(dimension: string, pos: number) {
    if (this.pointlight !== undefined) {
      switch (dimension) {
        case 'x':
          this.pointlightPosX = pos;
          break;
        case 'y':
          this.pointlightPosY = pos;
          break;
        case 'z':
          this.pointlightPosZ = pos;
      }

      this.createPointLight('pointlight', {x: this.pointlightPosX, y: this.pointlightPosY, z: this.pointlightPosZ});
    }
  }

  public getColor(): any {
    return this.color;
  }

  public getPointlightData(): any {
    return {
      type: 'PointLight',
      position: {
        x: this.pointlightPosX,
        y: this.pointlightPosY,
        z: this.pointlightPosZ,
      },
      intensity: this.pointlightIntensity ? this.pointlightIntensity : 1,
    };
  }

}
