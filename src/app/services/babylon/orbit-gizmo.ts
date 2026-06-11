import {
  ActionManager,
  Angle,
  ArcRotateCamera,
  Color3,
  Color4,
  CreateGreasedLine,
  DynamicTexture,
  Engine,
  ExecuteCodeAction,
  InterpolateValueAction,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import { smoothCameraTransition } from './camera-handler';

export const createOrbitGizmo = ({
  canvas,
  getArcRotateCamera,
  mainEngine,
}: {
  canvas: HTMLCanvasElement;
  getArcRotateCamera: () => ArcRotateCamera;
  mainEngine: Engine;
}) => {
  canvas.id = 'gizmoCanvas';
  canvas.style.setProperty('position', 'fixed');
  canvas.style.setProperty('top', '0');
  canvas.style.setProperty('right', '0');
  canvas.style.setProperty('background', 'rgba(0, 0, 0, 0.2)');
  canvas.style.setProperty('border-radius', '50%');
  canvas.style.setProperty('margin', '12px');
  const viewportMinSize = 10;
  canvas.style.setProperty('width', `min(${viewportMinSize}vw, ${viewportMinSize}vh)`);
  canvas.style.setProperty('height', `min(${viewportMinSize}vw, ${viewportMinSize}vh)`);

  const engine = new Engine(canvas, true, {
    audioEngine: false,
    preserveDrawingBuffer: true,
    stencil: true,
  });
  engine.maxFPS = mainEngine.maxFPS;
  const scene = new Scene(engine);
  scene.createDefaultEnvironment({ createGround: false, createSkybox: false });
  scene.clearColor = new Color4(0, 0, 0, 0);

  const arcRotateCamera = new ArcRotateCamera(
    'gizmoCam',
    -Math.PI / 2,
    Math.PI / 2,
    10,
    Vector3.Zero(),
    scene,
  );
  const defaultRadius = 5;
  arcRotateCamera.radius = defaultRadius;
  arcRotateCamera.fov = Angle.FromDegrees(37).radians();
  arcRotateCamera.panningSensibility = 0;
  arcRotateCamera.speed = 10;
  // Large values effectively disable these
  arcRotateCamera.wheelPrecision = 10_000_000;
  arcRotateCamera.pinchPrecision = 10_000_000;

  const sphere = MeshBuilder.CreateSphere('gizmoSphere', { diameter: 2 }, scene);
  const mat = new StandardMaterial('gizmoMat', scene);
  mat.emissiveColor = new Color3(0.75, 0.75, 0.75);
  sphere.material = mat;
  sphere.visibility = 0.01;

  // Create 6 smaller discs to indicate orientation axes
  const lineTarget: Record<string, Vector3> = {
    x: new Vector3(1, 0, 0),
    y: new Vector3(0, 1, 0),
    z: new Vector3(0, 0, 1),
  };
  const _discs = ['x', 'y', 'z'].flatMap((axis, i) => {
    const axisUpper = axis.toUpperCase();
    const positive = MeshBuilder.CreateDisc(`gizmo${axisUpper}+`, { radius: 0.5 }, scene);
    const negative = MeshBuilder.CreateDisc(`gizmo${axisUpper}-`, { radius: 0.5 }, scene);

    const color = [new Color3(1, 0, 0), new Color3(0, 1, 0), new Color3(0, 0, 1)][i];

    const _positiveLine = CreateGreasedLine(
      `gizmo${axisUpper}+Line`,
      { points: [Vector3.Zero(), lineTarget[axis]], updatable: true, widths: [2, 2] },
      { color },
      scene,
    );
    const negativeLine = CreateGreasedLine(
      `gizmo${axisUpper}-Line`,
      { points: [Vector3.Zero(), lineTarget[axis].negate()], updatable: true, widths: [2, 2] },
      { color },
      scene,
    );
    negativeLine.visibility = 0.75;

    [positive, negative].forEach((disc, j) => {
      const textLabel = new DynamicTexture(
        `gizmoLabel${axisUpper}${j}`,
        { width: 64, height: 64 },
        scene,
      );
      textLabel.drawText(
        j === 0 ? axisUpper : `-${axisUpper}`,
        null,
        48,
        'bold 36px monospace',
        'white',
        'transparent',
        false,
      );
      const labelMat = new StandardMaterial(`gizmoLabelMat${axisUpper}${j}`, scene);
      labelMat.emissiveTexture = j === 0 ? textLabel : null;
      labelMat.emissiveColor = color;
      labelMat.disableLighting = true;

      disc.billboardMode = Mesh.BILLBOARDMODE_ALL;
      disc.visibility = j === 0 ? 1 : 0.75; // Dim negative
      disc.material = labelMat;
      disc.position[axis as 'x' | 'y' | 'z'] = j === 0 ? 1 : -1;
      disc.renderingGroupId = 1;
      disc.actionManager = new ActionManager(scene);

      if (j === 1) {
        disc.scaling = new Vector3(0.75, 0.75, 0.75);
        const actions = [
          new InterpolateValueAction(
            ActionManager.OnPointerOverTrigger,
            disc,
            'scaling',
            new Vector3(1, 1, 1),
            100,
          ),
          new InterpolateValueAction(
            ActionManager.OnPointerOverTrigger,
            disc,
            'visibility',
            1,
            100,
          ),
          new InterpolateValueAction(
            ActionManager.OnPointerOutTrigger,
            disc,
            'scaling',
            new Vector3(0.75, 0.75, 0.75),
            100,
          ),
          new InterpolateValueAction(
            ActionManager.OnPointerOutTrigger,
            disc,
            'visibility',
            0.75,
            100,
          ),
          new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
            labelMat.emissiveTexture = textLabel;
          }),
          new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
            labelMat.emissiveTexture = null;
          }),
        ];
        actions.forEach(action => disc.actionManager!.registerAction(action));
      } else {
        const actions = [
          new InterpolateValueAction(
            ActionManager.OnPointerOverTrigger,
            labelMat,
            'emissiveColor',
            color.scale(0.5),
            100,
          ),
          new InterpolateValueAction(
            ActionManager.OnPointerOutTrigger,
            labelMat,
            'emissiveColor',
            color,
            100,
          ),
        ];
        actions.forEach(action => disc.actionManager!.registerAction(action));
      }
    });
    return [positive, negative];
  });

  let isMouseInCanvas = false;
  let isAnimating = false;

  canvas.addEventListener('mouseenter', () => {
    isMouseInCanvas = true;
  });
  canvas.addEventListener('mouseleave', () => {
    isMouseInCanvas = false;
  });

  canvas.addEventListener('click', () => {
    if (isAnimating) return;
    const { pointerX, pointerY } = scene;
    // Shoot ray from camera to click position
    const ray = scene.createPickingRay(pointerX, pointerY, null, arcRotateCamera);
    const hit = ray.intersectsMeshes(_discs);
    const firstHit = hit.at(0);
    if (!firstHit) return;
    const name = firstHit.pickedMesh?.name;
    if (!name || !name.startsWith('gizmo')) return;
    const [axis, sign] = name.replace('gizmo', '').toLowerCase().split('');
    if (!['x', 'y', 'z'].includes(axis) || !['+', '-'].includes(sign)) return;
    const isPositive = sign === '+';

    // Move the camera to look at the target from the direction of the clicked axis, with the same distance to the target as it currently has
    // Needs to be perfectly aligned with the axis afterwards
    const camera = getArcRotateCamera();
    if (!camera) return;
    const target = camera.target;
    const radius = camera.radius;

    const direction = new Vector3(
      axis === 'x' ? (isPositive ? radius : -radius) : 0,
      axis === 'y' ? (isPositive ? radius : -radius) : 0,
      axis === 'z' ? (isPositive ? radius : -radius) : 0,
    );
    const position = target.add(direction);
    isAnimating = true;

    const ref = smoothCameraTransition({ camera, scene, position, target }, 2);
    ref?.onAnimationEndObservable.addOnce(() => {
      isAnimating = false;
    });
  });

  const render = () => {
    const activeCamera = getArcRotateCamera();
    if (!activeCamera) return;

    if (!isMouseInCanvas || isAnimating) {
      arcRotateCamera.alpha = activeCamera.alpha;
      arcRotateCamera.beta = activeCamera.beta;
    } else {
      activeCamera.alpha = arcRotateCamera.alpha;
      activeCamera.beta = arcRotateCamera.beta;
    }

    arcRotateCamera.radius = defaultRadius;
    scene.render();
  };
  return { render, engine, scene };
};
