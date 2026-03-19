import { AsyncPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Vector3 } from '@babylonjs/core';
import { ColorChromeModule } from 'ngx-color/chrome';
import {
  ButtonComponent,
  ButtonRowComponent,
  DetailsComponent,
  InputComponent,
  LabelledCheckboxComponent,
  SliderComponent,
} from '@kompakkt/komponents';
import { firstValueFrom, map } from 'rxjs';
import { IColor } from '@kompakkt/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { AsAbsolutePipe } from 'src/app/pipes/as-absolute.pipe';

@Component({
  selector: 'app-entity-feature-settings-mesh',
  templateUrl: './entity-feature-settings-mesh.component.html',
  styleUrls: ['./entity-feature-settings-mesh.component.scss'],
  imports: [
    ColorChromeModule,
    FormsModule,
    AsyncPipe,
    TranslatePipe,
    AsAbsolutePipe,
    ButtonRowComponent,
    ButtonComponent,
    DetailsComponent,
    LabelledCheckboxComponent,
    SliderComponent,
    InputComponent,
  ],
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
    public entitySettings: EntitySettingsService,
    public processing: ProcessingService,
    private babylon: BabylonService,
  ) {}

  get mirroredAxes$() {
    return this.processing.settings$.pipe(
      map(({ localSettings }) => localSettings.scale),
      map(scale => {
        const mirroredAxes: string[] = [];
        if (scale.x < 0) mirroredAxes.push('X');
        if (scale.y < 0) mirroredAxes.push('Y');
        if (scale.z < 0) mirroredAxes.push('Z');
        return mirroredAxes.length > 0 ? mirroredAxes.join(', ') : '';
      }),
    );
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
  public async handleChangeDimension(value: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const signX = localSettings.scale.x >= 0 ? 1 : -1;
    const signY = localSettings.scale.y >= 0 ? 1 : -1;
    const signZ = localSettings.scale.z >= 0 ? 1 : -1;
    localSettings.scale.x = Math.abs(value) * signX;
    localSettings.scale.y = Math.abs(value) * signY;
    localSettings.scale.z = Math.abs(value) * signZ;
    this.entitySettings.loadScaling();
  }

  // Mirror
  public async handleMirrorAxis(axis: 'x' | 'y' | 'z' | 'reset') {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    if (axis === 'reset') {
      localSettings.scale.x = Math.abs(localSettings.scale.x);
      localSettings.scale.y = Math.abs(localSettings.scale.y);
      localSettings.scale.z = Math.abs(localSettings.scale.z);
      this.entitySettings.loadScaling();
    } else {
      localSettings.scale[axis] = localSettings.scale[axis] * -1;
      this.entitySettings.loadScaling();
    }
  }

  // Rotation
  public async setRotation(axis: string, degree: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    switch (axis) {
      case 'x':
        localSettings.rotation.x = degree;
        this.entitySettings.loadRotation();
        break;
      case 'y':
        localSettings.rotation.y = degree;
        this.entitySettings.loadRotation();
        break;
      case 'z':
        localSettings.rotation.z = degree;
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
      console.error('Center missing', this);
      return;
    }
    this.setBoundingBoxEntityVisibility(false);
    this.setBoundingBoxMeshesVisibility(false);
    this.setAxesVisibility('worldAxis', false);
    this.setScalingFactorAxis(1, 'world');
    this.setAxesVisibility('localAxis', false);
    this.setScalingFactorAxis(1, 'local');
    this.setGroundVisibility(false);
    this.setScalingFactorGround(1);
    this.entitySettings.setGroundMaterial();
    this.resetBackgroundColor();
  }

  public async resetBackgroundColor() {
    const { serverSettings } = await firstValueFrom(this.processing.settings$);
    const color = serverSettings.background.color;
    this.entitySettings.setGroundMaterial(color);
  }

  public setScalingFactorAxis(factor: number, space: 'world' | 'local') {
    if (space === 'world') {
      this.worldAxisScalingFactor = factor;
      //const pos = factor * 0.9 * this.entitySettings.worldAxisInitialSize;
      const transformNode = this.babylon.getScene().getTransformNodesByTags('worldAxis')[0];
      transformNode.scaling = new Vector3(factor, factor, factor);
    } else {
      this.localAxisScalingFactor = factor;
      //const pos = factor * 0.9 * this.entitySettings.localAxisInitialSize;
      const transformNode = this.babylon.getScene().getTransformNodesByTags('localAxis')[0];
      transformNode.scaling = new Vector3(factor, factor, factor);
    }

    /*this.babylon
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
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.05, pos * 0.9)));*/
  }

  public setScalingFactorGround(factor: number | null) {
    if (!factor) factor = 1;
    if (!this.entitySettings.ground) {
      console.error('Ground missing', this);
      return;
    }
    this.groundScalingFactor = factor;
    this.entitySettings.ground.scaling = new Vector3(factor, factor, factor);
  }

  public setBoundingBoxEntityVisibility(enabled: boolean) {
    if (!this.entitySettings.boundingBox) {
      console.error('BoundingBox missing', this);
      return;
    }
    this.boundingBoxVisibility = enabled;
    this.entitySettings.boundingBox.visibility = this.boundingBoxVisibility ? 1 : 0;
  }

  public async setBoundingBoxMeshesVisibility(enabled: boolean) {
    const meshes = await firstValueFrom(this.meshes$);
    if (!meshes) {
      console.error('Meshes missing', this);
      return;
    }
    this.boundingBoxMeshesVisibility = enabled;
    meshes.forEach(mesh => (mesh.showBoundingBox = this.boundingBoxMeshesVisibility));
  }

  public setAxesVisibility(axis: string, enabled: boolean) {
    if (axis === 'localAxis') {
      this.localAxisVisibility = enabled;
    }
    if (axis === 'worldAxis') {
      this.worldAxisVisibility = enabled;
    }
    this.visibilityMesh(axis, enabled);
  }

  public setGroundVisibility(enabled: boolean) {
    this.groundVisibility = enabled;
    this.visibilityMesh('ground', this.groundVisibility);
  }

  private visibilityMesh(tag: string, visibility: boolean) {
    const scene = this.babylon.getScene();
    const nodes = scene.getTransformNodesByTags(tag);
    const meshes = scene.getMeshesByTags(tag);
    for (const el of [...nodes, ...meshes]) {
      el.setEnabled(visibility);
    }
  }
}
