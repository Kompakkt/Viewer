import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { environment } from '../../../environments/environment';
import { BabylonService } from '../../services/babylon/babylon.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
import { MongohandlerService } from '../../services/mongohandler/mongohandler.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
})
export class EntityFeatureSettingsComponent implements OnInit {
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
    private mongoHandler: MongohandlerService,
    public userdataService: UserdataService,
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
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    this.processingService.actualEntitySettings.background.color = color;
    this.entitySettingsService.loadBackgroundColor();
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
    if (
      !this.processingService.defaultEntityLoaded &&
      !this.processingService.fallbackEntityLoaded
    ) {
      const settings = this.processingService.actualEntitySettings;
      this.mongoHandler.updateSettings(entity._id, settings).then(result => {
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
      throw new Error('Settings missing');
      console.error(this);
      return;
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
      }
    });
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = false;
    this.stepper.next();
  }

  public nextSecondStep() {
    this.setInitialPerspectivePreview();
    this.stepper.selected.completed = true;
    this.stepper.selected.editable = true;
    this.stepper.next();
  }
}
