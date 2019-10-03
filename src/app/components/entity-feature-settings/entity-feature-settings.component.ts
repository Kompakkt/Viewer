import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Color3, StandardMaterial, Vector3 } from 'babylonjs';

import { BabylonService } from '../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
import {LightService} from '../../services/light/light.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import { ProcessingService } from '../../services/processing/processing.service';
import {UserdataService} from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
})
export class EntityFeatureSettingsComponent implements OnInit {
  @ViewChild('stepper', { static: false }) stepper;

  // used during upload while setting initial settings
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
  public backgroundToggle = false;
  public lightsToggle = false;
  public previewToggle = false;

  constructor(
    private babylonService: BabylonService,
    private processingService: ProcessingService,
    public entitySettingsService: EntitySettingsService,
    public dialog: MatDialog,
    private mongoHandler: MongohandlerService,
    public userdataService: UserdataService,
    public  lightService: LightService,
  ) {}

  ngOnInit() {}

  public setInitialPerspectivePreview() {
    this.setPreview();
    this.setActualViewAsInitialView();
  }

  private async setPreview() {
    this.babylonService
        .createPreviewScreenshot(400)
        .then(screenshot => {
          if (!this.processingService.actualEntitySettings) {
            throw new Error('Settings missing');
            console.error(this);
            return;
          }
          this.processingService.actualEntitySettings.preview = screenshot;
        })
        .catch(error => {
          throw new Error('Can not create Screenshot.');
          console.error(error);
          return;
        });
  }

  private async setActualViewAsInitialView() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const {position, target} = await this.babylonService.cameraManager.getInitialPosition();
    this.processingService.actualEntitySettings.cameraPositionInitial = { position, target };
    this.entitySettingsService.loadCameraInititalPosition();
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

  // Lights
  setLightIntensity(intensity: number, lightType: string) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const indexOfLight = this.lightService.getLightIndexByType(lightType);
    if (indexOfLight !== undefined) {
      this.processingService.actualEntitySettings.lights[indexOfLight].intensity = intensity;
      this.entitySettingsService.loadLightIntensity(lightType);
    } else {
      // tslint:disable-next-line:prefer-template
      throw new Error('Light, ' + lightType + ', is missing');
      console.error(this);
      return;
    }
  }

  getLightIntensity(lightType: string): number {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return 0;
    }
    const light = this.lightService.getLightByType(lightType);
    if (light) {
      return light.intensity;
    } else {
      return 0;
    }
  }

  setPointlightPosition(dimension: string, value: number) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const indexOfLight = this.lightService.getLightIndexByType('pointLight');
    if (indexOfLight) {
      switch (dimension) {
        case 'x':
        this.processingService.actualEntitySettings.lights[indexOfLight].position.x = value;
        break;
        case 'y':
          this.processingService.actualEntitySettings.lights[indexOfLight].position.y = value;
          break;
        case 'z':
          this.processingService.actualEntitySettings.lights[indexOfLight].position.z = value;
          break;
        default:
          // tslint:disable-next-line:prefer-template
          throw new Error('Pointlightposition, ' + dimension + ', is missing');
          console.error(this);
          return;
      }
    }
    this.entitySettingsService.loadPointLightPosition();

  }

  public async saveActualSettings() {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const entity = this.processingService.getCurrentEntity();
    if (!entity) {
      throw new Error('Entity missing');
      console.error(this);
      return;
    }
    if (!this.processingService.defaultEntityLoaded &&
        !this.processingService.fallbackEntityLoaded) {
      this.mongoHandler
          .updateSettings(entity._id, this.processingService.actualEntitySettings)
          .then(result => {
            console.log('Settings gespeichert', result);
            this.processingService.actualEntitySettingsOnServer =
                JSON.parse(JSON.stringify(this.processingService.actualEntitySettings));
            if (this.processingService.upload) this.processingService.upload = false;
          });
    }
  }

  public backToDefaultSettings() {
    if (!this.processingService.actualEntitySettings ||
        !this.processingService.actualEntitySettingsOnServer) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    this.processingService.actualEntitySettings.preview =
        JSON.parse(JSON.stringify(this.processingService.actualEntitySettingsOnServer.preview));
    this.processingService.actualEntitySettings.cameraPositionInitial =
        JSON.parse(JSON.stringify(
            this.processingService.actualEntitySettingsOnServer.cameraPositionInitial));
    this.processingService.actualEntitySettings.background =
        JSON.parse(JSON.stringify(this.processingService.actualEntitySettingsOnServer.background));
    this.processingService.actualEntitySettings.lights =
        JSON.parse(JSON.stringify(this.processingService.actualEntitySettingsOnServer.lights));

    JSON.parse(JSON.stringify(this.processingService.actualEntitySettingsOnServer));
    this.entitySettingsService.restoreSettings();
  }

  // _______Only used during Upload ________

  // ___________ Stepper for initial Setting during upload ___________
  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);
    dialogRef.afterClosed()
        .subscribe(finish => {
          if (finish) {
            this.resetVisualUIMeshSettingsHelper()
                .then(() => {
                  this.entitySettingsService.destroyVisualUIMeshSettingsHelper();
                  this.entitySettingsService.decomposeMeshSettingsHelper();
                });
            this.stepper.selected.completed = true;
            this.stepper.selected.editable = false;
            this.stepper.next();
          }
        });
  }

  public nextSecondStep() {
    this.setInitialPerspectivePreview();
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = true;
    this.stepper.next();
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
        factor = +this.processingService.actualEntityHeight /
            this.entitySettingsService.initialSize.y;
        this.processingService.actualEntitySettings.scale = parseFloat(factor.toFixed(2));
        this.entitySettingsService.loadScaling();
        break;
      case 'width':
        factor = +this.processingService.actualEntityWidth /
            this.entitySettingsService.initialSize.x;
        this.processingService.actualEntitySettings.scale = parseFloat(factor.toFixed(2));
        this.entitySettingsService.loadScaling();
        break;
      case 'depth':
        factor = +this.processingService.actualEntityDepth /
            this.entitySettingsService.initialSize.z;
        this.processingService.actualEntitySettings.scale = parseFloat(factor.toFixed(2));
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
    // TODO refactor
    const color = {
      r: 255,
      g: 255,
      b: 255,
    };
    this.setGroundColor(color);
    this.setBackgroundColor(color);
  }

  public setGroundColor(color) {
    const material = new StandardMaterial(
        'GroundPlaneMaterial',
        this.babylonService.getScene(),
    );
    material.diffuseColor = new Color3(
        color.r / 255,
        color.g / 255,
        color.b / 255,
    );
    if (this.entitySettingsService.ground) this.entitySettingsService.ground.material = material;
  }

  public setScalingFactorAxis(factor: number, world: boolean) {
    world ? this.worldAxisScalingFactor = factor : this.localAxisScalingFactor = factor;
    const pos = (factor * 0.9) *
        (world ? this.entitySettingsService.worldAxisInitialSize :
            this.entitySettingsService.localAxisInitialSize);
    this.babylonService
        .getScene()
        .getMeshesByTags(world ? 'worldAxis' : 'localAxis')
        .map(
            mesh =>
                (mesh.scaling = new Vector3(factor, factor, factor)),
        );
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
    this.entitySettingsService.ground.scaling = new Vector3(factor, factor, factor);
  }

  public toggleBoundingBoxEntityVisibility(value?: boolean) {
    if (!this.entitySettingsService.boundingBox) {
      throw new Error('BoundingBox missing');
      console.error(this);
      return;
    }
    this.boundingBoxVisibility = (value !== undefined) ? value : !this.boundingBoxVisibility;
    this.entitySettingsService.boundingBox.visibility = this.boundingBoxVisibility ? 1 : 0;
  }

  public toggleBoundingBoxMeshesVisibility(value?: boolean) {
    const meshes = this.processingService.getCurrentEntityMeshes();
    if (!meshes) {
      throw new Error('Meshes missing');
      console.error(this);
      return;
    }
    this.boundingBoxMeshesVisibility = (value !== undefined) ? value :
        !this.boundingBoxMeshesVisibility;
    meshes.forEach(mesh => mesh.showBoundingBox = this.boundingBoxMeshesVisibility);
  }

  public toggleAxesVisibility(axis: string, value?: boolean) {
    let axisVisibility = false;
    if (axis === 'localAxis') {
      axisVisibility = (value !== undefined) ? value : !this.localAxisVisibility;
      this.localAxisVisibility = axisVisibility;
    }
    if (axis === 'worldAxis') {
      axisVisibility = (value !== undefined) ? value : !this.worldAxisVisibility;
      this.worldAxisVisibility = axisVisibility;
    }
    this.visibilityMesh(axis, axisVisibility);
  }

  public toggleGroundVisibility(value?: boolean) {
    this.groundVisibility = (value !== undefined) ? value : !this.groundVisibility;
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
