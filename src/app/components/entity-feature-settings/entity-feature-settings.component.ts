import { Component, viewChild, inject, signal, computed } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { saveAs } from 'file-saver';
import { firstValueFrom } from 'rxjs';
import { IColor } from '@kompakkt/common';
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
} from '@kompakkt/komponents';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { DialogMeshsettingsComponent } from '../dialogs/dialog-meshsettings/dialog-meshsettings.component';
import { EntityFeatureSettingsLightsComponent } from './entity-feature-settings-lights/entity-feature-settings-lights.component';
import { EntityFeatureSettingsMeshComponent } from './entity-feature-settings-mesh/entity-feature-settings-mesh.component';
import { Tools } from '@babylonjs/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
  imports: [
    ColorChromeModule,
    FormsModule,
    EntityFeatureSettingsLightsComponent,
    EntityFeatureSettingsMeshComponent,
    MatIconModule,
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
  #babylon = inject(BabylonService);
  #backend = inject(BackendService);
  #postMessage = inject(PostMessageService);
  processing = inject(ProcessingService);
  entitySettings = inject(EntitySettingsService);
  dialog = inject(MatDialog);
  userdata = inject(UserdataService);

  stepper = viewChild<WizardComponent>('stepper');

  videoPreviewGenerationState = signal<undefined | { current: number; total: number }>(undefined);
  videoPreviewUrl = signal<string | undefined>(undefined);
  videoGenerationSuccess = signal<{ value: boolean } | undefined>(undefined);

  currentBackgroundColor = computed(() => {
    const settings = this.processing.settings().localSettings;
    const color = settings.background.color;
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
  });

  settingsReady = computed(() => {
    const showSettingsEditor = this.processing.showSettingsEditor();
    const entity = this.processing.entity();
    const settings = this.processing.settings().localSettings;
    if (!entity) return false;
    if (!settings) return false;
    return showSettingsEditor;
  });

  canSaveSettings = computed(() => {
    const isDefault = this.processing.isDefaultEntity();
    const isFallback = this.processing.isFallbackEntity();
    const isCompilationLoaded = this.processing.compilation() !== undefined;
    const mode = this.processing.mode();
    const entity = this.processing.entity();
    return (
      !isDefault &&
      !isFallback &&
      !isCompilationLoaded &&
      mode === 'edit' &&
      this.userdata.doesUserOwn(entity)
    );
  });

  public async setInitialPerspectivePreview() {
    this.videoPreviewGenerationState.set({ current: 0, total: 1 });
    // wait for progress overlay
    await new Promise(resolve => setTimeout(resolve, 300));
    await this.setPreview();
    await this.generatePreviewVideoScreenshots();
    return this.setViewAsInitialView();
  }

  private async generatePreviewVideoScreenshots() {
    const entity = this.processing.entity();
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
    const camera = this.#babylon.getActiveCamera();
    const originalAlpha = camera.alpha;

    const rotateCameraToAngle = (angleDegrees: number) => {
      const angleRadians = Tools.ToRadians(angleDegrees);
      camera.alpha = originalAlpha + angleRadians;
    };

    const scene = this.#babylon.getScene();
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
        this.#babylon.getEngine(),
        camera,
        { width: 480, height: 300 }, // 16:10
      );
      screenshots.push(result);
    }
    console.timeEnd('screenshots');
    // scene.clearColor = clearColor;
    console.log('Screenshots captured:', screenshots.length, 'Angles', angles);

    camera.alpha = originalAlpha;

    const videoGenerationSuccess = await this.#backend
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

  private setPreview() {
    const settings = this.processing.settings().localSettings;
    return this.#babylon
      .createPreviewScreenshot()
      .then(screenshot => {
        settings.preview = screenshot;
        this.processing.localSettings.set(settings);
      })
      .catch(error => {
        console.error(error);
        throw new Error('Can not create Screenshot.');
      });
  }

  private setViewAsInitialView() {
    const settings = this.processing.settings().localSettings;
    const { position, target } = this.#babylon.cameraManager.getInitialPosition();
    settings.cameraPositionInitial = {
      position,
      target,
    };
    this.processing.localSettings.set(settings);
    return this.entitySettings.loadCameraInititalPosition();
  }

  public setBackgroundColor(color: IColor) {
    const settings = this.processing.settings().localSettings;
    settings.background.color = color;
    this.processing.localSettings.set(settings);
    this.entitySettings.loadBackgroundSettings();
  }

  public setBackgroundEffect(enabled: boolean) {
    const settings = this.processing.settings().localSettings;
    settings.background.effect = enabled;
    this.processing.localSettings.set(settings);
    this.entitySettings.loadBackgroundSettings();
  }

  public async saveSettings() {
    const entity = this.processing.entity();
    const settings = this.processing.settings().localSettings;
    const isDefault = this.processing.isDefaultEntity();
    const isFallback = this.processing.isFallbackEntity();
    const isInUpload = this.processing.isInUpload();
    if (!entity) {
      console.error(this);
      throw new Error('Entity missing');
    }
    if (isDefault || isFallback) return;
    return this.#backend.updateSettings(entity._id, settings).then(result => {
      console.log('Settings gespeichert', result);
      this.processing.localSettings.set(settings);
      this.processing.serverSettings.set(settings);
      if (isInUpload) {
        return this.#postMessage.sendToParent({
          type: 'settings',
          data: {
            entityId: entity._id,
            settings: settings,
          },
        });
        // this.processing.upload = false;
      }
    });
  }

  public exportSettings() {
    const settings = this.processing.settings().localSettings;
    const blob = new Blob([JSON.stringify(settings)], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'settings.json');
  }

  public backToDefaultSettings() {
    const settings = this.processing.settings().serverSettings;
    this.processing.localSettings.set(settings);
    this.processing.serverSettings.set(settings);
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
