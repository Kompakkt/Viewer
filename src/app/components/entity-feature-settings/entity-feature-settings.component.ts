import { Component, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { saveAs } from 'file-saver';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { IColor } from 'src/common';
import { BabylonService } from '../../services/babylon/babylon.service';
import { BackendService } from '../../services/backend/backend.service';
import { EntitySettingsService } from '../../services/entitysettings/entitysettings.service';
import { PostMessageService } from '../../services/post-message/post-message.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ColorChromeModule } from 'ngx-color/chrome';
import {
  ButtonComponent,
  DetailsComponent,
  LabelledCheckboxComponent,
  WizardComponent,
  WizardStepComponent,
} from 'projects/komponents/src';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { EntityFeatureSettingsLightsComponent } from './entity-feature-settings-lights/entity-feature-settings-lights.component';
import { EntityFeatureSettingsMeshComponent } from './entity-feature-settings-mesh/entity-feature-settings-mesh.component';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    ColorChromeModule,
    FormsModule,
    EntityFeatureSettingsLightsComponent,
    EntityFeatureSettingsMeshComponent,
    MatIcon,
    AsyncPipe,
    TranslatePipe,
    DetailsComponent,
    ButtonComponent,
    LabelledCheckboxComponent,
    WizardComponent,
    WizardStepComponent,
    FixImageUrlPipe,
  ],
})
export class EntityFeatureSettingsComponent {
  stepper = viewChild<WizardComponent>('stepper');

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
    private postMessage: PostMessageService,
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
      this.processing.entity$,
    ]).pipe(
      map(
        ([isDefault, isFallback, isCompilationLoaded, mode, entity]) =>
          !isDefault &&
          !isFallback &&
          !isCompilationLoaded &&
          mode === 'edit' &&
          this.userdata.doesUserOwn(entity),
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
        this.postMessage.sendToParent({
          type: 'settings',
          settings: localSettings,
          data: localSettings,
        });
        // this.processing.upload = false;
      }
    });
  }

  public async exportSettings() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    if (this.postMessage.hasParent) {
      this.postMessage.sendToParent({
        type: 'settings',
        settings: localSettings,
        data: localSettings,
      });
    } else {
      const blob = new Blob([JSON.stringify(localSettings)], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, 'settings.json');
    }
  }

  public async backToDefaultSettings() {
    const { serverSettings } = await firstValueFrom(this.processing.settings$);
    this.processing.settings$.next({ serverSettings, localSettings: serverSettings });
    this.entitySettings.restoreSettings();
  }

  // _______Only used during Upload ________

  // ___________ Stepper for initial Setting during upload ___________
  public async showNextAlertFirstStep() {
    const dialogRef = this.dialog.open<DialogMeshsettingsComponent, void, boolean>(
      DialogMeshsettingsComponent,
    );
    const result = await firstValueFrom(dialogRef.afterClosed());
    console.log('Result', result, this.stepper());
    if (!result) return false;
    this.entitySettings.meshSettingsCompleted.emit(true);
    this.stepper()?.nextStep();
  }

  public nextSecondStep() {
    this.setInitialPerspectivePreview();
    this.stepper()?.nextStep();
  }
}
