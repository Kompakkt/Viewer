import {
  Component,
  DestroyRef,
  viewChild,
  inject,
  signal,
  computed,
  effect,
  ElementRef,
} from '@angular/core';
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
import { ColorFieldComponent } from '../color-field/color-field.component';
import {
  ButtonComponent,
  DetailsComponent,
  LabelledCheckboxComponent,
  MenuOptionComponent,
  SelectComponent,
  SliderComponent,
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
import { DEFAULT_MICRO_SURFACE, SKYBOX_PRESETS } from '../../services/babylon/skyboxes';
import { prepareSkyboxForUpload, skyboxToBase64 } from '../../services/babylon/skybox-upload';

@Component({
  selector: 'app-entity-feature-settings',
  templateUrl: './entity-feature-settings.component.html',
  styleUrls: ['./entity-feature-settings.component.scss'],
  imports: [
    ColorFieldComponent,
    FormsModule,
    EntityFeatureSettingsLightsComponent,
    EntityFeatureSettingsMeshComponent,
    MatIconModule,
    TranslatePipe,
    DetailsComponent,
    ButtonComponent,
    LabelledCheckboxComponent,
    SelectComponent,
    SliderComponent,
    MenuOptionComponent,
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
  lightsStep = viewChild<WizardStepComponent>('lightsStep');
  skyboxUploadInput = viewChild<ElementRef<HTMLInputElement>>('skyboxUploadInput');

  // Light helpers are only shown while the light controls are actually on screen.
  lightsHelpersActive = computed(
    () => this.lightsDetailsExpanded() && this.lightsStep()?.active() === true,
  );
  lightsDetailsExpanded = signal(true);

  skyboxPresets = SKYBOX_PRESETS;
  selectedSkybox = signal('custom');
  skyboxMicroSurface = signal(DEFAULT_MICRO_SURFACE);
  skyboxUploadBusy = signal(false);
  skyboxUploadError = signal<string | undefined>(undefined);
  pendingSkybox = signal<undefined | { blobUrl: string; data: string }>(undefined);
  skyboxUploadStage = signal<undefined | 'uploading' | 'success' | 'failed'>(undefined);
  skyboxUploadOverlayDimmed = computed(
    () => this.skyboxUploadStage() === 'failed' || this.skyboxUploadStage() === 'success',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const pending = this.pendingSkybox();
      if (pending) URL.revokeObjectURL(pending.blobUrl);
    });
    effect(() => {
      const skybox = this.processing.settings().localSettings.skybox;
      this.selectedSkybox.set(skybox?.url ? 'custom-upload' : (skybox?.preset ?? 'custom'));
      this.skyboxMicroSurface.set(skybox?.microSurface ?? DEFAULT_MICRO_SURFACE);
    });
  }

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

  public setSkybox(value: string) {
    if (value === 'custom-upload') {
      this.skyboxUploadError.set(undefined);
      this.skyboxUploadInput()?.nativeElement.click();
      return;
    }
    const settings = this.processing.settings().localSettings;
    settings.skybox =
      value === 'custom'
        ? undefined
        : {
            preset: value,
            microSurface: settings.skybox?.microSurface ?? DEFAULT_MICRO_SURFACE,
          };
    this.processing.localSettings.set(settings);
    this.selectedSkybox.set(value);
    this.skyboxMicroSurface.set(settings.skybox?.microSurface ?? DEFAULT_MICRO_SURFACE);
    this.entitySettings.loadBackgroundSettings();
  }

  public setSkyboxMicroSurface(microSurface: number) {
    const settings = this.processing.settings().localSettings;
    if (!settings.skybox) return;
    settings.skybox = { ...settings.skybox, microSurface };
    this.processing.localSettings.set(settings);
    this.skyboxMicroSurface.set(microSurface);
    this.entitySettings.loadBackgroundSettings();
  }

  public async onSkyboxFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.skyboxUploadBusy()) return;

    this.skyboxUploadError.set(undefined);
    this.skyboxUploadBusy.set(true);
    try {
      const entity = this.processing.entity();
      if (!entity) throw new Error('Entity missing');

      let env: ArrayBuffer;
      try {
        env = await prepareSkyboxForUpload(file, this.#babylon.getScene());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Could not convert "${file.name}": ${message}`);
      }
      if (this.processing.isInUpload()) {
        // Convert and preview locally now; persisting on the server is deferred to
        // completeBackgroundStep() when the "Background and lights" step is completed
        const data = await skyboxToBase64(env);
        const old = this.pendingSkybox();
        if (old) URL.revokeObjectURL(old.blobUrl);
        const blobUrl = URL.createObjectURL(new Blob([env]));
        const settings = this.processing.settings().localSettings;
        settings.skybox = { url: blobUrl, microSurface: this.skyboxMicroSurface() };
        this.processing.localSettings.set(settings);
        this.selectedSkybox.set('custom-upload');
        this.entitySettings.loadBackgroundSettings();
        this.pendingSkybox.set({ blobUrl, data });
      } else {
        const data = await skyboxToBase64(env);
        let result;
        try {
          result = await this.#backend.uploadCustomSkybox(entity._id.toString(), data);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to upload the skybox: ${message}`);
        }

        const settings = this.processing.settings().localSettings;
        settings.skybox = { url: result.skyboxUrl, microSurface: this.skyboxMicroSurface() };
        this.processing.localSettings.set(settings);
        this.selectedSkybox.set('custom-upload');
        this.entitySettings.loadBackgroundSettings();
      }
    } catch (error) {
      console.error('Preparing the custom skybox for upload failed', error);
      this.skyboxUploadError.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.skyboxUploadBusy.set(false);
    }
  }

  public async completeBackgroundStep() {
    const pending = this.pendingSkybox();
    const entity = this.processing.entity();
    if (
      pending &&
      (!entity || this.processing.settings().localSettings.skybox?.url !== pending.blobUrl)
    ) {
      // The pending skybox was abandoned (preset or colour selected): discard it and advance
      URL.revokeObjectURL(pending.blobUrl);
      this.pendingSkybox.set(undefined);
      this.stepper()?.nextStep();
      return;
    }
    if (!pending || !entity) {
      this.stepper()?.nextStep();
      return;
    }

    this.skyboxUploadStage.set('uploading');
    try {
      let result;
      try {
        result = await this.#backend.uploadCustomSkybox(entity._id.toString(), pending.data);
      } catch (error) {
        console.error('Uploading custom skybox failed', error);
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to upload the skybox: ${message}`);
      }
      const settings = this.processing.settings().localSettings;
      settings.skybox = { url: result.skyboxUrl, microSurface: this.skyboxMicroSurface() };
      this.processing.localSettings.set(settings);
      URL.revokeObjectURL(pending.blobUrl);
      this.pendingSkybox.set(undefined);
      this.entitySettings.loadBackgroundSettings();
      this.skyboxUploadStage.set('success');
    } catch (error) {
      console.error('Applying the uploaded skybox failed', error);
      this.skyboxUploadStage.set('failed');
    }
  }

  public closeSkyboxUploadOverlay() {
    const stage = this.skyboxUploadStage();
    this.skyboxUploadStage.set(undefined);
    // Only advance after the user acknowledges the result; a failed upload keeps them on the step to retry
    if (stage === 'success') this.stepper()?.nextStep();
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
    this.setSkybox('custom');
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
