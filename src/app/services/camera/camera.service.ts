import {Injectable} from '@angular/core';
import {Animation, ArcRotateCamera, Camera, Scene, Vector3} from 'babylonjs';

import {BabylonService} from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root',
})
export class CameraService {

  private canvas: HTMLCanvasElement;
  private scene: Scene;

  public arcRotateCamera = this.babylonService.createArcRotateCam(0, 10, 100);
  // private universalCamera: UniversalCamera;

  // Parameters (initial Position): alpha, beta, radius,
  public alpha: number | undefined;
  public beta: number | undefined;
  public radius: number | undefined;
  // target
  public x: number | undefined;
  public y: number | undefined;
  public z: number | undefined;
  /*
    private xRot: number;
    private yRot: number;*/

  constructor(private babylonService: BabylonService) {
    this.scene = this.babylonService.getScene();
    this.scene.collisionsEnabled = true;
    this.canvas = this.babylonService.getCanvas();

    // Parameters (initial Position): alpha, beta, radius, target position, scene
    // this.arcRotateCamera = this.babylonService.createArcRotateCam(0, 10, 100);
    this.arcRotateCamera.allowUpsideDown = false;
    this.arcRotateCamera.panningSensibility = 25;
    this.arcRotateCamera.keysUp.push(87);
    this.arcRotateCamera.keysDown.push(83);
    this.arcRotateCamera.keysLeft.push(65);
    this.arcRotateCamera.keysRight.push(68);

    this.arcRotateCamera.attachControl(this.canvas, false);
    this.arcRotateCamera.checkCollisions = true;
    this.arcRotateCamera.collisionRadius = new Vector3(4, 4, 4);

    /*
this.universalCamera = new UniversalCamera('universalCamera',
new Vector3(this.x, this.y, this.z), this.scene);

this.universalSettings();

this.xRot = this.universalCamera.rotation.x;
this.yRot = this.universalCamera.rotation.y;
*/
  }

  // VR BUTTON
  public createVrHelperInCamera(): void {
    this.babylonService.createVRHelper();
    const vrHelper = this.babylonService.getVRHelper();
    if (vrHelper) vrHelper.enterVR();
  }

  /*
  public setCamArcRotate(): void {
    if (!this.scene.activeCamera) {
      throw new Error('ActiveCamera missing');
      console.error(this);
      return;
    }
    if (this.scene.activeCamera.getClassName() !== 'ArcRotateCamera') {

      this.setCameraActive(this.arcRotateCamera);
      this.arcRotateSettings();
    }
  }

  public setCamUniversal(): void {
    if (!this.scene.activeCamera) {
      throw new Error('ActiveCamera missing');
      console.error(this);
      return;
    }
    if (this.scene.activeCamera.getClassName() !== 'UniversalCamera') {

      this.setCameraActive(this.universalCamera);
      this.universalSettings();
    }
  }*/

  public backToDefault(): void {
    const positionVector = new Vector3(this.alpha, this.beta, this.radius);
    this.moveCameraToTarget(positionVector);
    const positionTarget = new Vector3(this.x, this.y, this.z);
    this.arcRotateCamera.setTarget(positionTarget);

  }

  public setDefaultPosition(alpha: number, beta: number, radius: number, x: number, y: number, z: number) {
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
    this.arcRotateCamera = this.babylonService.createArcRotateCam(0, 10, 100);
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
  /*
   private setCameraDefaults(camera: any): void {

     camera.keysUp.push(87);
     camera.keysDown.push(83);
     camera.keysLeft.push(65);
     camera.keysRight.push(68);
     camera.setTarget(Vector3.Zero());
   }
   private setCameraActive(newActiveCamera: any): void {
     if (!this.scene.activeCamera) {
      throw new Error('ActiveCamera missing');
      console.error(this);
      return;
      }
     this.scene.activeCamera.detachControl(this.canvas);
     this.scene.activeCamera = newActiveCamera;
     newActiveCamera.attachControl(this.canvas, false);
   }

   private arcRotateSettings(): void {

     this.arcRotateCamera.panningSensibility = 25;
     this.arcRotateCamera.upperRadiusLimit = 500;
     this.setCameraDefaults(this.arcRotateCamera);
     this.canvas.focus();
   }

   private universalSettings(): void {

     this.universalCamera.position.x = this.x;
     this.universalCamera.position.y = this.y;
     this.universalCamera.position.z = this.z;
     this.universalCamera.ellipsoid = new Vector3(10, 10, 10);
     this.universalCamera.checkCollisions = true;
     this.setCameraDefaults(this.universalCamera);
     this.canvas.focus();
   }

  private setCamArcRotateDefault() {

    this.scene.activeCamera = this.arcRotateCamera;
    this.arcRotateCamera.attachControl(this.canvas, false);

    const name = 'animCam',
      frames = 30;

    const animCamAlpha = new Animation(name, 'alpha', frames,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamAlpha.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.alpha
      }, {
        frame: 30,
        value: this.alpha
      }
    ]);
    this.arcRotateCamera.animations.push(animCamAlpha);

    const animCamBeta = new Animation(name, 'beta', frames,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamBeta.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.beta
      }, {
        frame: 30,
        value: this.beta
      }]);
    this.arcRotateCamera.animations.push(animCamBeta);

    const animCamRadius = new Animation(name, 'radius', frames,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    animCamRadius.setKeys([
      {
        frame: 0,
        value: this.arcRotateCamera.radius
      }, {
        frame: 30,
        value: this.radius
      }]);
    this.arcRotateCamera.animations.push(animCamRadius);

    this.arcRotateCamera.setTarget(Vector3.Zero());

    this.scene.beginAnimation(this.arcRotateCamera, 0, 30, false, 1, function () {
    });
  }

  private setCamUniversalDefault() {
    const setBackAnm = new Animation('animCam', 'position', 30,
      Animation.ANIMATIONTYPE_VECTOR3,
      Animation.ANIMATIONLOOPMODE_CONSTANT);

    const setBackRotXAnm = new Animation('animCam', 'rotation.x', 30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    const setBackRotYAnm = new Animation('animCam', 'rotation.y', 30,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE);

    setBackAnm.setKeys([{
      frame: 0,
      value: new Vector3(this.universalCamera.position.x, this.universalCamera.position.y, this.universalCamera.position.z)
    }, {
      frame: 30,
      value: new Vector3(this.x, this.y, this.z)
    }]);
    setBackRotXAnm.setKeys([{
      frame: 15,
      value: this.universalCamera.rotation.x
    }, {
      frame: 30,
      value: this.xRot
    }]);
    setBackRotYAnm.setKeys([{
      frame: 15,
      value: this.universalCamera.rotation.y
    }, {
      frame: 30,
      value: this.yRot
    }]);

    this.universalCamera.animations.push(setBackAnm);
    this.universalCamera.animations.push(setBackRotXAnm);
    this.universalCamera.animations.push(setBackRotYAnm);

    this.scene.beginAnimation(this.universalCamera, 0, 30, false, 1, function () {
    });
  }*/

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

  public moveVRCameraToTarget(positionVector: Vector3) {
    if (!this.scene.activeCamera) {
      throw new Error('ActiveCamera missing');
      console.error(this);
      return;
    }

    this.scene.activeCamera.animations.push(
      ...this.createAnimationsForCamera(
        this.scene.activeCamera, positionVector,
        ['position.x', 'position.y', 'position.z']));

    this.scene.beginAnimation(this.scene.activeCamera, 0, 30, false, 1, () => {})
      .onAnimationEndObservable
      .add(() => {
        // FOR VR-HUD
        // console.log("Active-Camera - 0 Sek After Animation");
        // console.log(this.scene.activeCamera.position);
        this.babylonService.vrJump = true;
      });
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

}
