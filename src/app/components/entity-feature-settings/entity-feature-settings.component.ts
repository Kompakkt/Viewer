import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { environment } from '../../../environments/environment';
import { BabylonService } from '../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
import { BackendService } from '../../services/backend/backend.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
})
export class EntityFeatureSettingsComponent {
  @ViewChild('stepper') stepper;

  // used during upload while setting initial settings
  public backgroundToggle = false;
  public lightsToggle = false;
  public previewToggle = false;

  constructor(
    private babylonService: BabylonService,
    public processingService: ProcessingService,
    public entitySettingsService: EntitySettingsService,
    public dialog: MatDialog,
    private backend: BackendService,
    public userdataService: UserdataService,
  ) {}

  public setInitialPerspectivePreview() {
    this.setPreview();
    this.setActualViewAsInitialView();
  }

  private async setPreview() {
    this.babylonService
      .createPreviewScreenshot()
      .then(screenshot => {
        if (!this.processingService.actualEntitySettings) {
          console.error(this);
          throw new Error('Settings missing');
        }
        this.processingService.actualEntitySettings.preview = screenshot;
      })
      .catch(error => {
        console.error(error);
        throw new Error('Can not create Screenshot.');
      });
  }

  private async setActualViewAsInitialView() {
    if (!this.processingService.actualEntitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    const {
      position,
      target,
    } = await this.babylonService.cameraManager.getInitialPosition();
    this.processingService.actualEntitySettings.cameraPositionInitial = {
      position,
      target,
    };
    this.entitySettingsService.loadCameraInititalPosition();
  }

  public setBackgroundColor(color) {
    if (!this.processingService.actualEntitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    this.processingService.actualEntitySettings.background.color = color;
    this.entitySettingsService.loadBackgroundColor();
  }

  public async saveActualSettings() {
    if (!this.processingService.actualEntitySettings) {
      console.error(this);
      throw new Error('Settings missing');
    }
    const entity = this.processingService.getCurrentEntity();
    if (!entity) {
      console.error(this);
      throw new Error('Entity missing');
    }
    if (
      !this.processingService.defaultEntityLoaded &&
      !this.processingService.fallbackEntityLoaded
    ) {
      const settings = this.processingService.actualEntitySettings;
      this.backend.updateSettings(entity._id, settings).then(result => {
        console.log('Settings gespeichert', result);
        this.processingService.actualEntitySettingsOnServer = JSON.parse(
          JSON.stringify(this.processingService.actualEntitySettings),
        );
        if (this.processingService.upload) {
          window.top.postMessage(
            { type: 'settings', settings },
            environment.repository,
          );
          this.processingService.upload = false;
        }
      });
    }
  }

  public backToDefaultSettings() {
    if (
      !this.processingService.actualEntitySettings ||
      !this.processingService.actualEntitySettingsOnServer
    ) {
      console.error(this);
      throw new Error('Settings missing');
    }
    this.processingService.actualEntitySettings.preview = JSON.parse(
      JSON.stringify(
        this.processingService.actualEntitySettingsOnServer.preview,
      ),
    );
    this.processingService.actualEntitySettings.cameraPositionInitial = JSON.parse(
      JSON.stringify(
        this.processingService.actualEntitySettingsOnServer
          .cameraPositionInitial,
      ),
    );
    this.processingService.actualEntitySettings.background = JSON.parse(
      JSON.stringify(
        this.processingService.actualEntitySettingsOnServer.background,
      ),
    );
    this.processingService.actualEntitySettings.lights = JSON.parse(
      JSON.stringify(
        this.processingService.actualEntitySettingsOnServer.lights,
      ),
    );

    this.entitySettingsService.restoreSettings();
  }

  // _______Only used during Upload ________

  // ___________ Stepper for initial Setting during upload ___________
  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);
    dialogRef.afterClosed().subscribe(finish => {
      if (finish) {
        this.entitySettingsService.meshSettingsCompleted.emit(true);
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
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = true;
    this.stepper.next();
  }
}
