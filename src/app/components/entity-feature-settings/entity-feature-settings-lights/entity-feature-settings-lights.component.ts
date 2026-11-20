import { Component, computed, effect, inject, input, OnDestroy } from '@angular/core';
import { IColor } from '@kompakkt/common';
import { ColorFieldComponent } from '../../color-field/color-field.component';
import {
  ButtonComponent,
  DetailsComponent,
  InputComponent,
  LabelledCheckboxComponent,
  MenuComponent,
  MenuOptionComponent,
  SliderComponent,
} from '@kompakkt/komponents';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { LightService, LightType, SPOT_ANGLE_MAX } from '../../../services/light/light.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { FluentPipe } from '../../../pipes/fluent.pipe';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
  imports: [
    FluentPipe,
    SliderComponent,
    InputComponent,
    ButtonComponent,
    MenuComponent,
    MenuOptionComponent,
    LabelledCheckboxComponent,
    ColorFieldComponent,
    DetailsComponent,
    MatIconModule,
    DecimalPipe,
  ],
})
export class EntityFeatureSettingsLightsComponent implements OnDestroy {
  public entitySettings = inject(EntitySettingsService);
  public lights = inject(LightService);
  public processing = inject(ProcessingService);
  public babylon = inject(BabylonService);
  public spotAngleMax = Number(SPOT_ANGLE_MAX.toFixed(2));

  public roundedAngle(value: number): number {
    return Number(value.toFixed(2));
  }

  public helpersActive = input(false);

  public lightTypes = [
    { value: 'Point', label: 'k_entity-feature-settings-lights-type-point' },
    { value: 'Ambient', label: 'k_entity-feature-settings-lights-type-ambient' },
    { value: 'Spot', label: 'k_entity-feature-settings-lights-type-spot' },
    { value: 'Directional', label: 'k_entity-feature-settings-lights-type-directional' },
  ] as const satisfies readonly { value: LightType; label: string }[];

  constructor() {
    effect(() => {
      this.lights.setPanelActive(this.helpersActive());
    });
  }

  public ngOnDestroy(): void {
    this.lights.setPanelActive(false);
  }

  public selectLight(index: number) {
    this.lights.selectLight(index);
  }

  public readonly selectedEntry = computed(() => {
    const index = this.lights.selectedLightIndex();
    if (index === undefined) return undefined;
    return this.lights.entryList().find(entry => entry.index === index);
  });

  public jumpToLight(index: number) {
    const entry = this.lights.entries.get(index);
    if (!entry) return;
    const camera = this.babylon.getActiveCamera();
    if (!camera) return;
    const target = entry.proxy.position;
    const offset = camera.position.subtract(target);
    if (offset.length() < 0.01) offset.set(0, 0, 1);
    const distance = Math.max(offset.length(), 5);
    offset.normalize();
    this.babylon.cameraManager.smoothCameraTransition(
      {
        camera,
        scene: this.babylon.getScene(),
        position: target.add(offset.scale(distance)),
        target,
      },
      1,
    );
  }

  public async addLight(type: LightType) {
    const settings = this.processing.settings().localSettings;
    this.lights.addLight(type);
    this.processing.localSettings.set(settings);
  }

  public async removeLight(index: number) {
    const settings = this.processing.settings().localSettings;
    this.lights.removeLight(index);
    this.processing.localSettings.set(settings);
  }

  public async setName(index: number, value: string) {
    const settings = this.processing.settings().localSettings;
    this.lights.setName(index, value);
    this.processing.localSettings.set(settings);
  }

  public async setIntensity(index: number, value: number | null) {
    const settings = this.processing.settings().localSettings;
    this.lights.setIntensity(index, value ?? 0);
    this.processing.localSettings.set(settings);
  }

  public async setColor(index: number, color: IColor) {
    console.log('[Light color]', color);
    const settings = this.processing.settings().localSettings;
    this.lights.setColor(index, color);
    this.processing.localSettings.set(settings);
  }

  public async setPosition(index: number, axis: 'x' | 'y' | 'z', value: number | null) {
    const settings = this.processing.settings().localSettings;
    const current = settings.lights[index].position;
    const next = { ...current, [axis]: value ?? 0 };
    this.lights.setPosition(index, next);
    this.processing.localSettings.set(settings);
  }

  public async setRotation(index: number, axis: 'x' | 'y' | 'z', value: number | null) {
    const settings = this.processing.settings().localSettings;
    const current = settings.lights[index].rotation ?? { x: 0, y: 0, z: 0 };
    const next = { ...current, [axis]: value ?? 0 };
    this.lights.setRotation(index, next);
    this.processing.localSettings.set(settings);
  }

  public async setSpotParams(index: number, angle: number, exponent: number) {
    const settings = this.processing.settings().localSettings;
    this.lights.setSpotParams(index, angle, exponent);
    this.processing.localSettings.set(settings);
  }

  public async toggleGizmo(kind: 'position' | 'rotation', enabled: boolean) {
    this.lights.setGizmoEnabled(kind, enabled);
  }

  public gizmoSupported(kind: 'position' | 'rotation'): boolean {
    const light = this.selectedEntry()?.light;
    if (!light) return true;
    return kind === 'position' ? light.hasPositionGizmo : light.hasRotationGizmo;
  }
}
