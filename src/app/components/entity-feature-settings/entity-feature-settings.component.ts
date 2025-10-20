import { Component, viewChild, inject, signal } from '@angular/core';
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
import { ColorChromeModule } from 'ngx-color/chrome';
import {
  ButtonComponent,
  DetailsComponent,
  LabelledCheckboxComponent,
  WizardComponent,
  WizardStepComponent,
} from 'komponents';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { EntityFeatureSettingsLightsComponent } from './entity-feature-settings-lights/entity-feature-settings-lights.component';
import { EntityFeatureSettingsMeshComponent } from './entity-feature-settings-mesh/entity-feature-settings-mesh.component';
import { Color4, Tools } from '@babylonjs/core';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
  imports: [
    ColorChromeModule,
    FormsModule,
    EntityFeatureSettingsLightsComponent,
    EntityFeatureSettingsMeshComponent,
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
  private babylon = inject(BabylonService);
  public processing = inject(ProcessingService);
  public entitySettings = inject(EntitySettingsService);
  public dialog = inject(MatDialog);
  private backend = inject(BackendService);
  public userdata = inject(UserdataService);
  private postMessage = inject(PostMessageService);

  stepper = viewChild<WizardComponent>('stepper');

  videoPreviewGenerationState = signal<undefined | { current: number; total: number }>(undefined);
  videoPreviewUrl = signal<string | undefined>(undefined);
  videoGenerationSuccess = signal<{ value: boolean } | undefined>(undefined);

  currentBackgroundColor$ = this.processing.settings$.pipe(
    map(settings => settings.localSettings.background.color),
    map(color => `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`),
  );

  // used during upload while setting initial settings
  public backgroundToggle = false;
  public lightsToggle = false;
  public previewToggle = false;

  entity$ = this.processing.entity$;

  mode$ = this.processing.mode$;

  settingsReady$ = combineLatest([
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

  isStandalone$ = this.processing.isStandalone$;

  canSaveSettings$ = combineLatest([
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

  public async setInitialPerspectivePreview() {
    this.videoPreviewGenerationState.set({ current: 0, total: 1 });
    // wait for progress overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    await this.setPreview();
    await this.generatePreviewVideoScreenshots();
    this.setViewAsInitialView();
  }

  private async generatePreviewVideoScreenshots() {
    const entity = await firstValueFrom(this.entity$);
    if (!entity) return;

    const degreeRange = 180;
    const maxDegree = degreeRange / 2;
    const minDegree = -1 * maxDegree;
    const degreeSteps = degreeRange / 18; // 18 steps per preview video, total 19 frames with first frame
    const angles = [0];
    for (let degrees = maxDegree; degrees >= minDegree; degrees -= degreeSteps) {
      angles.push(degrees);
    }

    this.videoPreviewGenerationState.set({ current: 0, total: angles.length });
    const camera = this.babylon.getActiveCamera();
    const originalAlpha = camera.alpha;

    const rotateCameraToAngle = (angleDegrees: number) => {
      const angleRadians = Tools.ToRadians(angleDegrees);
      camera.alpha = originalAlpha + angleRadians;
    };

    const scene = this.babylon.getScene();
    // const clearColor = scene.clearColor;
    // scene.clearColor = new Color4(0, 0, 0, 0);

    const screenshots: string[] = [];
    console.time('screenshots');
    const rotationReady = () =>
      new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    for (let i = 0; i < angles.length; i++) {
      this.videoPreviewGenerationState.update(state => ({
        total: state?.total || angles.length,
        current: i + 1,
      }));
      const angle = angles[i];
      rotateCameraToAngle(angle);
      await rotationReady();
      const result = await Tools.CreateScreenshotUsingRenderTargetAsync(
        this.babylon.getEngine(),
        camera,
        { width: 480, height: 300 }, // 16:10
      );
      screenshots.push(result);
    }
    console.timeEnd('screenshots');
    // scene.clearColor = clearColor;
    console.log('Screenshots captured:', screenshots.length, 'Angles', angles);

    camera.alpha = originalAlpha;

    const videoGenerationSuccess = await this.backend
      .generateVideoPreview(entity._id.toString(), screenshots)
      .then(result => {
        if (result?.videoUrl) {
          this.videoPreviewUrl.set(result.videoUrl);
        }
        return true;
      })
      .catch(error => {
        console.error('Error generating video preview:', error);
        return false;
      });
    this.videoGenerationSuccess.set({ value: videoGenerationSuccess });
  }

  private async setPreview() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    return this.babylon
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
    return this.entitySettings.loadCameraInititalPosition();
  }

  public async setBackgroundColor(color: IColor) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.background.color = color;
    this.entitySettings.loadBackgroundColor();
  }

  public async setBackgroundEffect(enabled: boolean) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.background.effect = enabled;
    this.entitySettings.loadBackgroundEffect();
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

  public resetBackground() {
    this.setBackgroundColor({ r: 127, g: 127, b: 127, a: 1 });
    this.setBackgroundEffect(true);
  }

  public updateVideoPreview(videoEl: HTMLVideoElement, event: MouseEvent) {
    const { width } = videoEl.getBoundingClientRect();
    const { layerX } = event;

    // We need to offset the effect by 1 frame. The content has 19 frames, so we need to calculate the duration of a single frame, to offset by
    const frameDuration = videoEl.duration / 19;
    const ratio = layerX / width;

    // Clamp between after first frame and rest of video
    videoEl.currentTime = Math.min(
      Math.max(ratio * videoEl.duration, frameDuration),
      videoEl.duration,
    );
  }

  public resetVideoPreview(videoEl: HTMLVideoElement) {
    videoEl.currentTime = 0;
  }

  public closeVideoPreviewOverlay() {
    this.videoPreviewGenerationState.set(undefined);
    this.videoPreviewUrl.set(undefined);
    this.videoGenerationSuccess.set(undefined);
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

  public async setPerspectiveStep() {
    await this.setInitialPerspectivePreview();
    this.stepper()?.nextStep();
  }
}
