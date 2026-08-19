import { effect, EventEmitter, inject, Injectable, Output, signal } from '@angular/core';
import {
  Color3,
  Mesh,
  MeshBuilder,
  Quaternion,
  RotationGizmo,
  StandardMaterial,
  Tags,
  TransformNode,
  UtilityLayerRenderer,
  Vector3,
} from '@babylonjs/core';
import type { DragEvent, DragStartEndEvent, Observer } from '@babylonjs/core';
import { debounceTime, distinctUntilChanged, filter, firstValueFrom } from 'rxjs';
import { IColor, IEntitySettings, IVector3 } from '@kompakkt/common';
import { minimalSettings } from '../../../assets/settings/settings';
import { AnnotationService } from '../annotation/annotation.service';
import { BabylonService } from '../babylon/babylon.service';
import { LightService } from '../light/light.service';
import { ProcessingService } from '../processing/processing.service';
import {
  createBoundingBox,
  createGround,
  createlocalAxes,
  createWorldAxis,
} from './visualUIHelper';
import { LoadingScreenService } from '../babylon/loadingscreen';
import { PostMessageService } from '../post-message/post-message.service';
import { CameraHandlerService } from '../babylon/camera-handler.service';

const isDegreeSpectrum = (value: number) => {
  return value >= 0 && value <= 360 ? value : value > 360 ? 360 : 0;
};

// Some models have uniform scaling, others non-uniform scaling
const getScaleVector = (scale: number | IVector3) => {
  if (typeof scale === 'number') {
    return new Vector3(scale, scale, scale);
  } else {
    return new Vector3(scale.x, scale.y, scale.z);
  }
};

const rotationGizmoSnapStepRad = Math.PI / 180;

interface RotationDragTooltip {
  text: string;
  x: number;
  y: number;
}

@Injectable({ providedIn: 'root' })
export class EntitySettingsService {
  private babylon = inject(BabylonService);
  private cameraHandler = inject(CameraHandlerService);
  private processing = inject(ProcessingService);
  private lights = inject(LightService);
  private annotationService = inject(AnnotationService);
  private loadingScreen = inject(LoadingScreenService);
  private postMessage = inject(PostMessageService);

  private min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  private max = new Vector3(Number.MAX_VALUE * -1, Number.MAX_VALUE * -1, Number.MAX_VALUE * -1);
  public initialSize = Vector3.Zero();
  private initialCenterPoint = Vector3.Zero();
  private currentCenterPoint = Vector3.Zero();
  private center: Mesh | undefined;
  public boundingBox: Mesh | undefined;

  @Output() meshSettingsCompleted = new EventEmitter<boolean>();
  public ground: Mesh | undefined;
  private groundInitialSize = 0;
  public localAxisInitialSize = 0;
  public worldAxisInitialSize = 0;
  public rotationQuaternion = signal(Quaternion.RotationYawPitchRoll(0, 0, 0));
  public entitySize = signal({
    height: (0).toFixed(2),
    width: (0).toFixed(2),
    depth: (0).toFixed(2),
  });

  private utilityLayer?: UtilityLayerRenderer;
  private rotationGizmo?: RotationGizmo;
  private rotationGizmoAnchor?: TransformNode;
  private rotationGizmoDragObserver?: Observer<DragEvent>;
  private rotationGizmoDragEndObserver?: Observer<DragStartEndEvent>;
  private rotationGizmoAxisDragObservers: {
    axis: 'x' | 'y' | 'z';
    observer: Observer<DragEvent>;
  }[] = [];

  readonly rotationDragTooltip = signal<RotationDragTooltip | null>(null);

  private entitySettings = signal<IEntitySettings>(minimalSettings);
  public helpersReady = signal(false);

  constructor() {
    effect(() => {
      const { entity, meshes, settings } = this.processing.state();
      if (!entity || !meshes) return;
      console.log('[EntitySettingsService]', entity?._id, {
        settings,
        entity,
        meshes,
      });
      this.entitySettings.set(settings);
      requestAnimationFrame(() => {
        try {
          this.setUpSettings();
          console.log('[EntitySettingsService]','Settings loaded');
        } catch (err) {
          console.error('[EntitySettingsService]','Settings not loaded', err);
        }
        this.loadingScreen.hide();
        this.postMessage.sendToParent({
          type: 'settingsLoaded',
          data: {},
        });
      });
    });
  }

  private resetInitialValues() {
    this.min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.max = new Vector3(Number.MAX_VALUE * -1, Number.MAX_VALUE * -1, Number.MAX_VALUE * -1);
    this.initialSize = Vector3.Zero();
    this.initialCenterPoint = Vector3.Zero();
    this.currentCenterPoint = Vector3.Zero();
    this.groundInitialSize = 0;
    this.localAxisInitialSize = 0;
    this.worldAxisInitialSize = 0;
    this.rotationQuaternion.set(Quaternion.RotationYawPitchRoll(0, 0, 0));
    this.entitySize.set({
      height: (0).toFixed(2),
      width: (0).toFixed(2),
      depth: (0).toFixed(2),
    });
  }

  private setUpSettings() {
    const meshes = this.processing.meshes();
    const isInUpload = this.processing.isInUpload();
    const hasMeshSettings = this.processing.hasMeshSettings();
    console.log('[EntitySettingsService]', { meshes, isInUpload, hasMeshSettings });
    if (!meshes || meshes.length === 0) {
      throw new Error('No meshes available.');
    }
    this.resetInitialValues();
    this.initialiseSizeValues();
    this.setUpMeshSettingsHelper();
    this.createVisualUIMeshSettingsHelper();
    this.loadSettings();
    if (!isInUpload || !hasMeshSettings) {
      this.destroyMesh('boundingBox');
      this.decomposeMeshSettingsHelper();
    }

    // Force redraw annotation markers to fix annotations being offset from the entity if the entity is parented to center
    this.annotationService.redrawMarker();
  }

  private initialiseSizeValues() {
    this.calculateMinMax();
    this.initialSize = this.max.subtract(this.min);
    this.entitySize.set({
      height: this.initialSize.y.toFixed(2),
      width: this.initialSize.x.toFixed(2),
      depth: this.initialSize.z.toFixed(2),
    });
    const centerVector =new Vector3(
      this.max.x - this.initialSize.x / 2,
      this.max.y - this.initialSize.y / 2,
      this.max.z - this.initialSize.z / 2,
    );
    this.initialCenterPoint = centerVector.clone();
    this.currentCenterPoint = centerVector.clone();
  }

  private calculateMinMax() {
    const meshes = this.processing.meshes();
    if (!meshes) {
      throw new Error('Meshes missing');
    }
    meshes.forEach(mesh => {
      mesh.computeWorldMatrix(true);
      // see if mesh is visible or just a dummy
      const bi = mesh.getBoundingInfo();
      if (bi.diagonalLength !== 0) {
        // compare min max values
        const minimum = bi.boundingBox.minimumWorld;
        const maximum = bi.boundingBox.maximumWorld;

        if (minimum.x < this.min.x) {
          this.min.x = minimum.x;
        }
        if (minimum.y < this.min.y) {
          this.min.y = minimum.y;
        }
        if (minimum.z < this.min.z) {
          this.min.z = minimum.z;
        }
        if (maximum.x > this.max.x) {
          this.max.x = maximum.x;
        }
        if (maximum.y > this.max.y) {
          this.max.y = maximum.y;
        }
        if (maximum.z > this.max.z) {
          this.max.z = maximum.z;
        }
      }
    });
  }

  private setUpMeshSettingsHelper() {
    const meshes = this.processing.meshes();
    if (!meshes) {
      throw new Error('No meshes available.');
    }
    this.center?.dispose();

    this.center = MeshBuilder.CreateBox('center', { size: 0.01 }, this.babylon.getScene());
    this.center.isPickable = false;
    Tags.AddTagsTo(this.center, 'center');
    this.center.isVisible = false;

    // rotation to zero
    this.center.rotationQuaternion = this.rotationQuaternion();

    // position model to origin of the world coordinate system
    if (this.min.x > 0) {
      this.center.position.x = -this.min.x;
    }
    if (this.min.x < 0) {
      this.center.position.x = Math.abs(this.min.x);
    }
    if (this.min.y > 0) {
      this.center.position.y = -this.min.y;
    }
    if (this.min.y < 0) {
      this.center.position.y = Math.abs(this.min.y);
    }
    if (this.min.z > 0) {
      this.center.position.z = -this.min.z;
    }
    if (this.min.z < 0) {
      this.center.position.z = Math.abs(this.min.z);
    }

    this.currentCenterPoint = new Vector3(
      this.initialSize.x / 2,
      this.initialSize.y / 2,
      this.initialSize.z / 2,
    );

    // pivot to the center of the (visible) model
    this.center.setPivotPoint(this.initialCenterPoint);

    meshes.forEach(mesh => {
      if (!mesh.parent) {
        mesh.parent = this.center as Mesh;
        Tags.AddTagsTo(mesh, 'parentedMesh');
      }
    });

    this.helpersReady.set(true);
  }

  private loadSettings() {
    const mediaType = this.processing.mediaType();
    const hasMeshSettings = this.processing.hasMeshSettings();
    this.initialiseCamera();
    this.loadCameraInititalPosition();
    this.loadBackgroundSettings();
    this.initialiseLights();
    if (hasMeshSettings || mediaType === 'audio') {
      this.loadRotation();
      this.loadScaling();
    }
  }

  public restoreSettings() {
    this.loadCameraInititalPosition();
    this.loadBackgroundSettings();
    this.lights.initialiseLights();
  }

  private initialiseCamera() {
    const mediaType = this.processing.mediaType();
    const isInUpload = this.processing.isInUpload();
    const isDefault = this.processing.isDefaultEntity();
    const scale = getScaleVector(this.entitySettings().scale);
    const isModel = mediaType === 'model' || mediaType === 'entity';
    const isSplat = mediaType === 'splat';

    if (isSplat) {
      const meshes = this.processing.meshes();
      console.log('[EntitySettingsService]',meshes.at(0)?.getBoundingInfo().diagonalLength);
      const target = meshes.at(0)?.getBoundingInfo()?.boundingSphere.minimum.negate();
      if (target) this.currentCenterPoint = target;
    }

    let diagonalLength = 0;
    if (this.boundingBox) {
      const bi = this.boundingBox.getBoundingInfo();
      diagonalLength = bi.diagonalLength;
    } else {
      diagonalLength = Math.sqrt(
        this.initialSize.x * scale.x * (this.initialSize.x * scale.x) +
          this.initialSize.y * scale.y * (this.initialSize.y * scale.y) +
          this.initialSize.z * scale.z * (this.initialSize.z * scale.z),
      );
    }
    const max = !isDefault ? (isInUpload && isModel ? diagonalLength * 2.5 : diagonalLength) : 87.5;
    this.babylon.cameraManager.setUpActiveCamera(max, mediaType!);

    if (isInUpload && mediaType !== 'audio') {
      const position = new Vector3(
        isModel ? Math.PI / 4 : -Math.PI / 2,
        isModel ? Math.PI / 4 : Math.PI / 2,
        isSplat ? diagonalLength * 0.01 : diagonalLength * 1.25,
      );
      const target = this.currentCenterPoint;
      console.log('[EntitySettingsService]',{ target, position});
      this.entitySettings.update(state => ({
        ...state,
        cameraPositionInitial: { position, target },
      }));
    }
  }

  public decomposeMeshSettingsHelper() {
    const center = this.center;
    if (!center) {
      throw new Error('Center missing: decomposeMeshSettingsHelper');
    }
    const meshes = this.babylon.getScene().getMeshesByTags('parentedMesh');
    if (!meshes) {
      throw new Error('Meshes missing: decomposeMeshSettingsHelper');
    }
    meshes.forEach(mesh => {
      mesh.computeWorldMatrix(true);
      const abs = mesh.absolutePosition;
      if (!mesh.rotationQuaternion) {
        mesh.rotationQuaternion = Quaternion.RotationYawPitchRoll(
          mesh.rotation.y,
          mesh.rotation.x,
          mesh.rotation.z,
        );
      }
      mesh.parent = null;
      mesh.position = abs;
      const meshRotation = mesh.rotationQuaternion;
      mesh.rotationQuaternion = this.rotationQuaternion().multiply(meshRotation);
      center.computeWorldMatrix();
      mesh.scaling.x *= center.scaling.x;
      mesh.scaling.y *= center.scaling.y;
      mesh.scaling.z *= center.scaling.z;
    });
    this.destroyMesh('center');
  }

  public destroyVisualUIMeshSettingsHelper() {
    this.disableRotationGizmo();
    this.destroyMesh('boundingBox');
    this.destroyMesh('worldAxis');
    this.destroyMesh('localAxis');
    this.destroyMesh('ground');
    this.initialiseCamera();
  }

  private destroyMesh(tag: string) {
    this.babylon
      .getScene()
      .getMeshesByTags(tag)
      .map(mesh => mesh.dispose());
  }

  /*
   * Mesh Settings
   */

  // Rotation
  public loadRotation() {
    if (!this.center) {
      throw new Error('Center missing: loadRotation');
    }

    if (!this.center.rotationQuaternion) {
      throw new Error('RotationQuaternion for center missing: loadRotation');
    }

    this.entitySettings.update(state => ({
      ...state,
      rotation: {
        x: isDegreeSpectrum(state.rotation.x),
        y: isDegreeSpectrum(state.rotation.y),
        z: isDegreeSpectrum(state.rotation.z),
      },
    }));
    const rotation = this.entitySettings().rotation;

    const end = Quaternion.RotationYawPitchRoll(
      (Math.PI / 180) * rotation.y,
      (Math.PI / 180) * rotation.x,
      (Math.PI / 180) * rotation.z,
    );
    this.rotationQuaternion.set(end);
    this.center.rotationQuaternion = end;
    if (this.rotationGizmoAnchor) {
      this.rotationGizmoAnchor.rotationQuaternion = end.clone();
    }
  }

  public setRotationGizmoEnabled(enabled: boolean): void {
    if (enabled) this.enableRotationGizmo();
    else this.disableRotationGizmo();
  }

  private enableRotationGizmo(): void {
    if (this.rotationGizmo) return;
    if (!this.center) {
      console.error('[EntitySettingsService]','Center missing, cannot enable rotation gizmo', this);
      return;
    }
    const scene = this.babylon.getScene();
    this.utilityLayer = new UtilityLayerRenderer(scene);
    this.rotationGizmo = new RotationGizmo(this.utilityLayer, undefined, undefined, 2);
    this.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
    this.rotationGizmo.updateGizmoPositionToMatchAttachedMesh = true;
    this.rotationGizmo.snapDistance = rotationGizmoSnapStepRad;

    this.rotationGizmoAnchor = new TransformNode('rotationGizmoAnchor', scene);
    this.rotationGizmoAnchor.position =
      this.boundingBox?.getAbsolutePosition() ?? this.initialCenterPoint;
    if (this.center.rotationQuaternion) {
      this.rotationGizmoAnchor.rotationQuaternion = this.center.rotationQuaternion.clone();
    }
    this.rotationGizmo.attachedNode = this.rotationGizmoAnchor;

    this.rotationGizmoDragObserver = this.rotationGizmo.onDragObservable.add(() => {
      if (this.center && this.rotationGizmoAnchor?.rotationQuaternion) {
        this.center.rotationQuaternion = this.rotationGizmoAnchor.rotationQuaternion.clone();
      }
    });

    this.rotationGizmoDragEndObserver = this.rotationGizmo.onDragEndObservable.add(() => {
      this.rotationDragTooltip.set(null);
      this.applyRotationFromCenterMesh();
    });

    this.rotationGizmoAxisDragObservers = [
      {
        axis: 'x',
        observer: this.rotationGizmo.xGizmo.dragBehavior.onDragObservable.add(ev =>
          this.updateDragTooltip('x', ev),
        ),
      },
      {
        axis: 'y',
        observer: this.rotationGizmo.yGizmo.dragBehavior.onDragObservable.add(ev =>
          this.updateDragTooltip('y', ev),
        ),
      },
      {
        axis: 'z',
        observer: this.rotationGizmo.zGizmo.dragBehavior.onDragObservable.add(ev =>
          this.updateDragTooltip('z', ev),
        ),
      },
    ];
  }

  private disableRotationGizmo(): void {
    this.rotationDragTooltip.set(null);
    if (this.rotationGizmo && this.rotationGizmoDragObserver) {
      this.rotationGizmo.onDragObservable.remove(this.rotationGizmoDragObserver);
    }
    if (this.rotationGizmo && this.rotationGizmoDragEndObserver) {
      this.rotationGizmo.onDragEndObservable.remove(this.rotationGizmoDragEndObserver);
    }
    for (const { axis, observer } of this.rotationGizmoAxisDragObservers) {
      const gizmo = this.rotationGizmo;
      if (!gizmo) break;
      const sub = axis === 'x' ? gizmo.xGizmo : axis === 'y' ? gizmo.yGizmo : gizmo.zGizmo;
      sub.dragBehavior.onDragObservable.remove(observer);
    }
    this.rotationGizmoAxisDragObservers = [];
    this.rotationGizmoDragObserver = undefined;
    this.rotationGizmoDragEndObserver = undefined;
    this.rotationGizmo?.dispose();
    this.rotationGizmoAnchor?.dispose();
    this.utilityLayer?.dispose();
    this.rotationGizmo = undefined;
    this.rotationGizmoAnchor = undefined;
    this.utilityLayer = undefined;
  }

  private applyRotationFromCenterMesh() {
    if (!this.center?.rotationQuaternion) return;
    const q = this.center.rotationQuaternion;
    const euler = q.toEulerAngles();
    const toDeg = (rad: number) => Math.round(((rad * 180) / Math.PI + 360) % 360) % 360;
    this.entitySettings.update(state => ({
      ...state,
      rotation: {
        x: toDeg(euler.x),
        y: toDeg(euler.y),
        z: toDeg(euler.z),
      },
    }));
    this.rotationQuaternion.set(q.clone());
    this.processing.localSettings.set(this.entitySettings());
  }

  private updateDragTooltip(axis: 'x' | 'y' | 'z', ev: DragEvent): void {
    const gizmo = this.rotationGizmo;
    if (!gizmo) return;
    const sub = axis === 'x' ? gizmo.xGizmo : axis === 'y' ? gizmo.yGizmo : gizmo.zGizmo;
    const deg = Math.round((sub.angle * 180) / Math.PI);
    if (deg === 0) {
      this.rotationDragTooltip.set(null);
      return;
    }
    const e = ev.pointerInfo?.event;
    this.rotationDragTooltip.set({
      text: `${deg}°`,
      x: e?.clientX ?? 0,
      y: e?.clientY ?? 0,
    });
  }

  // Size
  public loadScaling() {
    if (!this.center) {
      throw new Error('Center missing: loadScaling');
    }

    const scale = getScaleVector(this.entitySettings().scale);
    this.center.scaling = new Vector3(scale.x, scale.y, scale.z);

    this.entitySize.set({
      height: (this.initialSize.y * scale.y).toFixed(2),
      width: (this.initialSize.x * scale.x).toFixed(2),
      depth: (this.initialSize.z * scale.z).toFixed(2),
    });
  }

  public createVisualUIMeshSettingsHelper() {
    if (!this.center) {
      throw new Error('Center missing: createVisualUIMeshSettingsHelper');
    }
    const hasMeshSettings = this.processing.hasMeshSettings();
    const isInUpload = this.processing.isInUpload();
    const scene = this.babylon.getScene();
    const entitySize = this.entitySize();
    const size = Math.max(+entitySize.height, +entitySize.width, +entitySize.depth);
    this.boundingBox = createBoundingBox(
      scene,
      this.center,
      this.initialSize,
      this.initialCenterPoint,
    );
    this.boundingBox.renderingGroupId = 2;
    if (isInUpload && hasMeshSettings) {
      this.worldAxisInitialSize = size * 1.2;
      this.localAxisInitialSize = size * 1.1;
      this.groundInitialSize = size * 2;
      createWorldAxis(scene, this.worldAxisInitialSize);
      createlocalAxes(scene, this.localAxisInitialSize, this.center, this.initialCenterPoint);
      this.ground = createGround(scene, this.groundInitialSize);
      this.ground.setParent(this.center);
      this.ground.position = this.initialCenterPoint.subtract(
        new Vector3(0, this.initialSize.y / 2, 0),
      );
      this.ground.renderingGroupId = 1;
      const groundAbsolutePosition = this.ground.getAbsolutePosition().clone();
      this.ground.setParent(null, true);
      this.ground.setAbsolutePosition(groundAbsolutePosition);
      this.setGroundMaterial();
    }
    console.log('[EntitySettingsService] Helpers', {
      center: this.center,
      ground: this.ground,
      boundingBox: this.boundingBox,
    } )
  }

  // Set the color for the helper grid
  public setGroundMaterial(color?: IColor) {
    const scene = this.babylon.getScene();
    const oldMat = scene.getMaterialByName('GroundPlaneMaterial');
    const material = new StandardMaterial('GroundPlaneMaterial', scene);
    material.diffuseColor = new Color3(
      (color ? color.r : 255) / 255,
      (color ? color.g : 255) / 255,
      (color ? color.b : 255) / 255,
    );
    material.wireframe = true;
    if (this.ground) {
      this.ground.material = material;
    }
    if (oldMat) {
      oldMat.dispose();
    }
  }

  // Load cameraPosition
  public loadCameraInititalPosition() {
    const cameraSettings = this.entitySettings().cameraPositionInitial;

    // Saved position is { x: alpha, y: beta, z: radius } (spherical ArcRotate)
    const alpha = cameraSettings.position.x;
    const beta = cameraSettings.position.y;
    const radius = cameraSettings.position.z;
    const target = new Vector3(
      cameraSettings.target.x,
      cameraSettings.target.y,
      cameraSettings.target.z,
    );

    this.cameraHandler.cameraDefaults.set({
      alpha,
      beta,
      radius,
      target: target.clone(),
    });

    this.babylon.cameraManager.smoothCameraTransitionFromSpherical({
      camera: this.babylon.cameraManager.getActiveCamera(),
      scene: this.babylon.getScene(),
      alpha,
      beta,
      radius,
      target,
    });
  }

  // background: color, effect
  loadBackgroundSettings() {
    const { color, effect } = this.entitySettings().background;
    this.babylon.setBackgroundColor(color);
    this.babylon.setBackgroundImage(effect);
  }

  private migrateLegacyLights(): void {
    const settings = this.entitySettings();
    const hasLegacyLight = settings.lights.some(
      light =>
        light.type === 'HemisphericLight' ||
        light.type === 'PointLight' ||
        light.type === 'DirectionalLight',
    );
    if (!hasLegacyLight) return;

    const legacyUp = settings.lights.find(
      light => light.type === 'HemisphericLight' && light.position.y === 1,
    );
    const intensity = legacyUp?.intensity ?? 1;

    this.entitySettings.update(state => ({
      ...state,
      lights: [
        {
          type: 'Ambient',
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          intensity,
          color: { r: 255, g: 255, b: 255, a: 255 },
          name: 'Ambient',
        },
      ],
    }));
  }

  private initialiseLights(): void {
    this.migrateLegacyLights();
    this.lights.initialiseLights();
  }
}
