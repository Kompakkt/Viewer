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

export const resetCamera = (camera: ArcRotateCamera, canvas: HTMLCanvasElement) => {
  camera.allowUpsideDown = false;
  camera.panningSensibility = 25;
  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysLeft.push(65);
  camera.keysRight.push(68);
  camera.attachControl(canvas, false);

  // Set limits to ArcRotateCamera defaults
  camera.lowerAlphaLimit = camera.upperAlphaLimit = null;
  camera.lowerBetaLimit = 0.01;
  camera.upperBetaLimit = 3.1315926535897933;
  camera.lowerRadiusLimit = camera.upperRadiusLimit = null;

  return camera;
};

export const createDefaultCamera = (scene: Scene, canvas: HTMLCanvasElement) => {
  const camera = new ArcRotateCamera('arcRotateCamera', 0, 10, 100, Vector3.Zero(), scene);

  // Override setPosition to always store new Position in DEFAULTS
  camera.setPosition = (position: Vector3) => {
    if (!camera._position.equals(position)) {
      camera._position.copyFrom(position)      ;
      camera.rebuildAnglesAndRadius();
    }
    DEFAULTS.position.alpha = position.x;
    DEFAULTS.position.beta = position.y;
    DEFAULTS.position.radius = position.z;
  };

  return resetCamera(camera, canvas);
};

export const setCameraTo2DMode = (camera: ArcRotateCamera, isAudio?: boolean) => {
  camera.setPosition(new Vector3(0, halfPi * 90, (isAudio ? 5 : 150)));
  camera.lowerAlphaLimit = camera.upperAlphaLimit = halfPi * -90;
  camera.lowerBetaLimit = camera.upperBetaLimit = halfPi * 90;

  if (isAudio) {
    camera.lowerRadiusLimit = camera.upperRadiusLimit = 5;
  }
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

export const moveCameraToTarget = (camera: ArcRotateCamera, scene: Scene, positionVector: Vector3) => {

  camera.animations.push(
    ...createAnimationsForCamera(
      camera, positionVector, ['alpha', 'beta', 'radius']));
  scene.beginAnimation(camera, 0, 30, false, 1, () => { });
};

export const setCameraTarget = (camera: ArcRotateCamera, target: Vector3) => {
  camera.setTarget(target, true);
};
