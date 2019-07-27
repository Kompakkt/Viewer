import {Component, OnInit, ViewChild} from '@angular/core';
import {MatDialog} from '@angular/material';
import {Vector3} from 'babylonjs';
import {ColorEvent} from 'ngx-color';

// tslint:disable-next-line:max-line-length
import { settings2D, settingsFallback, settingsKompakktLogo, settingsModel } from '../../../assets/settings/settings';
import {BabylonService} from '../../services/babylon/babylon.service';
import {CameraService} from '../../services/camera/camera.service';
import {MessageService} from '../../services/message/message.service';
import {ModelsettingsService} from '../../services/modelsettings/modelsettings.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';
import {UserdataService} from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import {DialogMeshsettingsComponent} from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';
import {IModel} from '../../interfaces/interfaces';

@Component({
  selector: 'app-object-feature-settings',
  templateUrl: './object-feature-settings.component.html',
  styleUrls: ['./object-feature-settings.component.scss'],
})

export class ObjectFeatureSettingsComponent implements OnInit {

  @ViewChild('stepper', { static: false }) stepper;

  public activeModel: IModel | undefined;
  private preview: string | undefined;
  private setEffect = false;
  private isDefault = false;
  private isModelOwner = false;
  public isSingleModel = false;
  private isFinished = false;
  private initialSettingsMode = false;
  public showHelpers = false;
  public showHelperBackground = false;
  public showScaling = false;
  public showOrientation = false;
  public showPreview = false;
  public showBackground = false;
  public showLights = false;
  public isFallbackModelLoaded = false;
  public mediaType: string | undefined;

  private cameraPositionInitial: {
    cameraType: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
    target: {
      x: number;
      y: number;
      z: number;
    };
  } | undefined;

  private ambientlightUpintensity: number | undefined;
  private ambientlightDownintensity: number | undefined;

  constructor(private overlayService: OverlayService,
              private cameraService: CameraService,
              private babylonService: BabylonService,
              private mongohandlerService: MongohandlerService,
              private message: MessageService,
              private processingService: ProcessingService,
              public modelSettingsService: ModelsettingsService,
              public dialog: MatDialog,
              private userdataService: UserdataService,
  ) {
  }

  ngOnInit() {

    this.mediaType = this.processingService.getCurrentMediaType();

    this.processingService.loaded.subscribe(isLoaded => {
      if (isLoaded) {
        this.activeModel = this.processingService.getCurrentModel();
        this.isFinished = this.activeModel.finished;
        this.setSettings();
        // camera should not move through mesh
        this.babylonService.getScene().meshes
          .forEach(mesh => mesh.checkCollisions = true);
      }
    });

    this.processingService.defaultModelLoaded.subscribe(isDefaultLoad => {
      this.isDefault = isDefaultLoad;
    });

    this.userdataService.modelOwner.subscribe(isModelOwner => {
      this.isModelOwner = isModelOwner;
    });

    this.processingService.collectionLoaded.subscribe(collection => {
      this.isSingleModel = !collection;
    });

    this.processingService.fallbackModelLoaded.subscribe(fallback => {
      this.isFallbackModelLoaded = fallback;
    });

    this.processingService.Observables.actualMediaType.subscribe(mediaType => {
      this.mediaType = mediaType;
    });
  }

  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);

    dialogRef.afterClosed()
      .subscribe(finish => {
        if (finish) {
          this.resetHelpers();
          this.stepper.selected.completed = true;
          this.stepper.selected.editable = false;
          this.stepper.next();
        }
      });
  }

  public nextSecondStep() {
    this.setInitialView();
    this.showPreview = false;
    this.showLights = false;
    this.showBackground = false;
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = true;
    this.stepper.next();
  }

  public saveLastStep() {
    this.saveActualSettings();
  }

  public toggleHelpers() {
    this.showHelpers = (this.showHelpers) ? false : true;
    if (this.showHelpers) {
      this.showOrientation = false;
      this.showScaling = false;
    }
  }

  public toggleHelperBackground() {
    this.showHelperBackground = (this.showHelperBackground) ? false : true;
  }

  public toggleScaling() {
    this.showScaling = (this.showScaling) ? false : true;
    if (this.showScaling) {
      this.showOrientation = false;
      this.showHelpers = false;
    }
  }

  public toggleOrientation() {
    this.showOrientation = (this.showOrientation) ? false : true;
    if (this.showOrientation) {
      this.showScaling = false;
      this.showHelpers = false;
    }
  }

  public togglePreview() {
    this.showPreview = (this.showPreview) ? false : true;
    if (this.showPreview) {
      this.showBackground = false;
      this.showLights = false;
    }
  }

  public toggleBackground() {
    this.showBackground = (this.showBackground) ? false : true;
    if (this.showBackground) {
      this.showPreview = false;
      this.showLights = false;
    }
  }

  public toggleLights() {
    this.showLights = (this.showLights) ? false : true;
    if (this.showLights) {
      this.showPreview = false;
      this.showBackground = false;
    }
  }

  public resetHelpers() {
    this.modelSettingsService.resetVisualSettingsHelper();
    this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
    this.setEffect = this.activeModel.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);
    this.showHelpers = false;
    this.cameraService.backToDefault();
  }

  public resetMeshSize() {
    this.modelSettingsService.resetMeshSize();
    this.cameraService.backToDefault();
  }

  public resetMeshRotation() {
    this.modelSettingsService.resetMeshRotation();
    this.cameraService.backToDefault();
  }

  /*
   * Light Settings
   */

  // Ambientlights

  setAmbientlightIntensityUp(event: any) {
    this.babylonService.setLightIntensity('ambientlightUp', event.value);
    this.ambientlightUpintensity = event.value;
  }

  setAmbientlightIntensityDown(event: any) {
    this.babylonService.setLightIntensity('ambientlightDown', event.value);
    this.ambientlightDownintensity = event.value;
  }

  // Pointlight

  setPointlightIntensity(event: any) {
    this.babylonService.setLightIntensity('pointlight', event.value);
  }

  pointlightPosX(event: any) {
    this.babylonService.setLightPosition('x', event.value);
  }

  pointlightPosY(event: any) {
    this.babylonService.setLightPosition('y', event.value);
  }

  pointlightPosZ(event: any) {
    this.babylonService.setLightPosition('z', event.value);
  }

  /*
   * Initial Perspective & Preview Settings
   */

  public async setInitialView() {
    this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
    console.log(this.cameraPositionInitial);
    this.cameraService.setDefaultPosition(this.cameraService.arcRotateCamera.alpha,
                                          this.cameraService.arcRotateCamera.beta,
                                          this.cameraService.arcRotateCamera.radius,
                                          this.cameraService.arcRotateCamera.target.x,
                                          this.cameraService.arcRotateCamera.target.y,
                                          this.cameraService.arcRotateCamera.target.z);
    return new Promise<string>((resolve, reject) =>
      this.babylonService.createPreviewScreenshot(400)
        .then(screenshot => {
      this.preview = screenshot;
      resolve(screenshot);
    },        error => {
      this.message.error(error);
      reject(error);
    }));
  }

  /*
   * Background Settings
   */

  handleChangeColor($event: ColorEvent) {
    // color = {
    //   hex: '#333',
    //   rgb: {
    //     r: 51,
    //     g: 51,
    //     b: 51,
    //     a: 1,
    //   },
    //   hsl: {
    //     h: 0,
    //     s: 0,
    //     l: .20,
    //     a: 1,
    //   },
    // }
    this.babylonService.setBackgroundColor($event.color.rgb);
    console.log(this.babylonService.getColor());
  }

  handleChangeEffekt() {
    this.setEffect = (this.setEffect) ? false : true;
    this.babylonService.setBackgroundImage(this.setEffect);
  }

  /*
   * Load Settings
   */

  private async setSettings() {
    // Settings available?
    if (this.activeModel.settings === undefined ||
      this.activeModel.settings.preview === undefined ||
      this.activeModel.settings.cameraPositionInitial === undefined ||
      this.activeModel.settings.background === undefined ||
      this.activeModel.settings.lights === undefined ||
      this.activeModel.settings.rotation === undefined ||
      this.activeModel.settings.scale === undefined) {
      // Settings missing? => Cases: Upload || Default, Fallback
      const upload = await this.createSettings();
      if (upload) {
        await this.initialiseUpload();
      }
    }
    await this.setCamera();
    await this.modelSettingsService.loadSettings(this.activeModel.settings.scale,
                                                 this.activeModel.settings.rotation.x,
                                                 this.activeModel.settings.rotation.y,
                                                 this.activeModel.settings.rotation.z);
    await this.setLightBackground();
    await this.setPreview();
  }

  private createSettings(): boolean {

    let settings;
    let upload = false;

    if (this.isDefault) {
      console.log('DEFAULT');
      settings = settingsKompakktLogo;
    } else if (this.isFallbackModelLoaded) {
      settings = settingsFallback;
   } else {
      switch (this.mediaType) {
        case 'model': {
          settings = settingsModel;
          this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
          const cameraSettings: any[] = [];
          cameraSettings.push(this.cameraService.getActualCameraPosInitialView());
          settings['cameraPositionInitial'] = cameraSettings;
          break;
        }
        case 'audio': {
          settings = settingsKompakktLogo;
          break;
        }
        case 'video': {
          settings = settings2D;
          break;
        }
        case 'image': {
          settings = settings2D;
          break;
        }
        default: {
          settings = settingsModel;
        }
      }
      upload = true;
    }
    this.activeModel['settings'] = settings;
    console.log('SETTINGS', settings);
    return upload;
    }

  private async initialiseUpload() {
    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const isDragDrop = queryParams.get('dragdrop');

    if ((isDragDrop || this.isModelOwner) && !this.isFinished) {
      this.initialSettingsMode = true;
      await this.modelSettingsService.createVisualSettings();
      this.overlayService.activateSettingsTab();
    }
  }

  async backToDefault() {
    this.cameraService.backToDefault();
    this.setLightBackground();
    this.setPreview();
    if (this.initialSettingsMode) {
      this.resetHelpers();
    }
  }

  private async setCamera() {
    const camera =
      Array.isArray(this.activeModel.settings.cameraPositionInitial)
        ? (this.activeModel.settings.cameraPositionInitial as any[])
          .find(obj => obj.cameraType === 'arcRotateCam')
        : this.activeModel.settings.cameraPositionInitial;

    const positionVector = new Vector3(camera.position.x, camera.position.y, camera.position.z);
    const targetVector = new Vector3(camera.target.x, camera.target.y, camera.target.z);
    this.cameraService.setDefaultPosition(
      positionVector.x, positionVector.y, positionVector.z,
      targetVector.x, targetVector.y, targetVector.z);

    this.cameraService.moveCameraToTarget(positionVector);
    this.cameraService.arcRotateCamera.setTarget(targetVector);
    this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
  }

  private async setLightBackground() {
    // Background
    this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
    this.setEffect = this.activeModel.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);

    // Lights
    const pointLight = this.activeModel.settings.lights.filter(obj => obj.type === 'PointLight')[0];
    this.babylonService.createPointLight('pointlight', pointLight.position);
    this.babylonService.setLightIntensity('pointlight', pointLight.intensity);

    const hemisphericLightUp = this.activeModel.settings.lights.filter(
      obj => obj.type === 'HemisphericLight' && obj.position.y === 1)[0];
    this.babylonService.createAmbientlightUp('ambientlightUp', hemisphericLightUp.position);
    this.babylonService.setLightIntensity('ambientlightUp', hemisphericLightUp.intensity);
    this.ambientlightUpintensity = hemisphericLightUp.intensity;

    const hemisphericLightDown = this.activeModel.settings.lights.filter(
      obj => obj.type === 'HemisphericLight' && obj.position.y === -1)[0];
    this.babylonService.createAmbientlightDown('ambientlightDown', hemisphericLightDown.position);
    this.babylonService.setLightIntensity('ambientlightDown', hemisphericLightDown.intensity);
    this.ambientlightDownintensity = hemisphericLightDown.intensity;
  }

  private async setPreview() {
    if (this.activeModel.settings.preview !== undefined &&
      this.activeModel.settings.preview !== '') {
      this.preview = this.activeModel.settings.preview;
    } else {
      this.cameraService.backToDefault();
      await this.createMissingInitialDefaultScreenshot();
    }
  }

  private async createMissingInitialDefaultScreenshot() {
    await new Promise<string>((resolve, reject) =>
      this.babylonService.createPreviewScreenshot(400)
        .then(screenshot => {
          this.preview = screenshot;
          this.activeModel.settings.preview = screenshot;
          resolve(screenshot);
        })
        .catch(error => {
          this.message.error(error);
          reject(error);
        }));
  }

  /*
   * Save Settings
   */
  public async saveActualSettings() {

    const settings = {
      preview: this.preview,
      cameraPositionInitial: this.cameraPositionInitial,
      background: {
        color: this.babylonService.getColor(),
        effect: this.setEffect,
      },
      lights: [
        {
          type: 'HemisphericLight',
          position: {
            x: 0,
            y: -1,
            z: 0,
          },
          intensity: (this.ambientlightDownintensity) ? this.ambientlightDownintensity : 1,
        },
        {
          type: 'HemisphericLight',
          position: {
            x: 0,
            y: 1,
            z: 0,
          },
          intensity: this.ambientlightUpintensity ? this.ambientlightUpintensity : 1,
        },
      ],
      rotation: {
        x: this.modelSettingsService.rotationX,
        y: this.modelSettingsService.rotationY,
        z: this.modelSettingsService.rotationZ,
      },
      scale: this.modelSettingsService.scalingFactor,
    };
    settings.lights.push(this.babylonService.getPointlightData());

    this.activeModel.settings = settings;

    if (!this.isDefault && !this.isFallbackModelLoaded) {
      this.mongohandlerService
        .updateSettings(this.activeModel._id, settings)
        .then(result => {
          console.log(result);

          if (this.initialSettingsMode) {

            this.initialSettingsMode = false;
            this.modelSettingsService.decomposeAfterSetting();
            // allow Annotations
            this.overlayService.deactivateMeshSettings();

            this.modelSettingsService.loadSettings(
              this.activeModel.settings.scale,
              this.activeModel.settings.rotation.x,
              this.activeModel.settings.rotation.y,
              this.activeModel.settings.rotation.z);
          }
        });
    }
  }
}
