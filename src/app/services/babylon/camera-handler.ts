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
  smoothCameraTransition({
    camera,
    scene,
    position,
    target,
  });
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

const FPS = 24;

export const smoothCameraTransition = ({
  camera,
  scene,
  position,
  target,
}: {
  camera: ArcRotateCamera;
  scene: Scene;
  position?: Vector3;
  target?: Vector3;
}) => {
  console.log(
    'SmoothCameraTransition from',
    JSON.stringify([camera.position, camera.target]),
    'to',
    JSON.stringify([position, target]),
  );

  if (!position && !target) return;
  camera.position = new Vector3(camera.position.x, camera.position.y, camera.position.z);
  camera.target = new Vector3(camera.target.x, camera.target.y, camera.target.z);

  position ??= camera.position;
  target ??= camera.target;

  const animPosition = new Animation(
    'camera_position_animation',
    'position',
    FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animTarget = new Animation(
    'camera_target_animation',
    'target',
    FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );

  animPosition.setKeys([
    { frame: 0, value: camera.position.clone() },
    { frame: FPS, value: position.clone() },
  ]);

  animTarget.setKeys([
    { frame: 0, value: camera.target.clone() },
    { frame: FPS, value: target.clone() },
  ]);

  console.log('SmoothCameraTransition', animPosition);

  const ease = new QuarticEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  animPosition.setEasingFunction(ease);
  animTarget.setEasingFunction(ease);

  scene.beginDirectAnimation(camera, [animPosition, animTarget], 0, FPS, false);
};
