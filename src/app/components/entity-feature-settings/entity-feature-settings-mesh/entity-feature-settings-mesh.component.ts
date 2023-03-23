import { Component, OnInit } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { firstValueFrom } from 'rxjs';
import { IColor } from 'src/common';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';

@Component({
  selector: 'app-entity-feature-settings-mesh',
  templateUrl: './entity-feature-settings-mesh.component.html',
  styleUrls: ['./entity-feature-settings-mesh.component.scss'],
})
export class EntityFeatureSettingsMeshComponent implements OnInit {
  public boundingBoxVisibility = false;
  public boundingBoxMeshesVisibility = false;
  public localAxisVisibility = false;
  public worldAxisVisibility = false;
  public groundVisibility = false;
  public groundScalingFactor = 1;
  public localAxisScalingFactor = 1;
  public worldAxisScalingFactor = 1;

  constructor(
    public entitySettings: EntitySettingsService,
    public processing: ProcessingService,
    private babylon: BabylonService,
  ) {}

  get meshes$() {
    return this.processing.meshes$;
  }

  ngOnInit() {
    this.entitySettings.meshSettingsCompleted.subscribe((finished: boolean) => {
      if (finished) {
        this.resetVisualUIMeshSettingsHelper().then(() => {
          this.entitySettings.destroyVisualUIMeshSettingsHelper();
          this.entitySettings.decomposeMeshSettingsHelper();
        });
      }
    });
  }

  public async setBackgroundColor(color: IColor) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.background.color = color;
    this.entitySettings.loadBackgroundColor();
  }

  public async handleChangeDimension(
    dimension: 'height' | 'width' | 'depth' | 'scale',
    value?: number | null,
  ) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);

    const setScaling = (factor: number) => {
      localSettings.scale = parseFloat(factor.toFixed(2));
    };

    const { entityHeight, entityWidth, entityDepth } = this.processing;
    const { y, x, z } = this.entitySettings.initialSize;

    const methods = {
      height: () => setScaling(+entityHeight / y),
      width: () => setScaling(+entityWidth / x),
      depth: () => setScaling(+entityDepth / z),
      scale: () => value && setScaling(value),
    };

    methods[dimension]();
    this.entitySettings.loadScaling();
  }

  public async setRotation(axis: 'x' | 'y' | 'z' | 'xyz_reset', degree: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);

    const rotationMethods = {
      x: () => {
        localSettings.rotation.x += degree;
      },
      y: () => {
        localSettings.rotation.y += degree;
      },
      z: () => {
        localSettings.rotation.z += degree;
      },
      xyz_reset: () => {
        localSettings.rotation.x = 0;
        localSettings.rotation.y = 0;
        localSettings.rotation.z = 0;
      },
    };

    rotationMethods[axis]();
    this.entitySettings.loadRotation();
  }

  public async resetVisualUIMeshSettingsHelper() {
    const meshes = await firstValueFrom(this.meshes$);
    if (!meshes) throw new Error('Center missing');
    this.toggleBoundingBoxEntityVisibility(false);
    this.toggleBoundingBoxMeshesVisibility(false);
    this.toggleAxesVisibility('worldAxis', false);
    this.setScalingFactorAxis(1, true);
    this.toggleAxesVisibility('localAxis', false);
    this.setScalingFactorAxis(1, false);
    this.toggleGroundVisibility(false);
    this.setScalingFactorGround(1);
    this.entitySettings.setGroundMaterial();
    this.resetBackgroundColor();
  }

  public async resetBackgroundColor() {
    const { serverSettings } = await firstValueFrom(this.processing.settings$);
    const color = serverSettings.background.color;
    this.entitySettings.setGroundMaterial(color);
  }

  public setScalingFactorAxis(factor = 1, world: boolean) {
    if (world) this.worldAxisScalingFactor = factor;
    else this.localAxisScalingFactor = factor;

    const pos =
      factor *
      0.9 *
      (world ? this.entitySettings.worldAxisInitialSize : this.entitySettings.localAxisInitialSize);

    const axisPrefix = world ? 'world' : 'local';
    const updateMeshes = (tag: string, positionUpdate: (pos: number) => Vector3) =>
      this.babylon
        .getScene()
        .getMeshesByTags(`${axisPrefix}${tag}`)
        .forEach(mesh => {
          mesh.scaling = new Vector3(factor, factor, factor);
          mesh.position = positionUpdate(pos);
        });

    updateMeshes('Axis', () => new Vector3(factor, factor, factor));
    updateMeshes('AxisX', () => new Vector3(pos * 0.9, pos * -0.05, 0));
    updateMeshes('AxisY', () => new Vector3(0, pos * 0.9, pos * -0.05));
    updateMeshes('AxisZ', () => new Vector3(0, pos * 0.05, pos * 0.9));
  }

  public setScalingFactorGround(factor = 1) {
    if (!this.entitySettings.ground) throw new Error('Ground missing');
    this.groundScalingFactor = factor;
    this.entitySettings.ground.scaling = new Vector3(factor, factor, factor);
  }

  public toggleBoundingBoxEntityVisibility(value?: boolean) {
    if (!this.entitySettings.boundingBox) throw new Error('BoundingBox missing');
    this.boundingBoxVisibility = value !== undefined ? value : !this.boundingBoxVisibility;
    this.entitySettings.boundingBox.visibility = this.boundingBoxVisibility ? 1 : 0;
  }

  public async toggleBoundingBoxMeshesVisibility(value?: boolean) {
    const meshes = await firstValueFrom(this.meshes$);
    if (!meshes) throw new Error('Meshes missing');
    this.boundingBoxMeshesVisibility =
      value !== undefined ? value : !this.boundingBoxMeshesVisibility;
    meshes.forEach(mesh => (mesh.showBoundingBox = this.boundingBoxMeshesVisibility));
  }

  public toggleAxesVisibility(axis: 'localAxis' | 'worldAxis', value?: boolean) {
    const visibilityKey = axis === 'localAxis' ? 'localAxisVisibility' : 'worldAxisVisibility';
    const axisVisibility = value !== undefined ? value : !this[visibilityKey];
    this[visibilityKey] = axisVisibility;
    this.visibilityMesh(axis, axisVisibility);
  }

  public toggleGroundVisibility(value?: boolean) {
    this.groundVisibility = value !== undefined ? value : !this.groundVisibility;
    this.visibilityMesh('ground', this.groundVisibility);
  }

  private visibilityMesh(tag: string, visibility: boolean) {
    const setVisibility = visibility ? 1 : 0;
    this.babylon
      .getScene()
      .getMeshesByTags(tag)
      .map(mesh => (mesh.visibility = setVisibility));
  }
}
