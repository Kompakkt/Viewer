import { Component, OnInit } from '@angular/core';
import { Vector3 } from '@babylonjs/core';
import { firstValueFrom } from 'rxjs';
import { IColor } from 'src/common';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-entity-feature-settings-mesh',
  templateUrl: './entity-feature-settings-mesh.component.html',
  styleUrls: ['./entity-feature-settings-mesh.component.scss'],
})
export class EntityFeatureSettingsMeshComponent implements OnInit {
  public meshSettingsHelperToggle = false;
  public boundingBoxVisibility = false;
  public boundingBoxMeshesVisibility = false;
  public backgroundColorPickerToggle = false;
  public localAxisVisibility = false;
  public worldAxisVisibility = false;
  public groundVisibility = false;
  public groundScalingFactor = 1;
  public localAxisScalingFactor = 1;
  public worldAxisScalingFactor = 1;
  public meshScaleToggle = false;
  public meshOrientationToggle = false;

  constructor(private translate: TranslateService,
    public entitySettings: EntitySettingsService,
    public processing: ProcessingService,
    private babylon: BabylonService,
  ) {
    this.translate.use(window.navigator.language.split("-")[0]);
  }

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
  // ________Mesh Settings__________

  // Scaling
  public async handleChangeDimension(dimension: string, value?: number | null) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    let factor;
    switch (dimension) {
      case 'height':
        factor = +this.processing.entityHeight / this.entitySettings.initialSize.y;
        localSettings.scale = parseFloat(factor.toFixed(2));
        this.entitySettings.loadScaling();
        break;
      case 'width':
        factor = +this.processing.entityWidth / this.entitySettings.initialSize.x;
        localSettings.scale = parseFloat(factor.toFixed(2));
        this.entitySettings.loadScaling();
        break;
      case 'depth':
        factor = +this.processing.entityDepth / this.entitySettings.initialSize.z;
        localSettings.scale = parseFloat(factor.toFixed(2));
        this.entitySettings.loadScaling();
        break;
      case 'scale':
        if (value) localSettings.scale = value;
        this.entitySettings.loadScaling();
        break;
      default:
        console.log('I do not know this dimension: ', dimension);
    }
  }

  // Rotation
  public async setRotation(axis: string, degree: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    switch (axis) {
      case 'x':
        localSettings.rotation.x = localSettings.rotation.x + degree;
        this.entitySettings.loadRotation();
        break;
      case 'y':
        localSettings.rotation.y = localSettings.rotation.y + degree;
        this.entitySettings.loadRotation();
        break;
      case 'z':
        localSettings.rotation.z = localSettings.rotation.z + degree;
        this.entitySettings.loadRotation();
        break;
      case 'xyz_reset':
        localSettings.rotation.x = 0;
        localSettings.rotation.y = 0;
        localSettings.rotation.z = 0;
        this.entitySettings.loadRotation();
      default:
        console.log('I am not able to rotate.');
    }
  }

  // _____ Helpers for Mesh Settings _______
  public async resetVisualUIMeshSettingsHelper() {
    const meshes = await firstValueFrom(this.meshes$);
    if (!meshes) {
      throw new Error('Center missing');
      console.error(this);
      return;
    }
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

  public setScalingFactorAxis(factor: number | null, world: boolean) {
    if (!factor) factor = 1;
    world ? (this.worldAxisScalingFactor = factor) : (this.localAxisScalingFactor = factor);
    const pos =
      factor *
      0.9 *
      (world ? this.entitySettings.worldAxisInitialSize : this.entitySettings.localAxisInitialSize);
    this.babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxis' : 'localAxis')
      .map(mesh => {
        if (!factor) factor = 1;
        mesh.scaling = new Vector3(factor, factor, factor);
      });
    this.babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxisX' : 'localAxisX')
      .map(mesh => (mesh.position = new Vector3(pos * 0.9, pos * -0.05, 0)));
    this.babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxisY' : 'localAxisY')
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.9, pos * -0.05)));
    this.babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxisZ' : 'localAxisZ')
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.05, pos * 0.9)));
  }

  public setScalingFactorGround(factor: number | null) {
    if (!factor) factor = 1;
    if (!this.entitySettings.ground) {
      throw new Error('Ground missing');
      console.error(this);
      return;
    }
    this.groundScalingFactor = factor;
    this.entitySettings.ground.scaling = new Vector3(factor, factor, factor);
  }

  public toggleBoundingBoxEntityVisibility(value?: boolean) {
    if (!this.entitySettings.boundingBox) {
      throw new Error('BoundingBox missing');
      console.error(this);
      return;
    }
    this.boundingBoxVisibility = value !== undefined ? value : !this.boundingBoxVisibility;
    this.entitySettings.boundingBox.visibility = this.boundingBoxVisibility ? 1 : 0;
  }

  public async toggleBoundingBoxMeshesVisibility(value?: boolean) {
    const meshes = await firstValueFrom(this.meshes$);
    if (!meshes) {
      throw new Error('Meshes missing');
      console.error(this);
      return;
    }
    this.boundingBoxMeshesVisibility =
      value !== undefined ? value : !this.boundingBoxMeshesVisibility;
    meshes.forEach(mesh => (mesh.showBoundingBox = this.boundingBoxMeshesVisibility));
  }

  public toggleAxesVisibility(axis: string, value?: boolean) {
    let axisVisibility = false;
    if (axis === 'localAxis') {
      axisVisibility = value !== undefined ? value : !this.localAxisVisibility;
      this.localAxisVisibility = axisVisibility;
    }
    if (axis === 'worldAxis') {
      axisVisibility = value !== undefined ? value : !this.worldAxisVisibility;
      this.worldAxisVisibility = axisVisibility;
    }
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
