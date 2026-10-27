import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Vector3 } from '@babylonjs/core';
import {
  ButtonComponent,
  ButtonRowComponent,
  DetailsComponent,
  InputComponent,
  LabelledCheckboxComponent,
  SliderComponent,
} from '@kompakkt/komponents';
import { ColorFieldComponent } from '../../color-field/color-field.component';
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
    ColorFieldComponent,
    FormsModule,
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
export class EntityFeatureSettingsMeshComponent implements OnInit, OnDestroy {
  #babylon = inject(BabylonService);
  entitySettings = inject(EntitySettingsService);
  processing = inject(ProcessingService);

  meshSettingsHelperToggle = false;
  boundingBoxVisibility = false;
  boundingBoxMeshesVisibility = false;
  backgroundColorPickerToggle = false;
  localAxisVisibility = false;
  worldAxisVisibility = false;
  groundVisibility = false;
  groundScalingFactor = 1;
  localAxisScalingFactor = 1;
  worldAxisScalingFactor = 1;
  meshScaleToggle = false;
  meshOrientationToggle = false;
  rotationGizmoActive = signal(false);
  groundColor = signal<IColor>({ r: 255, g: 255, b: 255, a: 1 });

  mirroredAxes = computed(() => {
    const settings = this.processing.settings().localSettings;
    const scale = settings.scale;
    const mirroredAxes: string[] = [];
    if (scale.x < 0) mirroredAxes.push('X');
    if (scale.y < 0) mirroredAxes.push('Y');
    if (scale.z < 0) mirroredAxes.push('Z');
    return mirroredAxes.length > 0 ? mirroredAxes.join(', ') : '';
  });

  ngOnInit() {
    this.entitySettings.meshSettingsCompleted.subscribe((finished: boolean) => {
      if (finished) {
        this.resetVisualUIMeshSettingsHelper();
        this.entitySettings.destroyVisualUIMeshSettingsHelper();
        this.entitySettings.decomposeMeshSettingsHelper();
        this.rotationGizmoActive.set(false);
      }
    });
  }

  ngOnDestroy() {
    this.rotationGizmoActive.set(false);
    this.entitySettings.setRotationGizmoEnabled(false);
  }

  public async setBackgroundColor(color: IColor) {
    const settings = this.processing.settings().localSettings;
    settings.background.color = color;
    this.processing.localSettings.set(settings);
    this.entitySettings.loadBackgroundSettings();
  }
  // ________Mesh Settings__________

  // Scaling
  public async handleChangeDimension(value: number) {
    const settings = this.processing.settings().localSettings;
    const signX = settings.scale.x >= 0 ? 1 : -1;
    const signY = settings.scale.y >= 0 ? 1 : -1;
    const signZ = settings.scale.z >= 0 ? 1 : -1;
    settings.scale.x = Math.abs(value) * signX;
    settings.scale.y = Math.abs(value) * signY;
    settings.scale.z = Math.abs(value) * signZ;

    this.processing.localSettings.set(settings);
    this.entitySettings.loadScaling();
  }

  // Mirror
  public async handleMirrorAxis(axis: 'x' | 'y' | 'z' | 'reset') {
    const settings = this.processing.settings().localSettings;
    if (axis === 'reset') {
      settings.scale.x = Math.abs(settings.scale.x);
      settings.scale.y = Math.abs(settings.scale.y);
      settings.scale.z = Math.abs(settings.scale.z);
    } else {
      settings.scale[axis] = settings.scale[axis] * -1;
    }
    this.processing.localSettings.set(settings);
    this.entitySettings.loadScaling();
  }

  // Rotation
  public async setRotation(axis: 'x' | 'y' | 'z' | 'xyz_reset', degree: number) {
    const settings = this.processing.settings().localSettings;
    switch (axis) {
      case 'x':
        settings.rotation.x = degree;
        break;
      case 'y':
        settings.rotation.y = degree;
        break;
      case 'z':
        settings.rotation.z = degree;
        break;
      case 'xyz_reset':
        settings.rotation.x = 0;
        settings.rotation.y = 0;
        settings.rotation.z = 0;
    }
    this.processing.localSettings.set(settings);
    this.entitySettings.loadRotation();
  }

  public toggleRotationGizmo(enabled: boolean) {
    this.rotationGizmoActive.set(enabled);
    this.entitySettings.setRotationGizmoEnabled(enabled);
  }

  // _____ Helpers for Mesh Settings _______
  public resetVisualUIMeshSettingsHelper() {
    const meshes = this.processing.meshes();
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
    this.groundColor.set({ r: 255, g: 255, b: 255, a: 1 });
    this.resetBackgroundColor();
  }

  public setGroundColor(color: IColor) {
    this.groundColor.set(color);
    this.entitySettings.setGroundMaterial(color);
  }

  public resetBackgroundColor() {
    const settings = this.processing.settings().serverSettings;
    const color = settings.background.color;
    this.processing.serverSettings.set(settings);
    this.entitySettings.setGroundMaterial(color);
  }

  public setScalingFactorAxis(factor: number, space: 'world' | 'local') {
    if (space === 'world') {
      this.worldAxisScalingFactor = factor;
      //const pos = factor * 0.9 * this.entitySettings.worldAxisInitialSize;
      const transformNode = this.#babylon.getScene().getTransformNodesByTags('worldAxis')[0];
      transformNode.scaling = new Vector3(factor, factor, factor);
    } else {
      this.localAxisScalingFactor = factor;
      //const pos = factor * 0.9 * this.entitySettings.localAxisInitialSize;
      const transformNode = this.#babylon.getScene().getTransformNodesByTags('localAxis')[0];
      transformNode.scaling = new Vector3(factor, factor, factor);
    }

    /*this.#babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxisX' : 'localAxisX')
      .map(mesh => (mesh.position = new Vector3(pos * 0.9, pos * -0.05, 0)));
    this.#babylon
      .getScene()
      .getMeshesByTags(world ? 'worldAxisY' : 'localAxisY')
      .map(mesh => (mesh.position = new Vector3(0, pos * 0.9, pos * -0.05)));
    this.#babylon
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

  public setBoundingBoxMeshesVisibility(enabled: boolean) {
    const meshes = this.processing.meshes();
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
    console.log('[EntityFeatureSettingsMeshComponent] setGroundVisibility', { enabled });
  }

  private visibilityMesh(tag: string, visibility: boolean) {
    const scene = this.#babylon.getScene();
    const nodes = scene.getTransformNodesByTags(tag);
    const meshes = scene.getMeshesByTags(tag);
    for (const el of [...nodes, ...meshes]) {
      el.setEnabled(visibility);
    }
  }
}
