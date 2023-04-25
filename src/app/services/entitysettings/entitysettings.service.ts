import { EventEmitter, Injectable, Output } from '@angular/core';
import {
  Animation,
  Axis,
  Color3,
  DirectionalLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Quaternion,
  StandardMaterial,
  Tags,
  Vector3,
} from '@babylonjs/core';
import { RGBA } from 'ngx-color';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { IColor, IEntityLight, isEntity } from 'src/common';
import { BabylonService } from '../babylon/babylon.service';
import { ProcessingService } from '../processing/processing.service';
import {
  createBoundingBox,
  createGround,
  createlocalAxes,
  createWorldAxis,
} from './visualUIHelper';

export type IEntityLightType = 'pointLight' | 'ambientlightUp' | 'ambientlightDown';

const filterLightByType: { [key: string]: (light: IEntityLight) => boolean } = {
  ambientlightUp: ({ type, position }) => type !== 'PointLight' && position.y === 1,
  ambientlightDown: ({ type, position }) => type !== 'PointLight' && position.y === -1,
  pointLight: ({ type }) => type === 'PointLight',
};

const isDegreeSpectrum = (value: number) => {
  return value >= 0 && value <= 360 ? value : value > 360 ? 360 : 0;
};

@Injectable({
  providedIn: 'root',
})
export class EntitySettingsService {
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

  constructor(private babylon: BabylonService, private processing: ProcessingService) {
    this.processing.state$
      .pipe(filter(({ entity, meshes }) => isEntity(entity) && meshes?.length > 0))
      .subscribe(async ({ settings }) => {
        await this.setInitialValues();
        await this.setUpMeshSettingsHelper();

        await this.createVisualUIMeshSettingsHelper();

        await this.initialiseCamera();
        await this.loadCameraInititalPosition();

        const { color, effect: enabled } = settings.background;
        await this.setBackground({ color, enabled });
        await this.loadLights();

        const mediaType = await firstValueFrom(this.processing.mediaType$);
        const hasMeshSettings = await firstValueFrom(this.processing.hasMeshSettings$);
        if (hasMeshSettings || mediaType === 'audio') {
          await this.loadRotation();
          await this.loadScaling();
        }

        const isInUpload = await firstValueFrom(this.processing.isInUpload$);
        if (!isInUpload || !hasMeshSettings) {
          await this.destroyMesh('boundingBox');
          await this.decomposeMeshSettingsHelper();
        }
      });
  }

  public async setBackground({ color, enabled }: { color?: RGBA; enabled?: boolean }) {
    await firstValueFrom(this.processing.settings$).then(({ localSettings }) => {
      if (color) {
        localSettings.background.color = color;
        this.babylon.setBackgroundColor(color);
      }
      if (enabled !== undefined) {
        localSettings.background.effect = enabled;
        this.babylon.setBackgroundEffect(enabled);
      }
    });
  }

  private async computeMeshMinMaxWorld() {
    const min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    const max = new Vector3(Number.MAX_VALUE * -1, Number.MAX_VALUE * -1, Number.MAX_VALUE * -1);

    const meshes = await firstValueFrom(this.processing.meshes$);
    meshes.forEach(mesh => {
      mesh.computeWorldMatrix(true);
      const bi = mesh.getBoundingInfo();
      if (bi.diagonalLength === 0) return;
      const { minimumWorld: minimum, maximumWorld: maximum } = bi.boundingBox;
      min.x = Math.min(min.x, minimum.x);
      min.y = Math.min(min.y, minimum.y);
      min.z = Math.min(min.z, minimum.z);
      max.x = Math.max(max.x, maximum.x);
      max.y = Math.max(max.y, maximum.y);
      max.z = Math.max(max.z, maximum.z);
    });
    const distance = max.subtract(min);
    const centerPoint = Vector3.Lerp(min, max, 0.5);
    return { min, max, centerPoint, distance };
  }

  private async setInitialValues() {
    const { centerPoint, distance } = await this.computeMeshMinMaxWorld();
    this.initialSize = distance;
    this.groundInitialSize = 0;
    this.localAxisInitialSize = 0;
    this.worldAxisInitialSize = 0;
    this.processing.rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
    this.processing.entitySize = {
      height: this.initialSize.y.toFixed(2),
      width: this.initialSize.x.toFixed(2),
      depth: this.initialSize.z.toFixed(2),
    };

    this.initialCenterPoint = centerPoint.clone();
    this.currentCenterPoint = centerPoint.clone();
  }

  private async setUpMeshSettingsHelper() {
    // TODO: Maybe the center could be created with the service?
    // Then just run the meshes-loop when new meshes are added to the scene
    const meshes = await firstValueFrom(this.processing.meshes$);
    const scene = this.babylon.getScene();
    this.center = MeshBuilder.CreateBox('center', { size: 0.01 }, scene);
    Tags.AddTagsTo(this.center, 'center');
    this.center.isVisible = false;
    this.center.rotationQuaternion = this.processing.rotationQuaternion;

    // position model to origin of the world coordinate system
    const { min } = await this.computeMeshMinMaxWorld();
    this.center.position = new Vector3(
      min.x > 0 ? -min.x : Math.abs(min.x),
      min.y > 0 ? -min.y : Math.abs(min.y),
      min.z > 0 ? -min.z : Math.abs(min.z),
    );

    // TODO: Find out if this fixes issues when updating Babylon beyond 5.5.5
    // const { x, y, z } = localSettings.cameraPositionInitial.target;
    // this.center.position = new Vector3(x, y, z);

    this.center.setPivotPoint(this.initialCenterPoint);
    meshes.forEach(mesh => {
      if (!mesh.parent) {
        mesh.parent = this.center as Mesh;
        Tags.AddTagsTo(mesh, 'parentedMesh');
      }
    });
  }

  private async initialiseCamera() {
    const [mediaType, isInUpload, isDefault, { localSettings }] = await Promise.all([
      firstValueFrom(this.processing.mediaType$),
      firstValueFrom(this.processing.isInUpload$),
      firstValueFrom(this.processing.defaultEntityLoaded$),
      firstValueFrom(this.processing.settings$),
    ]);

    const { scale } = localSettings;
    const isModel = mediaType === 'model' || mediaType === 'entity';
    const { x, y, z } = this.initialSize;
    const diagonalLength = this.boundingBox
      ? this.boundingBox.getBoundingInfo().diagonalLength
      : Math.sqrt(x * scale * (x * scale) + y * scale * (y * scale) + z * scale * (z * scale));

    const max = !isDefault ? (isInUpload && isModel ? diagonalLength * 2.5 : diagonalLength) : 87.5;
    await this.babylon.cameraManager.setUpActiveCamera(max, mediaType!);

    if (isInUpload && mediaType !== 'audio') {
      const position = new Vector3(
        isModel ? Math.PI / 4 : -Math.PI / 2,
        isModel ? Math.PI / 4 : Math.PI / 2,
        diagonalLength * 1.25,
      );
      const target = this.currentCenterPoint;
      console.log('initialiseCamera', { target, position });
      localSettings.cameraPositionInitial = { position, target };
      this.babylon.cameraManager.setActiveCameraTarget(target);
      this.babylon.cameraManager.moveActiveCameraToPosition(position);
    }
  }

  public async decomposeMeshSettingsHelper() {
    const center = this.center;
    if (!center) throw new Error('Center missing');

    const meshes = this.babylon.getScene().getMeshesByTags('parentedMesh');
    if (!meshes) throw new Error('Meshes missing');
    meshes.forEach(mesh => {
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
    return new Promise<void>(resolve =>
      this.babylon
        .getScene()
        .getMeshesByTags(tag)
        .map(mesh => {
          mesh.dispose();
          resolve();
        }),
    );
  }

  public async loadRotation() {
    if (!this.center?.rotationQuaternion) throw new Error('RotationQuaternion for center missing');

    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.rotation.x = isDegreeSpectrum(localSettings.rotation.x);
    localSettings.rotation.y = isDegreeSpectrum(localSettings.rotation.y);
    localSettings.rotation.z = isDegreeSpectrum(localSettings.rotation.z);

    const start = this.processing.rotationQuaternion;
    const rotationQuaternion = Quaternion.RotationYawPitchRoll(0, 0, 0);
    const rotationQuaternionX = Quaternion.RotationAxis(
      Axis.X,
      (Math.PI / 180) * localSettings.rotation.x,
    );
    let end = rotationQuaternionX.multiply(rotationQuaternion);
    const rotationQuaternionY = Quaternion.RotationAxis(
      Axis.Y,
      (Math.PI / 180) * localSettings.rotation.y,
    );
    end = rotationQuaternionY.multiply(end);
    const rotationQuaternionZ = Quaternion.RotationAxis(
      Axis.Z,
      (Math.PI / 180) * localSettings.rotation.z,
    );
    end = rotationQuaternionZ.multiply(end);

    this.animatedMovement(start, end);

    this.processing.rotationQuaternion = end;
    this.center.rotationQuaternion = end;
  }

  public async animatedMovement(start: Quaternion, end: Quaternion) {
    if (!this.center) throw new Error('Center missing');
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

  public async loadScaling() {
    if (!this.center) throw new Error('Center missing');

    const {
      localSettings: { scale },
    } = await firstValueFrom(this.processing.settings$);

    this.center.scaling = new Vector3(scale, scale, scale);

    this.processing.entitySize = {
      height: (this.initialSize.y * scale).toFixed(2),
      width: (this.initialSize.x * scale).toFixed(2),
      depth: (this.initialSize.z * scale).toFixed(2),
    };
  }

  public async createVisualUIMeshSettingsHelper() {
    const { center, initialSize, initialCenterPoint } = this;
    if (!center) throw new Error('Center missing');
    const hasMeshSettings = await firstValueFrom(this.processing.hasMeshSettings$);
    const isInUpload = await firstValueFrom(this.processing.isInUpload$);
    const scene = this.babylon.getScene();
    const size = Math.max(...Object.values(this.processing.entitySize).map(v => +v));
    this.boundingBox = createBoundingBox(scene, center, initialSize, initialCenterPoint);
    this.boundingBox.renderingGroupId = 2;
    if (isInUpload && hasMeshSettings) {
      this.worldAxisInitialSize = size * 1.2;
      this.localAxisInitialSize = size * 1.1;
      this.groundInitialSize = size * 1.2;
      createWorldAxis(scene, this.worldAxisInitialSize);
      createlocalAxes(scene, this.localAxisInitialSize, center, this.initialCenterPoint);
      this.ground = createGround(scene, this.groundInitialSize);
      this.setGroundMaterial();
    }
  }

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

  public async loadCameraInititalPosition() {
    const {
      localSettings: { cameraPositionInitial },
    } = await firstValueFrom(this.processing.settings$);
    const settings = Array.isArray(cameraPositionInitial)
      ? (cameraPositionInitial as any[]).find(obj => obj.cameraType === 'arcRotateCam')
      : cameraPositionInitial;

    const position = new Vector3(settings.position.x, settings.position.y, settings.position.z);
    const target = new Vector3(settings.target.x, settings.target.y, settings.target.z);
    this.babylon.cameraManager.cameraDefaults$.next({ position, target });
    console.log('loadCameraInititalPosition', { position, target });
    this.babylon.cameraManager.moveActiveCameraToPosition(position);
    this.babylon.cameraManager.setActiveCameraTarget(target);
  }

  public lights$ = new BehaviorSubject<
    | {
        pointLight: PointLight;
        ambientlightUp: DirectionalLight;
        ambientlightDown: DirectionalLight;
      }
    | undefined
  >(undefined);

  public initialiseAmbientLight(type: 'up' | 'down', intensity: number) {
    const direction = type === 'up' ? new Vector3(1, -5, 1) : new Vector3(1, 5, 1);
    const lightName = type === 'up' ? 'ambientlightUp' : 'ambientlightDown';
    const light = new DirectionalLight(lightName, direction, this.babylon.getScene());
    light.intensity = intensity;
    light.specular = new Color3(0.5, 0.5, 0.5);
    return light;
  }

  public initialisePointLight(intensity: number, position: Vector3) {
    const light = new PointLight('pointLight', position, this.babylon.getScene());
    light.specular = new Color3(0, 0, 0);
    light.intensity = intensity;
    light.parent = this.babylon.getActiveCamera();
    return light;
  }

  private async loadLights() {
    const existingLights = this.lights$.getValue();
    if (existingLights) Object.values(existingLights).forEach(light => light.dispose());

    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const entries = ['pointLight', 'ambientlightUp', 'ambientlightDown'].map(lightType => {
      const {
        intensity,
        position: { x, y, z },
        type,
      } = localSettings.lights.find(filterLightByType[lightType])!;
      if (type === 'PointLight')
        return [lightType, this.initialisePointLight(intensity, new Vector3(x, y, z))];
      const direction = lightType.includes('Up') ? 'up' : 'down';
      return [lightType, this.initialiseAmbientLight(direction, intensity)];
    });

    this.lights$.next(Object.fromEntries(entries));
  }
}
