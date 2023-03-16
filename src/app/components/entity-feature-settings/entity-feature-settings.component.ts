import { Component, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { saveAs } from 'file-saver';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { IColor } from 'src/common';
import { environment } from '../../../environments/environment';
import { BabylonService } from '../../services/babylon/babylon.service';
import { BackendService } from '../../services/backend/backend.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
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
  @ViewChild('stepper') stepper: MatStepper | undefined;

  // used during upload while setting initial settings
  public backgroundToggle = false;
  public lightsToggle = false;
  public previewToggle = false;

  constructor(
    private babylon: BabylonService,
    public processing: ProcessingService,
    public entitySettings: EntitySettingsService,
    public dialog: MatDialog,
    private backend: BackendService,
    public userdata: UserdataService,
  ) {}

  get entity$() {
    return this.processing.entity$;
  }

  get mode$() {
    return this.processing.mode$;
  }

  get settingsReady$() {
    return combineLatest([
      this.processing.showSettingsEditor$,
      this.entity$,
      this.processing.settings$,
    ]).pipe(
      map(([value, entity, { localSettings }]) => {
        if (!entity) return false;
        if (!localSettings) return false;
        return value;
      }),
    );
  }

  get isStandalone$() {
    return this.processing.isStandalone$;
  }

  get canSaveSettings$() {
    return combineLatest([
      this.processing.defaultEntityLoaded$,
      this.processing.fallbackEntityLoaded$,
      this.processing.compilationLoaded$,
      this.mode$,
      this.userdata.userOwnsEntity$,
    ]).pipe(
      map(
        ([isDefault, isFallback, isCompilationLoaded, mode, userOwnsEntity]) =>
          !isDefault && !isFallback && !isCompilationLoaded && mode === 'edit' && userOwnsEntity,
      ),
    );
  }

  public setInitialPerspectivePreview() {
    this.setPreview();
    this.setViewAsInitialView();
  }

  private async setPreview() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.babylon
      .createPreviewScreenshot()
      .then(screenshot => {
        localSettings.preview = screenshot;
      })
      .catch(error => {
        console.error(error);
        throw new Error('Can not create Screenshot.');
      });
  }

  private async setViewAsInitialView() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const { position, target } = await this.babylon.cameraManager.getInitialPosition();
    localSettings.cameraPositionInitial = {
      position,
      target,
    };
    this.entitySettings.loadCameraInititalPosition();
  }

  public async setBackgroundColor(color: IColor) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.background.color = color;
    this.entitySettings.loadBackgroundColor();
  }

  public async saveSettings() {
    const entity = await firstValueFrom(this.entity$);
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const isDefault = await firstValueFrom(this.processing.defaultEntityLoaded$);
    const isFallback = await firstValueFrom(this.processing.fallbackEntityLoaded$);
    const isInUpload = await firstValueFrom(this.processing.isInUpload$);
    if (!entity) {
      console.error(this);
      throw new Error('Entity missing');
    }
    if (isDefault || isFallback) return;
    this.backend.updateSettings(entity._id, localSettings).then(result => {
      console.log('Settings gespeichert', result);
      this.processing.settings$.next({
        localSettings,
        serverSettings: localSettings,
      });
      if (isInUpload) {
        window.top?.postMessage(
          { type: 'settings', settings: localSettings },
          environment.repo_url,
        );
        // this.processing.upload = false;
      }
    });
  }

  public async exportSettings() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const blob = new Blob([JSON.stringify(localSettings)], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'settings.json');
  }

  public async backToDefaultSettings() {
    const { serverSettings } = await firstValueFrom(this.processing.settings$);
    this.processing.settings$.next({ serverSettings, localSettings: serverSettings });
    this.entitySettings.restoreSettings();
  }

  // _______Only used during Upload ________

  // ___________ Stepper for initial Setting during upload ___________
  public showNextAlertFirstStep() {
    const dialogRef = this.dialog.open(DialogMeshsettingsComponent);
    dialogRef.afterClosed().subscribe(finish => {
      if (finish) {
        this.entitySettings.meshSettingsCompleted.emit(true);
        if (!this.stepper) {
          return console.error('Stepper could not be accessed');
        } else {
          if (this.stepper.selected) {
            this.stepper.selected.completed = true;
            this.stepper.selected.editable = false;
            this.stepper.next();
          }
        }
      } else {
        return;
      }
    });
  }

  public nextSecondStep() {
    this.setInitialPerspectivePreview();
    if (!this.stepper) {
      return console.error('Stepper could not be accessed');
    } else {
      if (this.stepper.selected) {
        this.stepper.selected.completed = true;
        this.stepper.selected.editable = true;
        this.stepper.next();
      }
    }
  }
}
