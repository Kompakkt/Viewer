import { Component, OnInit } from '@angular/core';
import { Color3, StandardMaterial, Vector3 } from 'babylonjs';

import { BabylonService } from '../../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';

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

  constructor(
    public entitySettingsService: EntitySettingsService,
    private processingService: ProcessingService,
    private babylonService: BabylonService,
  ) {}

  ngOnInit() {
    this.entitySettingsService.meshSettingsCompleted.subscribe(finished => {
      if (finished) {
        this.resetVisualUIMeshSettingsHelper().then(() => {
          this.entitySettingsService.destroyVisualUIMeshSettingsHelper();
          this.entitySettingsService.decomposeMeshSettingsHelper();
        });
      }
    });
  }

  public setBackgroundColor(color) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    this.processingService.actualEntitySettings.background.color = color;
    this.entitySettingsService.loadBackgroundColor();
  }
  // ________Mesh Settings__________

  // Scaling
  public handleChangeDimension(dimension: string, value?: number) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    let factor;
    switch (dimension) {
      case 'height':
        factor =
          +this.processingService.actualEntityHeight /
          this.entitySettingsService.initialSize.y;
        this.processingService.actualEntitySettings.scale = parseFloat(
          factor.toFixed(2),
        );
        this.entitySettingsService.loadScaling();
        break;
      case 'width':
        factor =
          +this.processingService.actualEntityWidth /
          this.entitySettingsService.initialSize.x;
        this.processingService.actualEntitySettings.scale = parseFloat(
          factor.toFixed(2),
        );
        this.entitySettingsService.loadScaling();
        break;
      case 'depth':
        factor =
          +this.processingService.actualEntityDepth /
          this.entitySettingsService.initialSize.z;
        this.processingService.actualEntitySettings.scale = parseFloat(
          factor.toFixed(2),
        );
        this.entitySettingsService.loadScaling();
        break;
      case 'scale':
        if (value) this.processingService.actualEntitySettings.scale = value;
        this.entitySettingsService.loadScaling();
        break;
      default:
        console.log('I do not know this dimension: ', dimension);
    }
  }

  // Rotation
  setRotation(axis: string, degree: number) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    switch (axis) {
      case 'x':
        this.processingService.actualEntitySettings.rotation.x =
          this.processingService.actualEntitySettings.rotation.x + degree;
        this.entitySettingsService.loadRotation();
        break;
      case 'y':
        this.processingService.actualEntitySettings.rotation.y =
          this.processingService.actualEntitySettings.rotation.y + degree;
        this.entitySettingsService.loadRotation();
        break;
      case 'z':
        this.processingService.actualEntitySettings.rotation.z =
          this.processingService.actualEntitySettings.rotation.z + degree;
        this.entitySettingsService.loadRotation();
        break;
      case 'xyz_reset':
        this.processingService.actualEntitySettings.rotation.x = 0;
        this.processingService.actualEntitySettings.rotation.y = 0;
        this.processingService.actualEntitySettings.rotation.z = 0;
        this.entitySettingsService.loadRotation();
      default:
        console.log('I am not able to rotate.');
    }
  }

  // _____ Helpers for Mesh Settings _______
  public async resetVisualUIMeshSettingsHelper() {
    const meshes = this.processingService.getCurrentEntityMeshes();
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
    this.setGroundColor();
    this.resetBackgroundColor();
  }

  public resetBackgroundColor() {
    if (!this.processingService.actualEntitySettingsOnServer) {
      throw new Error('Settings from Server missing');
      console.error(this);
      return;
    }
    const color = this.processingService.actualEntitySettingsOnServer
      .background;
    this.setGroundColor(color);
  }

  public setGroundColor(color?) {
    const material = new StandardMaterial(
      'GroundPlaneMaterial',
      this.babylonService.getScene(),
    );
    material.diffuseColor = new Color3(
      (color ? color.r : 255) / 255,
      (color ? color.g : 255) / 255,
      (color ? color.b : 255) / 255,
    );
    if (this.entitySettingsService.ground) {
      this.entitySettingsService.ground.material = material;
    }
  }

  public setScalingFactorAxis(factor: number, world: boolean) {
    world
      ? (this.worldAxisScalingFactor = factor)
      : (this.localAxisScalingFactor = factor);
    const pos =
      factor *
      0.9 *
      (world
        ? this.entitySettingsService.worldAxisInitialSize
        : this.entitySettingsService.localAxisInitialSize);
    this.babylonService
      .getScene()
      .getMeshesByTags(world ? 'worldAxis' : 'localAxis')
      .map(mesh => (mesh.scaling = new Vector3(factor, factor, factor)));
    this.babylonService
      .getScene()
      .getMeshesByTags(world ? 'worldAxisX' : 'localAxisX')
      .map(mesh => (mesh.position = new Vector3(pos * 0.9, pos * -0.05, 0)));
    this.babylonService
      .getScene()
      .getMeshesByTags(world ? 'worldAxisY' : 'localAxisY')
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.9, pos * -0.05)));
    this.babylonService
      .getScene()
      .getMeshesByTags(world ? 'worldAxisZ' : 'localAxisZ')
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.05, pos * 0.9)));
  }

  public setScalingFactorGround(factor: number) {
    if (!this.entitySettingsService.ground) {
      throw new Error('Ground missing');
      console.error(this);
      return;
    }
    this.groundScalingFactor = factor;
    this.entitySettingsService.ground.scaling = new Vector3(
      factor,
      factor,
      factor,
    );
  }

  public toggleBoundingBoxEntityVisibility(value?: boolean) {
    if (!this.entitySettingsService.boundingBox) {
      throw new Error('BoundingBox missing');
      console.error(this);
      return;
    }
    this.boundingBoxVisibility =
      value !== undefined ? value : !this.boundingBoxVisibility;
    this.entitySettingsService.boundingBox.visibility = this
      .boundingBoxVisibility
      ? 1
      : 0;
  }

  public toggleBoundingBoxMeshesVisibility(value?: boolean) {
    const meshes = this.processingService.getCurrentEntityMeshes();
    if (!meshes) {
      throw new Error('Meshes missing');
      console.error(this);
      return;
    }
    this.boundingBoxMeshesVisibility =
      value !== undefined ? value : !this.boundingBoxMeshesVisibility;
    meshes.forEach(
      mesh => (mesh.showBoundingBox = this.boundingBoxMeshesVisibility),
    );
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
    this.groundVisibility =
      value !== undefined ? value : !this.groundVisibility;
    this.visibilityMesh('ground', this.groundVisibility);
  }

  private visibilityMesh(tag: string, visibility: boolean) {
    const setVisibility = visibility ? 1 : 0;
    this.babylonService
      .getScene()
      .getMeshesByTags(tag)
      .map(mesh => (mesh.visibility = setVisibility));
  }
}
