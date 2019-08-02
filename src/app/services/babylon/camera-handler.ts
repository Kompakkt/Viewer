import { Animation, ArcRotateCamera, Scene, Vector3 } from 'babylonjs';

const halfPi = Math.PI / 180;
const DEFAULTS: {
  position: {
    alpha: number;
    beta: number;
    radius: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
} = {
  position: {
    alpha: 0, beta: 10, radius: 100,
  },
  target: {
    x: 0, y: 0, z: 0,
  },
};

export const updateDefaults = (positionVector: Vector3, targetVector: Vector3) => {
  DEFAULTS.position = {
    alpha: positionVector.x,
    beta: positionVector.y,
    radius: positionVector.z,
  };
  DEFAULTS.target = targetVector;
};

export const resetCamera = (camera: ArcRotateCamera, scene: Scene) => {
  const target = new Vector3(DEFAULTS.target.x, DEFAULTS.target.y, DEFAULTS.target.z);
  setCameraTarget(camera, target);
  const position = new Vector3(DEFAULTS.position.alpha,
                               DEFAULTS.position.beta, DEFAULTS.position.radius);
  moveCameraToTarget(camera, scene, position);
  return camera;
};

export const createDefaultCamera = (scene: Scene, canvas: HTMLCanvasElement) => {

  // Dispose existing camera
  if (scene.activeCamera) {
    (scene.activeCamera as ArcRotateCamera).dispose();
    scene.activeCamera = null;
  }
  // Camera
  const worldExtends = scene.getWorldExtends();
  const worldSize = worldExtends.max.subtract(worldExtends.min);
  const worldCenter = worldExtends.min.add(worldSize.scale(0.5));

  let camera: ArcRotateCamera;
  let radius = worldSize.length() * 1.5;
    // empty scene scenario!
  if (!isFinite(radius)) {
      radius = 1;
      worldCenter.copyFromFloats(0, 0, 0);
    }

// Parameters: alpha, beta, radius, target position, scene
  const arcRotateCamera = new ArcRotateCamera('arcRotateCamera', -(Math.PI / 2),
                                              Math.PI / 2, radius, worldCenter, scene);
  arcRotateCamera.lowerRadiusLimit = radius * 0.01;
  camera = arcRotateCamera;

  camera.minZ = radius * 0.01;
  camera.maxZ = radius * 1000;
  camera.speed = radius * 0.2;
  scene.activeCamera = camera;

  scene.activeCamera.attachControl(canvas);
  camera.setTarget(Vector3.Zero());
  camera.allowUpsideDown = false;

    // Override setPosition to always store new Position in DEFAULTS
  camera.setPosition = (position: Vector3) => {
      if (!camera._position.equals(position)) {
        camera._position.copyFrom(position);
        camera.rebuildAnglesAndRadius();
      }
      DEFAULTS.position.alpha = position.x;
      DEFAULTS.position.beta = position.y;
      DEFAULTS.position.radius = position.z;
    };

  return camera;
  };

export const setUpCamera = (camera: ArcRotateCamera, maxSize: number, mediaType: string) => {

  const radius = maxSize * 4;
  camera.minZ = radius * 0.01;
  camera.maxZ = radius + maxSize;
  camera.speed = radius * 0.8;

  if (mediaType === 'entity' || mediaType === 'model') {
      camera.lowerAlphaLimit = null;
      camera.upperAlphaLimit = null;
      camera.lowerBetaLimit = 0.1;
      camera.upperBetaLimit = Math.PI;
    } else {
      camera.lowerAlphaLimit = camera.upperAlphaLimit = halfPi * -90;
      camera.lowerBetaLimit = camera.upperBetaLimit = halfPi * 90;
    }
  if (mediaType !== 'audio') {
          camera.lowerRadiusLimit = 0;
          camera.upperRadiusLimit = radius;
        } else {
          camera.lowerRadiusLimit = camera.upperRadiusLimit = maxSize * 4;
        }

  /*
  camera.collisionRadius
    .copyFromFloats(maxSize * 0.8, maxSize * 0.8 - maxSize * 0.35, maxSize * 0.8);
  camera.checkCollisions = true;*/
  return camera;
};

const createAnimationsForCamera = (
  camera: ArcRotateCamera, positionVector: Vector3,
  cameraAxis = ['x', 'y', 'z'], positionAxis = ['x', 'y', 'z'], frames = 30) => {

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
};

export const moveCameraToTarget = (camera: ArcRotateCamera,
                                   scene: Scene, positionVector: Vector3) => {
console.log('move Cam to', positionVector);
camera.animations.push(
    ...createAnimationsForCamera(
      camera, positionVector, ['alpha', 'beta', 'radius']));
scene.beginAnimation(camera, 0, 30, false, 1, () => { });
};

export const setCameraTarget = (camera: ArcRotateCamera, target: Vector3) => {
  camera.setTarget(target, true);
};

export const getDefaultPosition = () => {
  const position = new Vector3(DEFAULTS.position.alpha,
                               DEFAULTS.position.beta, DEFAULTS.position.radius);
  return position;
};

export const getDefaultTarget = () => {
  const target = new Vector3(DEFAULTS.target.x, DEFAULTS.target.y, DEFAULTS.target.z);
  return target;
};
