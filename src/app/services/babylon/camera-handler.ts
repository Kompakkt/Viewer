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

export type CameraDefaults = {
  alpha: number;
  beta: number;
  radius: number;
  target: Vector3;
};
export const cameraDefaults$ = new BehaviorSubject<CameraDefaults>({
  alpha: -(Math.PI / 2),
  beta: Math.PI / 2,
  radius: 100,
  target: Vector3.Zero(),
});
cameraDefaults$.subscribe(defaults => {
  console.log('Camera defaults set to', defaults);
});

export const resetCamera = (camera: ArcRotateCamera, scene: Scene) => {
  const { alpha, beta, radius, target } = cameraDefaults$.getValue();
  smoothCameraTransitionFromSpherical({
    camera,
    scene,
    alpha,
    beta,
    radius,
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

export const smoothCameraTransition = (
  {
    camera,
    scene,
    position,
    target,
  }: {
    camera: ArcRotateCamera;
    scene: Scene;
    position?: Vector3;
    target?: Vector3;
  },
  speed = 1,
) => {
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

  const animAlpha = new Animation(
    'camera_alpha_animation',
    'alpha',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animBeta = new Animation(
    'camera_beta_animation',
    'beta',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animRadius = new Animation(
    'camera_radius_animation',
    'radius',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animTarget = new Animation(
    'camera_target_animation',
    'target',
    FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );

  const tempCamera = camera.clone('tempCamera') as ArcRotateCamera;
  tempCamera.setTarget(target);
  tempCamera.setPosition(position);
  const tempAlpha = tempCamera.alpha;
  const tempBeta = tempCamera.beta;
  const tempRadius = tempCamera.radius;
  tempCamera.dispose();

  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: FPS, value: tempAlpha },
  ]);

  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: FPS, value: tempBeta },
  ]);

  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: FPS, value: tempRadius },
  ]);

  animTarget.setKeys([
    { frame: 0, value: camera.target.clone() },
    { frame: FPS, value: target.clone() },
  ]);

  const ease = new QuarticEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  animTarget.setEasingFunction(ease);
  animAlpha.setEasingFunction(ease);
  animBeta.setEasingFunction(ease);
  animRadius.setEasingFunction(ease);

  const animations = [animTarget, animAlpha, animBeta, animRadius];

  return scene.beginDirectAnimation(camera, animations, 0, FPS, false, speed);
};

export const smoothCameraTransitionFromSpherical = (
  {
    camera,
    scene,
    alpha,
    beta,
    radius,
    target,
  }: {
    camera: ArcRotateCamera;
    scene: Scene;
    alpha: number;
    beta: number;
    radius: number;
    target: Vector3;
  },
  speed = 1,
) => {
  // Shortest-path alpha wrap: pick the equivalent alpha value within ±π of
  // the camera's current alpha so the animation takes the short way around.
  const TAU = Math.PI * 2;
  const delta = ((((alpha - camera.alpha + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  const wrappedAlpha = camera.alpha + delta;

  const animAlpha = new Animation(
    'camera_alpha_animation',
    'alpha',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animBeta = new Animation(
    'camera_beta_animation',
    'beta',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animRadius = new Animation(
    'camera_radius_animation',
    'radius',
    FPS,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );
  const animTarget = new Animation(
    'camera_target_animation',
    'target',
    FPS,
    Animation.ANIMATIONTYPE_VECTOR3,
    Animation.ANIMATIONLOOPMODE_CYCLE,
  );

  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: FPS, value: wrappedAlpha },
  ]);

  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: FPS, value: beta },
  ]);

  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: FPS, value: radius },
  ]);

  animTarget.setKeys([
    { frame: 0, value: camera.target.clone() },
    { frame: FPS, value: target.clone() },
  ]);

  const ease = new QuarticEase();
  ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  animTarget.setEasingFunction(ease);
  animAlpha.setEasingFunction(ease);
  animBeta.setEasingFunction(ease);
  animRadius.setEasingFunction(ease);

  const animations = [animTarget, animAlpha, animBeta, animRadius];

  return scene.beginDirectAnimation(camera, animations, 0, FPS, false, speed);
};
