import { EventEmitter, Injectable, Output } from '@angular/core';
import {
  Animation,
  Axis,
  Color3,
  Mesh,
  MeshBuilder,
  Quaternion,
  StandardMaterial,
  Tags,
  Vector3,
} from 'babylonjs';
import { combineLatest } from 'rxjs';

import { BabylonService } from '../babylon/babylon.service';
import { LightService } from '../light/light.service';
import { ProcessingService } from '../processing/processing.service';

import { minimalSettings } from '../../../assets/settings/settings';

import { IColor, IEntitySettings } from 'src/common';

import {
  createBoundingBox,
  createGround,
  createlocalAxes,
  createWorldAxis,
} from './visualUIHelper';

const isDegreeSpectrum = (value: number) => {
  return value >= 0 && value <= 360 ? value : value > 360 ? 360 : 0;
};

@Injectable({
  providedIn: 'root',
})
export class EntitySettingsService {
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

  private meshes: Mesh[] | undefined;

  private entitySettings: IEntitySettings = minimalSettings;

  constructor(
    private babylon: BabylonService,
    private processing: ProcessingService,
    private lights: LightService,
  ) {
    combineLatest(this.processing.entitySettings$, this.processing.meshes$).subscribe(arr => {
      const settings = arr[0];
      const meshes = arr[1];
      this.entitySettings = settings;
      console.log('actual settings', this.entitySettings);
      this.meshes = meshes;
      requestAnimationFrame(() =>
        this.setUpSettings()
          .then(() => console.log('Settings loaded'))
          .catch((err: Error) => console.log('Settings not loaded', err.message)),
      );
    });
  }

  private async resetInitialValues() {
    this.min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    this.max = new Vector3(Number.MAX_VALUE * -1, Number.MAX_VALUE * -1, Number.MAX_VALUE * -1);
    this.initialSize = Vector3.Zero();
    this.initialCenterPoint = this.currentCenterPoint = Vector3.Zero();
    this.groundInitialSize = 0;
    this.localAxisInitialSize = 0;
    this.worldAxisInitialSize = 0;
    this.processing.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
    this.processing.entityHeight = (0).toFixed(2);
    this.processing.entityWidth = (0).toFixed(2);
    this.processing.entityDepth = (0).toFixed(2);
  }

  private async setUpSettings() {
    if (!this.entitySettings) {
      throw new Error('No settings available.');
    }
    if (!this.meshes || this.meshes.length === 0) {
      throw new Error('No meshes available.');
    }
    await this.resetInitialValues();
    await this.initialiseSizeValues();
    await this.setUpMeshSettingsHelper();
    await this.createVisualUIMeshSettingsHelper();
    await this.loadSettings();
    if (!this.processing.upload || !this.processing.meshSettings) {
      await this.destroyMesh('boundingBox');
      await this.decomposeMeshSettingsHelper();
    }
  }

  private async initialiseSizeValues() {
    await this.calculateMinMax()
      .then(() => {
        this.initialSize = this.max.subtract(this.min);
        this.processing.entityHeight = this.initialSize.y.toFixed(2);
        this.processing.entityWidth = this.initialSize.x.toFixed(2);
        this.processing.entityDepth = this.initialSize.z.toFixed(2);
        this.initialCenterPoint = this.currentCenterPoint = new Vector3(
          this.max.x - this.initialSize.x / 2,
          this.max.y - this.initialSize.y / 2,
          this.max.z - this.initialSize.z / 2,
        );
      })
      .catch((err: Error) => console.log('Failed intitializing size', err.message));
  }

  private async calculateMinMax() {
    if (!this.meshes) {
      throw new Error('Center missing');
    }
    this.meshes.forEach(mesh => {
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

  private async setUpMeshSettingsHelper() {
    if (!this.meshes) {
      throw new Error('No meshes available.');
    }
    this.center = MeshBuilder.CreateBox('center', { size: 0.01 }, this.babylon.getScene());
    Tags.AddTagsTo(this.center, 'center');
    this.center.isVisible = false;

    // rotation to zero
    this.center.rotationQuaternion = this.processing.rotationQuaternion;

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

    this.meshes.forEach(mesh => {
      if (!mesh.parent) {
        mesh.parent = this.center as Mesh;
        Tags.AddTagsTo(mesh, 'parentedMesh');
      }
    });
  }

  private async loadSettings() {
    await this.initialiseCamera();
    await this.loadCameraInititalPosition();
    this.loadBackgroundEffect();
    this.loadBackgroundColor();
    this.initialiseLights();
    if (this.processing.meshSettings || this.processing.entityMediaType === 'audio') {
      await this.loadRotation();
      await this.loadScaling();
    }
  }

  public restoreSettings() {
    this.loadCameraInititalPosition();
    this.loadBackgroundEffect();
    this.loadBackgroundColor();
    this.loadPointLightPosition();
    this.loadLightIntensityAllLights();
  }

  private async initialiseCamera() {
    if (!this.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    const scale = this.entitySettings.scale;
    const isModel =
      this.processing.entityMediaType === 'model' || this.processing.entityMediaType === 'entity';
    let diagonalLength = 0;
    if (this.boundingBox) {
      const bi = this.boundingBox.getBoundingInfo();
      diagonalLength = bi.diagonalLength;
    } else {
      diagonalLength = Math.sqrt(
        this.initialSize.x * scale * (this.initialSize.x * scale) +
          this.initialSize.y * scale * (this.initialSize.y * scale) +
          this.initialSize.z * scale * (this.initialSize.z * scale),
      );
    }
    const max = !this.processing.defaultEntityLoaded
      ? this.processing.upload && isModel
        ? diagonalLength * 2.5
        : diagonalLength
      : 87.5;
    await this.babylon.cameraManager.setUpActiveCamera(max);

    if (this.processing.upload && this.processing.entityMediaType !== 'audio') {
      const position = new Vector3(
        isModel ? Math.PI / 4 : -Math.PI / 2,
        isModel ? Math.PI / 4 : Math.PI / 2,
        diagonalLength * 1.25,
      );
      const target = this.currentCenterPoint;
      console.log('target', target);
      console.log('position', position);
      this.entitySettings.cameraPositionInitial = {
        position,
        target,
      };
    }
  }

  public async decomposeMeshSettingsHelper() {
    const center = this.center;
    if (!center) {
      throw new Error('Center missing');
    }
    const meshes = this.babylon.getScene().getMeshesByTags('parentedMesh');
    if (!meshes) {
      throw new Error('Meshes missing');
    }
    await meshes.forEach(mesh => {
      mesh.computeWorldMatrix();
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
      mesh.rotationQuaternion = this.processing.rotationQuaternion.multiply(meshRotation);
      center.computeWorldMatrix();
      mesh.scaling.x *= center.scaling.x;
      mesh.scaling.y *= center.scaling.y;
      mesh.scaling.z *= center.scaling.z;
    });
    await this.destroyMesh('center');
  }

  public async destroyVisualUIMeshSettingsHelper() {
    await this.destroyMesh('boundingBox');
    await this.destroyMesh('worldAxis');
    await this.destroyMesh('localAxis');
    await this.destroyMesh('ground');
    await this.initialiseCamera();
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
  public async loadRotation() {
    if (!this.center) {
      throw new Error('Center missing');
    }
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    if (!this.center.rotationQuaternion) {
      throw new Error('RotationQuaternion for center missing');
    }

    this.entitySettings.rotation.x = isDegreeSpectrum(this.entitySettings.rotation.x);
    this.entitySettings.rotation.y = isDegreeSpectrum(this.entitySettings.rotation.y);
    this.entitySettings.rotation.z = isDegreeSpectrum(this.entitySettings.rotation.z);

    const start = this.processing.rotationQuaternion;
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
    const rotationQuaternionX = Quaternion.RotationAxis(
      Axis['X'],
      (Math.PI / 180) * this.entitySettings.rotation.x,
    );
    let end = rotationQuaternionX.multiply(rotationQuaternion);
    const rotationQuaternionY = Quaternion.RotationAxis(
      Axis['Y'],
      (Math.PI / 180) * this.entitySettings.rotation.y,
    );
    end = rotationQuaternionY.multiply(end);
    const rotationQuaternionZ = Quaternion.RotationAxis(
      Axis['Z'],
      (Math.PI / 180) * this.entitySettings.rotation.z,
    );
    end = rotationQuaternionZ.multiply(end);
    this.animatedMovement(start, end);
    this.processing.rotationQuaternion = end;
    this.center.rotationQuaternion = end;
  }

  private async animatedMovement(start: Quaternion, end: Quaternion) {
    if (!this.center) {
      throw new Error('Center missing');
    }
    const anim = new Animation(
      'anim',
      'rotationQuaternion',
      120,
      Animation.ANIMATIONTYPE_QUATERNION,
      Animation.ANIMATIONLOOPMODE_RELATIVE,
    );
    const frame = [
      { frame: 0, value: start },
      { frame: 100, value: end },
    ];
    anim.setKeys(frame);
    this.center.animations = [];
    this.center.animations.push(anim);
    await this.babylon
      .getScene()
      .beginAnimation(this.center, 0, 100, false, undefined, undefined, undefined, false);
  }

  // Size
  public loadScaling() {
    if (!this.center) {
      throw new Error('Center missing');
    }
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const factor = this.entitySettings.scale;
    this.center.scaling = new Vector3(factor, factor, factor);

    this.processing.entityHeight = (this.initialSize.y * factor).toFixed(2);
    this.processing.entityWidth = (this.initialSize.x * factor).toFixed(2);
    this.processing.entityDepth = (this.initialSize.z * factor).toFixed(2);
  }

  public async createVisualUIMeshSettingsHelper() {
    if (!this.center) {
      throw new Error('Center missing');
    }
    const scene = this.babylon.getScene();
    const size = Math.max(
      +this.processing.entityHeight,
      +this.processing.entityWidth,
      +this.processing.entityDepth,
    );
    this.boundingBox = createBoundingBox(
      scene,
      this.center,
      this.initialSize,
      this.initialCenterPoint,
    );
    this.boundingBox.renderingGroupId = 2;
    if (this.processing.upload && this.processing.meshSettings) {
      this.worldAxisInitialSize = size * 1.2;
      this.localAxisInitialSize = size * 1.1;
      this.groundInitialSize = size * 1.2;
      createWorldAxis(scene, this.worldAxisInitialSize);
      createlocalAxes(scene, this.localAxisInitialSize, this.center, this.initialCenterPoint);
      this.ground = createGround(scene, this.groundInitialSize);
      this.setGroundMaterial();
    }
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
  public async loadCameraInititalPosition() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const camera = Array.isArray(this.entitySettings.cameraPositionInitial)
      ? (this.entitySettings.cameraPositionInitial as any[]).find(
          obj => obj.cameraType === 'arcRotateCam',
        )
      : this.entitySettings.cameraPositionInitial;

    const positionVector = new Vector3(camera.position.x, camera.position.y, camera.position.z);
    const targetVector = new Vector3(camera.target.x, camera.target.y, camera.target.z);
    this.babylon.cameraManager.updateDefaults(positionVector, targetVector);
    this.babylon.cameraManager.moveActiveCameraToPosition(positionVector);
    this.babylon.cameraManager.setActiveCameraTarget(targetVector);
  }

  // background: color, effect
  loadBackgroundColor() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const color = this.entitySettings.background.color;
    this.babylon.setBackgroundColor(color);
  }

  loadBackgroundEffect() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    this.babylon.setBackgroundImage(this.entitySettings.background.effect);
  }

  // lights: up, down, pointlight
  // Ambientlights

  private initialiseLights() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const pointLight = this.lights.getLightByType('pointLight');
    if (pointLight) {
      const position = new Vector3(
        pointLight.position.x,
        pointLight.position.y,
        pointLight.position.z,
      );
      this.lights.initialisePointLight(pointLight.intensity, position);
    }
    const hemisphericLightUp = this.lights.getLightByType('ambientlightUp');
    if (hemisphericLightUp) {
      this.lights.initialiseAmbientLight('up', hemisphericLightUp.intensity);
    }
    const hemisphericLightDown = this.lights.getLightByType('ambientlightDown');
    if (hemisphericLightDown) {
      this.lights.initialiseAmbientLight('down', hemisphericLightDown.intensity);
    }
  }

  public loadLightIntensityAllLights() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const ambientlightUp = this.lights.getLightByType('ambientlightUp');
    if (ambientlightUp) {
      this.lights.setLightIntensity('ambientlightUp', ambientlightUp.intensity);
    }
    const ambientlightDown = this.lights.getLightByType('ambientlightDown');
    if (ambientlightDown) {
      this.lights.setLightIntensity('ambientlightDown', ambientlightDown.intensity);
    }
    const pointLight = this.lights.getLightByType('pointLight');
    if (pointLight) {
      this.lights.setLightIntensity('pointLight', pointLight.intensity);
    }
  }

  public loadLightIntensity(lightType: string) {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const light = this.lights.getLightByType(lightType);
    if (light) {
      this.lights.setLightIntensity(lightType, light.intensity);
    }
  }

  public loadPointLightPosition() {
    if (!this.entitySettings) {
      throw new Error('Settings missing');
    }
    const pointLight = this.lights.getLightByType('pointLight');
    if (pointLight) {
      const position = new Vector3(
        pointLight.position.x,
        pointLight.position.y,
        pointLight.position.z,
      );
      this.lights.setPointLightPosition(position);
    }
  }
}
