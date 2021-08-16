import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';

import { environment } from '../../../environments/environment';
import { BabylonService } from '../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
import { BackendService } from '../../services/backend/backend.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

import { IEntity, IColor } from '~common/interfaces';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
})
export class EntityFeatureSettingsComponent {
  @ViewChild('stepper') stepper: MatStepper | undefined;

  // used during upload while setting initial settings
  public backgroundToggle = false;
  public lightsToggle = false;
  public previewToggle = false;

  public entity: IEntity | undefined;

  constructor(
    private babylon: BabylonService,
    public processing: ProcessingService,
    public entitySettings: EntitySettingsService,
    public dialog: MatDialog,
    private backend: BackendService,
    public userdata: UserdataService,
  ) {
    this.processing.entity$.subscribe(entity => (this.entity = entity));
  }

  get settingsReady() {
    return new Promise<boolean>((resolve, _) => {
      if (!this.entity) return resolve(false);
      if (!this.processing.entitySettings) return resolve(false);
      this.processing.showSettingsEditor$.toPromise().then(value => resolve(value));
    });
  }

  public setInitialPerspectivePreview() {
    this.setPreview();
    this.setViewAsInitialView();
  }

  private async setPreview() {
    this.babylon
      .createPreviewScreenshot()
      .then(screenshot => {
        if (!this.processing.entitySettings) {
          console.error(this);
          throw new Error('Settings missing');
        }
        this.processing.entitySettings.preview = screenshot;
      })
      .catch(error => {
        console.error(error);
        throw new Error('Can not create Screenshot.');
      });
  }

  private async setViewAsInitialView() {
    if (!this.processing.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    const { position, target } = await this.babylon.cameraManager.getInitialPosition();
    this.processing.entitySettings.cameraPositionInitial = {
      position,
      target,
    };
    this.entitySettings.loadCameraInititalPosition();
  }

  public setBackgroundColor(color: IColor) {
    if (!this.processing.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    this.processing.entitySettings.background.color = color;
    this.entitySettings.loadBackgroundColor();
  }

  public async saveSettings() {
    if (!this.processing.entitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    if (!this.entity) {
      console.error(this);
      throw new Error('Entity missing');
    }
    if (!this.processing.defaultEntityLoaded && !this.processing.fallbackEntityLoaded) {
      const settings = this.processing.entitySettings;
      this.backend.updateSettings(this.entity._id, settings).then(result => {
        console.log('Settings gespeichert', result);
        this.processing.entitySettingsOnServer = JSON.parse(
          JSON.stringify(this.processing.entitySettings),
        );
        if (this.processing.upload) {
          window.top.postMessage({ type: 'settings', settings }, environment.repo_url);
          this.processing.upload = false;
        }
      });
    }
  }

  public backToDefaultSettings() {
    if (!this.processing.entitySettings || !this.processing.entitySettingsOnServer) {
      console.error(this);
      throw new Error('Settings missing');
    }
    this.processing.entitySettings = {
      ...this.processing.entitySettings,
      preview: `${this.processing.entitySettingsOnServer.preview}`,
      cameraPositionInitial: {
        ...this.processing.entitySettingsOnServer.cameraPositionInitial,
      },
      background: {
        ...this.processing.entitySettingsOnServer.background,
      },
      lights: [...this.processing.entitySettingsOnServer.lights],
    };

    this.entitySettings.restoreSettings();
  }

  // _______Only used during Upload ________

  // ___________ Stepper for initial Setting during upload ___________
  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);
    dialogRef.afterClosed().subscribe(finish => {
      if (finish) {
        this.entitySettings.meshSettingsCompleted.emit(true);
        if (!this.stepper) return console.error('Stepper could not be accessed');
        this.stepper.selected.completed = true;
        this.stepper.selected.editable = false;
        this.stepper.next();
      } else {
        return;
      }
    });
  }

  public nextSecondStep() {
    this.setInitialPerspectivePreview();
    if (!this.stepper) return console.error('Stepper could not be accessed');
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = true;
    this.stepper.next();
  }
}
