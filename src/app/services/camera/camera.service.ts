import {Injectable} from '@angular/core';
import {Animation, ArcRotateCamera, Camera, Scene, Tools, Vector3} from 'babylonjs';

import {BabylonService} from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root',
})
export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: Scene;

  public arcRotateCamera: ArcRotateCamera;

  // Parameters (initial Position): alpha, beta, radius,
  public alpha: number | undefined;
  public beta: number | undefined;
  public radius: number | undefined;
  // target
  public x: number | undefined;
  public y: number | undefined;
  public z: number | undefined;

  constructor(private babylonService: BabylonService) {
    this.scene = this.babylonService.getScene();
    this.scene.collisionsEnabled = true;
    this.canvas = this.babylonService.getCanvas();

    // Parameters (initial Position): alpha, beta, radius, target position, scene
    this.arcRotateCamera = this.createArcRotateCam(0, 10, 100);
    this.arcRotateCamera.allowUpsideDown = false;
    this.arcRotateCamera.panningSensibility = 25;
    this.arcRotateCamera.keysUp.push(87);
    this.arcRotateCamera.keysDown.push(83);
    this.arcRotateCamera.keysLeft.push(65);
    this.arcRotateCamera.keysRight.push(68);

    this.arcRotateCamera.attachControl(this.canvas, false);
    this.arcRotateCamera.checkCollisions = true;
    this.arcRotateCamera.collisionRadius = new Vector3(4, 4, 4);
  }

  public createArcRotateCam(alpha: number, beta: number,
                            radius: number, scene?: Scene): ArcRotateCamera {
    return new ArcRotateCamera('arcRotateCamera',
                               alpha, beta, radius, Vector3.Zero(), (scene) ? scene : this.scene);
  }

  public backToDefault(): void {
    const positionVector = new Vector3(this.alpha, this.beta, this.radius);
    this.moveCameraToTarget(positionVector);
    const positionTarget = new Vector3(this.x, this.y, this.z);
    this.arcRotateCamera.setTarget(positionTarget);

  }

  public setDefaultPosition(alpha: number, beta: number,
                            radius: number, x: number, y: number, z: number) {
    this.alpha = alpha;
    this.beta = beta;
    this.radius = radius;
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public setUpperRadiusLimit(radius: number) {
    if (this.arcRotateCamera) {
      this.arcRotateCamera.upperRadiusLimit = radius;
    }
  }

  public setCamerato2DMode(audio?: boolean) {
  // This positions the camera
    this.arcRotateCamera.setPosition(new Vector3(0, Math.PI / 180 * 90, (audio ? 5 : 150)));
    this.setDefaultPosition(0, Math.PI / 180 * 90, (audio ? 5 : 150), 0, 0, 0);
    this.arcRotateCamera.lowerAlphaLimit = Math.PI / 180 * -90;
    this.arcRotateCamera.upperAlphaLimit = Math.PI / 180 * -90;
    this.arcRotateCamera.lowerBetaLimit = Math.PI / 180 * 90;
    this.arcRotateCamera.upperBetaLimit = Math.PI / 180 * 90;

    if (audio) {
     this.arcRotateCamera.lowerRadiusLimit = 5;
     this.arcRotateCamera.upperRadiusLimit = 5;
    }

    // const ground: AbstractMesh = this.scene.getMeshesByTags('mediaGround')[0];
    // this.arcRotateCamera.zoomOn(ground);
    // tslint:disable-next-line:max-line-length
    // this.arcRotateCamera.radius = this.arcRotateCamera.radius + 0.2 * this.arcRotateCamera.radius;
  }

  public resetCameraMode() {
    // Arc Rotate Camera
    if (this.arcRotateCamera) {
      this.arcRotateCamera.dispose();
    }

    this.setDefaultPosition(0, 10, 100, 0, 0, 0);

    // Parameters (initial Position): alpha, beta, radius, target position, scene
    // this.arcRotateCamera = this.babylonService.createArcRotateCam(0, 10, 100);
    this.arcRotateCamera = this.createArcRotateCam(0, 10, 100);
    this.arcRotateCamera.allowUpsideDown = false;
    this.arcRotateCamera.panningSensibility = 25;
    this.arcRotateCamera.keysUp.push(87);
    this.arcRotateCamera.keysDown.push(83);
    this.arcRotateCamera.keysLeft.push(65);
    this.arcRotateCamera.keysRight.push(68);

    this.arcRotateCamera.attachControl(this.canvas, false);
    this.arcRotateCamera.checkCollisions = true;
    this.arcRotateCamera.collisionRadius = new Vector3(4, 4, 4);

  }

  private createAnimationsForCamera(
    camera: Camera | ArcRotateCamera, positionVector: Vector3,
    cameraAxis = ['x', 'y', 'z'], positionAxis = ['x', 'y', 'z'], frames = 30) {
    const creatAnimCam = (camAxis: string, posAxis: string) => {
      const anim = new Animation(
        'animCam', camAxis, frames,
        Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
      const multipleProperties = camAxis.indexOf('.') !== -1;
      let value = camera[camAxis];
      if (multipleProperties) {
        const props = camAxis.split('.');
        value = camera[props[0]][props[1]];
      }
      anim.setKeys([
        { frame: 0, value },
        { frame: frames, value: positionVector[posAxis] },
      ]);
      return anim;
    };

    const arr: Animation[] = [];
    for (let i = 0; i < 3; i++) {
      arr.push(creatAnimCam(cameraAxis[i], positionAxis[i]));
    }
    return arr;
  }

  public moveCameraToTarget(positionVector: Vector3) {
    this.arcRotateCamera.animations.push(
      ...this.createAnimationsForCamera(
        this.arcRotateCamera, positionVector, ['alpha', 'beta', 'radius']));

    this.scene.beginAnimation(this.arcRotateCamera, 0, 30, false, 1, () => {});
  }

  public getActualCameraPosAnnotation() {
    return {
      cameraType: 'arcRotateCam',
      position: {
        x: this.arcRotateCamera.alpha,
        y: this.arcRotateCamera.beta,
        z: this.arcRotateCamera.radius,
      },
      target: {
        x: this.arcRotateCamera.target.x,
        y: this.arcRotateCamera.target.y,
        z: this.arcRotateCamera.target.z,
      },
    };
    // const cameraPosition = [{dimension: 'x', value: this.arcRotateCamera.alpha},
    //   {dimension: 'y', value: this.arcRotateCamera.beta},
    //   {dimension: 'z', value: this.arcRotateCamera.radius}];
  }

  public getActualCameraPosInitialView() {
    return {
      cameraType: 'arcRotateCam',
      position: {
        x: this.arcRotateCamera.alpha,
        y: this.arcRotateCamera.beta,
        z: this.arcRotateCamera.radius,
      },
      target: {
        x: this.arcRotateCamera.target.x,
        y: this.arcRotateCamera.target.y,
        z: this.arcRotateCamera.target.z,
      },
    };
  }

  public async createScreenshot() {
    this.babylonService.hideMesh('plane', false);
    this.babylonService.hideMesh('label', false);
    await new Promise<any>((resolve, _) => this.babylonService.getEngine()
      .onEndFrameObservable
      .add(resolve));
    const result = await new Promise<string>((resolve, reject) => {
      const _activeCamera = this.babylonService.getScene().activeCamera;
      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshot(
          this.babylonService.getEngine(), _activeCamera, { precision: 2 }, async screenshot => {
            await fetch(screenshot)
              .then(res => res.blob())
              .then(blob =>
                Tools.Download(blob, `Kompakkt-${Date.now()}`))
              .then(() => resolve(screenshot))
              .catch(e => {
                console.error(e);
                reject(e);
              });
          });
      }
    });
    this.babylonService.hideMesh('plane', true);
    this.babylonService.hideMesh('label', true);
    return result;
  }

  public async createPreviewScreenshot(width?: number): Promise<string> {
    this.babylonService.hideMesh('plane', false);
    this.babylonService.hideMesh('label', false);
    await new Promise<any>((resolve, _) => this.babylonService.getEngine()
      .onEndFrameObservable
      .add(resolve));
    const result = await new Promise<string>((resolve, _) => {
      const _activeCamera = this.babylonService.getScene().activeCamera;
      if (_activeCamera instanceof Camera) {
        Tools.CreateScreenshot(
          this.babylonService.getEngine(), _activeCamera,
          (width)
            ? { width, height: Math.round((width / 16) * 9) }
            : { width: 400, height: 225 },
          screenshot => {
            resolve(screenshot);
          });
      }
    });
    this.babylonService.hideMesh('plane', true);
    this.babylonService.hideMesh('label', true);
    return result;
  }

}
