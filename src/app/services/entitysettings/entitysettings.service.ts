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

import { isDegreeSpectrum } from '../../typeguards/typeguards';
import { BabylonService } from '../babylon/babylon.service';
import { LightService } from '../light/light.service';
import { ProcessingService } from '../processing/processing.service';

import {
  createBoundingBox,
  createGround,
  createlocalAxes,
  createWorldAxis,
} from './visualUIHelper';

@Injectable({
  providedIn: 'root',
})
export class EntitySettingsService {
  private min = new Vector3(
    Number.MAX_VALUE,
    Number.MAX_VALUE,
    Number.MAX_VALUE,
  );
  private max = new Vector3(
    Number.MAX_VALUE * -1,
    Number.MAX_VALUE * -1,
    Number.MAX_VALUE * -1,
  );
  public initialSize = Vector3.Zero();
  private initialCenterPoint = Vector3.Zero();
  private actualCenterPoint = Vector3.Zero();
  private center: Mesh | undefined;
  public boundingBox: Mesh | undefined;

  @Output() meshSettingsCompleted: EventEmitter<boolean> = new EventEmitter();
  public ground: Mesh | undefined;
  private groundInitialSize = 0;
  public localAxisInitialSize = 0;
  public worldAxisInitialSize = 0;

  constructor(
    private babylonService: BabylonService,
    private processingService: ProcessingService,
    private lightService: LightService,
  ) {
    this.processingService.setSettings.subscribe(setSettings => {
      if (setSettings) {
        this.setUpSettings();
      }
    });
  }

  private async resetInitialValues() {
    this.min = new Vector3(
        Number.MAX_VALUE,
        Number.MAX_VALUE,
        Number.MAX_VALUE,
    );
    this.max = new Vector3(
        Number.MAX_VALUE * -1,
        Number.MAX_VALUE * -1,
        Number.MAX_VALUE * -1,
    );
    this.initialSize = Vector3.Zero();
    this.initialCenterPoint = this.actualCenterPoint = Vector3.Zero();
    this.groundInitialSize = 0;
    this.localAxisInitialSize = 0;
    this.worldAxisInitialSize = 0;
    this.processingService.actualRotationQuaternion = Quaternion.RotationYawPitchRoll(
      0,
      0,
      0,
    );
    this.processingService.actualEntityHeight = (0).toFixed(2);
    this.processingService.actualEntityWidth = (0).toFixed(2);
    this.processingService.actualEntityDepth = (0).toFixed(2);
  }

  private async setUpSettings() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('No settings available.');
    }
    if (!this.processingService.getCurrentEntityMeshes()) {
      throw new Error('No meshes available.');
    }
    await this.resetInitialValues();
    await this.initialiseSizeValues();
    await this.setUpMeshSettingsHelper();
    await this.createVisualUIMeshSettingsHelper();
    await this.loadSettings();
    if (!this.processingService.upload || !this.processingService.meshSettings) {
      await this.decomposeMeshSettingsHelper();
    }
  }

  private async initialiseSizeValues() {
    await this.calculateMinMax();
    this.initialSize = await this.max.subtract(this.min);
    this.processingService.actualEntityHeight = this.initialSize.y.toFixed(2);
    this.processingService.actualEntityWidth = this.initialSize.x.toFixed(2);
    this.processingService.actualEntityDepth = this.initialSize.z.toFixed(2);
    this.initialCenterPoint = this.actualCenterPoint = new Vector3(
        this.max.x - this.initialSize.x / 2,
        this.max.y - this.initialSize.y / 2,
        this.max.z - this.initialSize.z / 2,
    );
  }

  private async calculateMinMax() {
    const meshes = this.processingService.getCurrentEntityMeshes();
    if (!meshes) {
      throw new Error('Center missing');
    }
    meshes.forEach(mesh => {
      mesh.computeWorldMatrix(true);
      const bi = mesh.getBoundingInfo();
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
  private async setUpMeshSettingsHelper() {
    const meshes = this.processingService.getCurrentEntityMeshes();
    if (!meshes) {
      throw new Error('No meshes available.');
    }
    this.center = MeshBuilder.CreateBox(
        'center',
        {size: 0.01},
        this.babylonService.getScene(),
    );
    Tags.AddTagsTo(this.center, 'center');
    this.center.isVisible = false;

    // rotation to zero
    this.center.rotationQuaternion = this.processingService.actualRotationQuaternion;

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

    this.actualCenterPoint = new Vector3(
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

  }

  private async loadSettings() {
    await this.initialiseCamera();
    await this.loadCameraInititalPosition();
    this.loadBackgroundEffect();
    this.loadBackgroundColor();
    this.initialiseLights();
    if (this.processingService.meshSettings) {
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
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }

    await this.setUpCamera();

    if (this.processingService.upload) {
      const isModel =
        this.processingService.actualEntityMediaType === 'model' ||
        this.processingService.actualEntityMediaType === 'entity';
      const position = new Vector3(
        isModel ? Math.PI / 4 : -Math.PI / 2,
        isModel ? Math.PI / 4 : Math.PI / 2,
        Math.max(
          +this.processingService.actualEntityHeight,
          +this.processingService.actualEntityWidth,
          +this.processingService.actualEntityDepth,
        ) * 1.7,
      );
      const target = new Vector3(
        isModel ? this.max.x - this.initialSize.x / 2 : 0,
        isModel ? this.max.y - this.initialSize.y / 2 : 0,
        isModel ? this.max.z - this.initialSize.z / 2 : 0,
      );
      // tslint:disable-next-line:max-line-length
      this.processingService.actualEntitySettings.cameraPositionInitial = {
        position,
        target,
      };
    }
  }

  private async setUpCamera() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const scale = this.processingService.actualEntitySettings.scale;
    const max = !this.processingService.defaultEntityLoaded
      ? Math.max(
          +this.processingService.actualEntityHeight,
          +this.processingService.actualEntityWidth,
          +this.processingService.actualEntityDepth,
        ) * scale
      : 87.5;
    await this.babylonService.cameraManager.setUpActiveCamera(max);
  }

  public async decomposeMeshSettingsHelper() {
    const center = this.center;
    if (!center) {
      throw new Error('Center missing');
    }
    const meshes = this.processingService.getCurrentEntityMeshes();
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
      mesh.rotationQuaternion = this.processingService.actualRotationQuaternion.multiply(
        meshRotation,
      );
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
    await this.setUpCamera();
  }

  private destroyMesh(tag: string) {
    this.babylonService
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
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    if (!this.center.rotationQuaternion) {
      throw new Error('RotationQuaternion for center missing');
    }

    this.processingService.actualEntitySettings.rotation.x = isDegreeSpectrum(
      this.processingService.actualEntitySettings.rotation.x,
    );
    this.processingService.actualEntitySettings.rotation.y = isDegreeSpectrum(
      this.processingService.actualEntitySettings.rotation.y,
    );
    this.processingService.actualEntitySettings.rotation.z = isDegreeSpectrum(
      this.processingService.actualEntitySettings.rotation.z,
    );

    const start = this.processingService.actualRotationQuaternion;
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
    const rotationQuaternionX = Quaternion.RotationAxis(
      Axis['X'],
      (Math.PI / 180) * this.processingService.actualEntitySettings.rotation.x,
    );
    let end = rotationQuaternionX.multiply(rotationQuaternion);
    const rotationQuaternionY = Quaternion.RotationAxis(
      Axis['Y'],
      (Math.PI / 180) * this.processingService.actualEntitySettings.rotation.y,
    );
    end = rotationQuaternionY.multiply(end);
    const rotationQuaternionZ = Quaternion.RotationAxis(
      Axis['Z'],
      (Math.PI / 180) * this.processingService.actualEntitySettings.rotation.z,
    );
    end = rotationQuaternionZ.multiply(end);
    this.animatedMovement(start, end);
    this.processingService.actualRotationQuaternion = end;
    this.center.rotationQuaternion = end;
  }

  private async animatedMovement(start, end) {
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
    await this.babylonService
      .getScene()
      .beginAnimation(
        this.center,
        0,
        100,
        false,
        undefined,
        undefined,
        undefined,
        false,
      );
  }

  // Size
  public loadScaling() {
    if (!this.center) {
      throw new Error('Center missing');
    }
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const factor = this.processingService.actualEntitySettings.scale;
    this.center.scaling = new Vector3(factor, factor, factor);

    this.processingService.actualEntityHeight = (
      this.initialSize.y * factor
    ).toFixed(2);
    this.processingService.actualEntityWidth = (
      this.initialSize.x * factor
    ).toFixed(2);
    this.processingService.actualEntityDepth = (
      this.initialSize.z * factor
    ).toFixed(2);
  }

  public async createVisualUIMeshSettingsHelper() {
    if (!this.center) {
      throw new Error('Center missing');
    }
    const scene = this.babylonService.getScene();
    const size = Math.max(
      +this.processingService.actualEntityHeight,
      +this.processingService.actualEntityWidth,
      +this.processingService.actualEntityDepth,
    );
    this.boundingBox = createBoundingBox(
        scene,
        this.center,
        this.initialSize,
        this.initialCenterPoint,
    );
    this.boundingBox.renderingGroupId = 2;
    if (this.processingService.upload && this.processingService.meshSettings) {
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
  public setGroundMaterial(color?) {
    const scene = this.babylonService.getScene();
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
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const camera = Array.isArray(
      this.processingService.actualEntitySettings.cameraPositionInitial,
    )
      ? (this.processingService.actualEntitySettings
          .cameraPositionInitial as any[]).find(
          obj => obj.cameraType === 'arcRotateCam',
        )
      : this.processingService.actualEntitySettings.cameraPositionInitial;

    const positionVector = new Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
    const targetVector = new Vector3(
      camera.target.x,
      camera.target.y,
      camera.target.z,
    );
    this.babylonService.cameraManager.updateDefaults(
      positionVector,
      targetVector,
    );
    this.babylonService.cameraManager.moveActiveCameraToPosition(
      positionVector,
    );
    this.babylonService.cameraManager.setActiveCameraTarget(targetVector);
  }

  // background: color, effect
  loadBackgroundColor() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const color = this.processingService.actualEntitySettings.background.color;
    this.babylonService.setBackgroundColor(color);
  }

  loadBackgroundEffect() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    this.babylonService.setBackgroundImage(
      this.processingService.actualEntitySettings.background.effect,
    );
  }

  // lights: up, down, pointlight
  // Ambientlights

  private initialiseLights() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const pointLight = this.lightService.getLightByType('pointLight');
    if (pointLight) {
      const position = new Vector3(
        pointLight.position.x,
        pointLight.position.y,
        pointLight.position.z,
      );
      this.lightService.initialisePointLight(pointLight.intensity, position);
    }
    const hemisphericLightUp = this.lightService.getLightByType(
      'ambientlightUp',
    );
    if (hemisphericLightUp) {
      this.lightService.initialiseAmbientLight(
        'up',
        hemisphericLightUp.intensity,
      );
    }
    const hemisphericLightDown = this.lightService.getLightByType(
      'ambientlightDown',
    );
    if (hemisphericLightDown) {
      this.lightService.initialiseAmbientLight(
        'down',
        hemisphericLightDown.intensity,
      );
    }
  }

  public loadLightIntensityAllLights() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const ambientlightUp = this.lightService.getLightByType('ambientlightUp');
    if (ambientlightUp) {
      this.lightService.setLightIntensity(
        'ambientlightUp',
        ambientlightUp.intensity,
      );
    }
    const ambientlightDown = this.lightService.getLightByType(
      'ambientlightDown',
    );
    if (ambientlightDown) {
      this.lightService.setLightIntensity(
        'ambientlightDown',
        ambientlightDown.intensity,
      );
    }
    const pointLight = this.lightService.getLightByType('pointLight');
    if (pointLight) {
      this.lightService.setLightIntensity('pointLight', pointLight.intensity);
    }
  }

  public loadLightIntensity(lightType: string) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const light = this.lightService.getLightByType(lightType);
    if (light) {
      this.lightService.setLightIntensity(lightType, light.intensity);
    }
  }

  public loadPointLightPosition() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
    }
    const pointLight = this.lightService.getLightByType('pointLight');
    if (pointLight) {
      const position = new Vector3(
        pointLight.position.x,
        pointLight.position.y,
        pointLight.position.z,
      );
      this.lightService.setPointLightPosition(position);
    }
  }
}
