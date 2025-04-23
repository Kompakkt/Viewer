import {
  Animation,
  ArcRotateCamera,
  UniversalCamera,
  EasingFunction,
  QuarticEase,
  Scene,
  Vector3,
} from '@babylonjs/core';
import { BehaviorSubject } from 'rxjs';

const halfPi = Math.PI / 180;

export type CameraDefaults = { position: Vector3; target: Vector3 };
export const cameraDefaults$ = new BehaviorSubject<CameraDefaults>({
  position: new Vector3(0, 10, 100),
  target: Vector3.Zero(),
});
cameraDefaults$.subscribe(defaults => {
  console.log('Camera defaults set to', defaults);
});

export const resetCamera = (camera: ArcRotateCamera, scene: Scene) => {
  const { position, target } = cameraDefaults$.getValue();
  setCameraTarget(camera, target);
  moveCameraToTarget(camera, scene, position);
  return camera;
};

export const createDefaultCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  // Dispose existing camera
  if (scene.activeCamera) {
    (scene.activeCamera as ArcRotateCamera).dispose();
    scene.activeCamera = null;
  }

  const defaultRadius =
    Math.max(
      ...Object.values(scene.getWorldExtends())
        .flatMap(vector => vector.asArray())
        .map(v => Math.abs(v)),
    ) * 1.5;
  const camera = new ArcRotateCamera(
    'arcRotateCamera',
    -(Math.PI / 2),
    Math.PI / 2,
    defaultRadius,
    Vector3.Zero(),
    scene,
  );
  camera.lowerRadiusLimit = 0.1;
  camera.upperRadiusLimit = 45_000;
  camera.minZ = 0.05;
  camera.maxZ = 50_000;
  scene.activeCamera = camera;

  scene.activeCamera.attachControl(canvas);
  camera.setTarget(Vector3.Zero());
  camera.allowUpsideDown = false;

  // Adjust Zoom & Pan
  camera.wheelDeltaPercentage = 0;
  camera.pinchDeltaPercentage = 0;
  camera.panningSensibility = 250;

  return camera;
};

export const createUniversalCamera = (scene: Scene) => {
  const camera = new UniversalCamera('UniversalCamera', Vector3.Zero(), scene);
  camera.minZ = 0.05;
  camera.maxZ = 50_000;
  return camera;
};

export const setUpCamera = (camera: ArcRotateCamera, maxSize: number, mediaType: string) => {
  // camera for model, audio, video, image
  const radius = maxSize * 2.5;
  // camera.minZ = maxSize * 0.0001;
  // camera.maxZ = radius + maxSize;

  if (
    mediaType === 'entity' ||
    mediaType === 'model' ||
    mediaType === 'cloud' ||
    mediaType === 'splat'
  ) {
    camera.lowerAlphaLimit = null;
    camera.upperAlphaLimit = null;
    camera.lowerBetaLimit = 0.01;
    camera.upperBetaLimit = Math.PI - 0.01;
  } else {
    camera.lowerAlphaLimit = camera.upperAlphaLimit = halfPi * -90;
    camera.lowerBetaLimit = camera.upperBetaLimit = halfPi * 90;
  }
  if (mediaType !== 'audio') {
    // camera.lowerRadiusLimit = camera.minZ * 2;
    // camera.upperRadiusLimit = radius;
    // camera.speed = maxSize * 0.8;
  } else {
    camera.lowerRadiusLimit = camera.upperRadiusLimit = radius;
  }
  return camera;
};

const createAnimationsForCamera = (
  camera: ArcRotateCamera,
  positionVector: Vector3,
  cameraAxis = ['x', 'y', 'z'],
  positionAxis = ['x', 'y', 'z'],
  frames = 30,
) => {
  const creatAnimCam = (camAxis: string, posAxis: string) => {
    const anim = new Animation(
      'animCam',
      camAxis,
      frames,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CYCLE,
    );
    const multipleProperties = camAxis.indexOf('.') !== -1;
    let value = (camera as any)[camAxis];
    if (multipleProperties) {
      const props = camAxis.split('.');
      value = (camera as any)[props[0]][props[1]];
    }
    anim.setKeys([
      { frame: 0, value },
      { frame: frames, value: (positionVector as any)[posAxis] },
    ]);
    return anim;
  };

  const arr: Animation[] = [];
  for (let i = 0; i < 3; i++) {
    const anim = creatAnimCam(cameraAxis[i], positionAxis[i]);
    const ease = new QuarticEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
    anim.setEasingFunction(ease);
    arr.push(anim);
  }
  return arr;
};

export const moveCameraToTarget = (
  camera: ArcRotateCamera,
  scene: Scene,
  positionVector: Vector3,
) => {
  console.log('move Cam to', positionVector);

  camera.animations.push(
    ...createAnimationsForCamera(camera, positionVector, ['alpha', 'beta', 'radius']),
  );
  scene.beginAnimation(camera, 0, 30, false, 1, () => {});
};

export const setCameraTarget = (camera: ArcRotateCamera, target: Vector3) => {
  camera.setTarget(target, true);
};
