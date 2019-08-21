import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Vector3 } from 'babylonjs';
import { ColorEvent } from 'ngx-color';

import {
  settings2D,
  settingsAudio,
  settingsEntity,
  settingsFallback,
  settingsKompakktLogo,
} from '../../../assets/settings/settings';
import { environment } from '../../../environments/environment';
import { IEntity } from '../../interfaces/interfaces';
import { BabylonService } from '../../services/babylon/babylon.service';
import { LightService } from '../../services/light/light.service';
import { MessageService } from '../../services/message/message.service';
import { EntitySettingsService } from '../../services/modelsettings/modelsettings.service';
import { MongohandlerService } from '../../services/mongohandler/mongohandler.service';
import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './object-feature-settings.component.html',
  styleUrls: ['./object-feature-settings.component.scss'],
})
export class EntityFeatureSettingsComponent implements OnInit {
  @ViewChild('stepper', { static: false }) stepper;

  public activeEntity: IEntity | undefined;
  private preview = '';
  public setEffect = false;
  private isDefault = false;
  private isEntityOwner = false;
  public isSingleEntity = false;
  private isFinished = false;
  private initialSettingsMode = false;
  public showHelpers = false;
  public showHelperBackground = false;
  public showScaling = false;
  public showOrientation = false;
  public showPreview = false;
  public showBackground = false;
  public showLights = false;
  public isFallbackEntityLoaded = false;
  public mediaType: string | undefined;

  private cameraPositionInitial:
    | {
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
      }
    | undefined;

  private ambientlightUpintensity: number | undefined;
  private ambientlightDownintensity: number | undefined;

  constructor(
    private overlayService: OverlayService,
    private babylonService: BabylonService,
    private lightService: LightService,
    private mongohandlerService: MongohandlerService,
    private message: MessageService,
    private processingService: ProcessingService,
    public entitySettingsService: EntitySettingsService,
    public dialog: MatDialog,
    private userdataService: UserdataService,
  ) {}

  ngOnInit() {
    this.mediaType = this.processingService.getCurrentMediaType();

    this.processingService.loaded.subscribe(isLoaded => {
      if (isLoaded) {
        this.activeEntity = this.processingService.getCurrentEntity();
        if (!this.activeEntity) {
          console.warn('No this.activeEntity', this);
          return;
        }
        this.isFinished = this.activeEntity.finished;
        this.setSettings()
            .then(() => {})
            .catch(error => {
              console.error(error);
              this.processingService.loadFallbackEntity()
                  .then(() => {
                    // TODO add annotation
                  })
                  .catch(e => {
                    console.error(e);
                    // tslint:disable-next-line:max-line-length
                    this.message.error('Loading of Objects does not work. Please tell us about it!');
                  });
            });
      }
    });

    this.processingService.defaultEntityLoaded.subscribe(isDefaultLoad => {
      this.isDefault = isDefaultLoad;
    });

    this.userdataService.entityOwner.subscribe(isEntityOwner => {
      this.isEntityOwner = isEntityOwner;
    });

    this.processingService.collectionLoaded.subscribe(collection => {
      this.isSingleEntity = !collection;
    });

    this.processingService.fallbackEntityLoaded.subscribe(fallback => {
      this.isFallbackEntityLoaded = fallback;
    });

    this.processingService.Observables.actualMediaType.subscribe(mediaType => {
      this.mediaType = mediaType;
    });
  }

  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);

    dialogRef.afterClosed().subscribe(finish => {
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
    this.showHelpers = this.showHelpers ? false : true;
    if (this.showHelpers) {
      this.showOrientation = false;
      this.showScaling = false;
    }
  }

  public toggleHelperBackground() {
    this.showHelperBackground = this.showHelperBackground ? false : true;
  }

  public toggleScaling() {
    this.showScaling = this.showScaling ? false : true;
    if (this.showScaling) {
      this.showOrientation = false;
      this.showHelpers = false;
    }
  }

  public toggleOrientation() {
    this.showOrientation = this.showOrientation ? false : true;
    if (this.showOrientation) {
      this.showScaling = false;
      this.showHelpers = false;
    }
  }

  public togglePreview() {
    this.showPreview = this.showPreview ? false : true;
    if (this.showPreview) {
      this.showBackground = false;
      this.showLights = false;
    }
  }

  public toggleBackground() {
    this.showBackground = this.showBackground ? false : true;
    if (this.showBackground) {
      this.showPreview = false;
      this.showLights = false;
    }
  }

  public toggleLights() {
    this.showLights = this.showLights ? false : true;
    if (this.showLights) {
      this.showPreview = false;
      this.showBackground = false;
    }
  }

  public resetHelpers() {
    if (!this.activeEntity || !this.activeEntity.settings) {
      console.warn('No this.activeEntity', this);
      return;
    }
    this.entitySettingsService.resetVisualSettingsHelper();
    this.babylonService.setBackgroundColor(
      this.activeEntity.settings.background.color,
    );
    this.setEffect = this.activeEntity.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);
    this.showHelpers = false;

    this.babylonService.cameraManager.resetCamera();
  }

  public resetMeshSize() {
    this.entitySettingsService.resetMeshSize();
    this.babylonService.cameraManager.resetCamera();
  }

  public resetMeshRotation() {
    this.entitySettingsService.resetMeshRotation();
    this.babylonService.cameraManager.resetCamera();
  }

  /*
   * Light Settings
   */

  // Ambientlights

  setAmbientlightIntensityUp(event: any) {
    this.lightService.setLightIntensity('ambientlightUp', event.value);
    this.ambientlightUpintensity = event.value;
  }

  setAmbientlightIntensityDown(event: any) {
    this.lightService.setLightIntensity('ambientlightDown', event.value);
    this.ambientlightDownintensity = event.value;
  }

  // Pointlight

  setPointlightIntensity(event: any) {
    this.lightService.setLightIntensity('pointlight', event.value);
  }

  pointlightPosX(event: any) {
    this.lightService.setLightPosition('x', event.value);
  }

  pointlightPosY(event: any) {
    this.lightService.setLightPosition('y', event.value);
  }

  pointlightPosZ(event: any) {
    this.lightService.setLightPosition('z', event.value);
  }

  /*
   * Initial Perspective & Preview Settings
   */

  public async setInitialView() {
    const {
      position,
      target,
    } = this.babylonService.cameraManager.getInitialPosition();
    this.cameraPositionInitial = { position, target };
    console.log(this.cameraPositionInitial);
    return new Promise<string>((resolve, reject) =>
      this.babylonService.createPreviewScreenshot(400).then(
        screenshot => {
          this.preview = screenshot;
          resolve(screenshot);
        },
        error => {
          this.message.error(error);
          reject(error);
        },
      ),
    );
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
    this.setEffect = this.setEffect ? false : true;
    this.babylonService.setBackgroundImage(this.setEffect);
  }

  /*
   * Load Settings
   */

  private async setSettings() {
    // Settings available?
    let upload = false;
    if (
      !this.activeEntity ||
      !this.activeEntity.settings ||
      this.activeEntity.settings.preview === undefined ||
      // TODO: how to check if settings need to be set? atm next line
      this.activeEntity.settings.preview === '' ||
      this.activeEntity.settings.cameraPositionInitial === undefined ||
      this.activeEntity.settings.background === undefined ||
      this.activeEntity.settings.lights === undefined ||
      this.activeEntity.settings.rotation === undefined ||
      this.activeEntity.settings.scale === undefined
    ) {
      upload = await this.createSettings();
      if (upload) {
        await this.initialiseUpload();
      }
    }
    if (this.activeEntity && this.activeEntity.settings && !upload) {
      console.log('SETTINGS', this.activeEntity.settings);
      await this.entitySettingsService.loadSettings(
        this.activeEntity.settings.scale,
        this.activeEntity.settings.rotation.x,
        this.activeEntity.settings.rotation.y,
        this.activeEntity.settings.rotation.z,
        this.isDefault,
      );
      await this.setCamera();
      await this.setLightBackground();
      await this.setPreview();
    }
  }

  private createSettings(): boolean {
    let settings;
    let upload = false;

    if (this.isDefault) {
      settings = settingsKompakktLogo;
    } else if (this.isFallbackEntityLoaded) {
      settings = settingsFallback;
    } else {
      switch (this.mediaType) {
        case 'entity':
        case 'model': {
          settings = settingsEntity;
          break;
        }
        case 'audio': {
          settings = settingsAudio;
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
          settings = settingsEntity;
        }
      }
      upload = true;
    }
    if (this.activeEntity) {
      this.activeEntity['settings'] = settings;
    }
    return upload;
  }

  private async initialiseUpload() {
    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const isDragDrop = queryParams.get('mode') === 'dragdrop';

    if ((isDragDrop || this.isEntityOwner) && !this.isFinished) {
      await this.setLightBackground();
      if (this.mediaType === 'audio') {
        await this.entitySettingsService.loadSettings(1, 315, 0, 0, true);
      }
      this.initialSettingsMode = true;
      await this.entitySettingsService.createVisualSettings(this.mediaType ? this.mediaType : '');
      if (this.mediaType === 'audio' || this.mediaType === 'video') {
        this.entitySettingsService.decomposeAfterSetting();
      }
      this.cameraPositionInitial = this.babylonService.cameraManager.getActualDefaultPosition();
      const cameraSettings = this.cameraPositionInitial;

      if (this.activeEntity && this.activeEntity.settings) {
        this.activeEntity.settings.cameraPositionInitial = cameraSettings;
      }
      this.overlayService.activateSettingsTab();
    }
  }

  async backToDefault() {
    this.babylonService.cameraManager.resetCamera();
    this.setLightBackground();
    this.setPreview();
    if (this.initialSettingsMode) {
      this.resetHelpers();
    }
  }

  private async setCamera() {
    if (!this.activeEntity || !this.activeEntity.settings) {
      console.warn('No this.activeEntity', this);
      return;
    }
    const camera = Array.isArray(
      this.activeEntity.settings.cameraPositionInitial,
    )
      ? (this.activeEntity.settings.cameraPositionInitial as any[]).find(
          obj => obj.cameraType === 'arcRotateCam',
        )
      : this.activeEntity.settings.cameraPositionInitial;

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
    this.cameraPositionInitial = this.babylonService.cameraManager.getInitialPosition();
  }

  private async setLightBackground() {
    if (!this.activeEntity || !this.activeEntity.settings) {
      console.warn('No this.activeEntity', this);
      return;
    }
    // Background
    this.babylonService.setBackgroundColor(
      this.activeEntity.settings.background.color,
    );
    this.setEffect = this.activeEntity.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);

    // Lights
    const pointLight = this.activeEntity.settings.lights.filter(
      obj => obj.type === 'PointLight',
    )[0];
    this.lightService.createPointLight('pointlight', pointLight.position);
    this.lightService.setLightIntensity('pointlight', pointLight.intensity);

    const hemisphericLightUp = this.activeEntity.settings.lights.filter(
      obj => obj.type === 'HemisphericLight' && obj.position.y === 1,
    )[0];
    this.lightService.createAmbientlightUp(
      'ambientlightUp',
      hemisphericLightUp.position,
    );
    this.lightService.setLightIntensity(
      'ambientlightUp',
      hemisphericLightUp.intensity,
    );
    this.ambientlightUpintensity = hemisphericLightUp.intensity;

    const hemisphericLightDown = this.activeEntity.settings.lights.filter(
      obj => obj.type === 'HemisphericLight' && obj.position.y === -1,
    )[0];
    this.lightService.createAmbientlightDown(
      'ambientlightDown',
      hemisphericLightDown.position,
    );
    this.lightService.setLightIntensity(
      'ambientlightDown',
      hemisphericLightDown.intensity,
    );
    this.ambientlightDownintensity = hemisphericLightDown.intensity;
  }

  private async setPreview() {
    if (!this.activeEntity || !this.activeEntity.settings) {
      console.warn('No this.activeEntity', this);
      return;
    }
    if (
      this.activeEntity.settings.preview !== undefined &&
      this.activeEntity.settings.preview !== ''
    ) {
      this.preview = this.activeEntity.settings.preview;
    } else {
      this.babylonService.cameraManager.resetCamera();
      await this.createMissingInitialDefaultScreenshot();
    }
  }

  private async createMissingInitialDefaultScreenshot() {
    await new Promise<string>((resolve, reject) =>
      this.babylonService
        .createPreviewScreenshot(400)
        .then(screenshot => {
          if (!this.activeEntity || !this.activeEntity.settings) {
            console.warn('No this.activeEntity', this);
            return;
          }
          this.preview = screenshot;
          this.activeEntity.settings.preview = screenshot;
          resolve(screenshot);
        })
        .catch(error => {
          this.message.error(error);
          reject(error);
        }),
    );
  }

  /*
   * Save Settings
   */
  public async saveActualSettings() {
    if (!this.cameraPositionInitial) {
      console.warn('No initial camera position', this);
      return;
    }

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
          intensity: this.ambientlightDownintensity
            ? this.ambientlightDownintensity
            : 1,
        },
        {
          type: 'HemisphericLight',
          position: {
            x: 0,
            y: 1,
            z: 0,
          },
          intensity: this.ambientlightUpintensity
            ? this.ambientlightUpintensity
            : 1,
        },
      ],
      rotation: {
        x: this.mediaType === 'audio' ? 315 : this.entitySettingsService.rotationX,
        y: this.entitySettingsService.rotationY,
        z: this.entitySettingsService.rotationZ,
      },
      scale: this.entitySettingsService.scalingFactor,
    };
    settings.lights.push(this.lightService.getPointlightData());

    if (!this.activeEntity || !this.activeEntity.settings) {
      console.warn('No this.activeEntity', this);
      return;
    }

    this.activeEntity.settings = settings;

    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const isDragDrop = queryParams.get('mode') === 'dragdrop';

    if (isDragDrop) {
      console.log(this.activeEntity, settings);
      window.top.postMessage(
        { type: 'settings', settings },
        environment.repository,
      );
    } else if (!this.isDefault && !this.isFallbackEntityLoaded) {
      this.mongohandlerService
        .updateSettings(this.activeEntity._id, settings)
        .then(result => {
          console.log(result);
          if (!this.activeEntity || !this.activeEntity.settings) {
            console.warn('No this.activeEntity', this);
            return;
          }

          if (this.initialSettingsMode) {
            this.initialSettingsMode = false;
            this.entitySettingsService.decomposeAfterSetting();
            // allow Annotations
            this.overlayService.deactivateMeshSettings();

            this.entitySettingsService.loadSettings(
              this.activeEntity.settings.scale,
              this.activeEntity.settings.rotation.x,
              this.activeEntity.settings.rotation.y,
              this.activeEntity.settings.rotation.z,
              this.mediaType,
            );
          }
        });
    }
  }
}
