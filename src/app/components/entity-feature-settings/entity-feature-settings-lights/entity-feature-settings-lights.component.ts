import { Component, inject } from '@angular/core';
import { IColor, IEntityLight } from '@kompakkt/common';
import { ColorChromeModule } from 'ngx-color/chrome';
import {
  ButtonComponent,
  DetailsComponent,
  InputComponent,
  LabelledCheckboxComponent,
  SliderComponent,
} from '@kompakkt/komponents';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { LightService, LightType } from '../../../services/light/light.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

const WHITE: IColor = { r: 255, g: 255, b: 255, a: 255 };

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
  imports: [
    TranslatePipe,
    SliderComponent,
    InputComponent,
    ButtonComponent,
    LabelledCheckboxComponent,
    ColorChromeModule,
    DetailsComponent,
  ],
})
export class EntityFeatureSettingsLightsComponent {
  public entitySettings = inject(EntitySettingsService);
  public lights = inject(LightService);
  public processing = inject(ProcessingService);

  public lightTypes: LightType[] = ['Point', 'Spot', 'Ambient', 'Area', 'Directional'];

  public spotAngleMax = Math.PI / 2;
  public spotAngleDefault = Math.PI / 4;
  public spotExponentDefault = 2;

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

  public async resetLights() {
    const settings = this.processing.settings().localSettings;
    settings.lights = [
      {
        type: 'Ambient',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        intensity: 1,
        color: { ...WHITE },
        name: 'Ambient',
      },
    ];
    this.processing.localSettings.set(settings);
    this.lights.initialiseLights();
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

  public async setAreaSize(index: number, width: number, height: number) {
    const settings = this.processing.settings().localSettings;
    this.lights.setAreaSize(index, width, height);
    this.processing.localSettings.set(settings);
  }

  public async toggleGizmo(index: number, kind: 'position' | 'rotation', enabled: boolean) {
    this.lights.setGizmoEnabled(index, kind, enabled);
  }

  public hasPositionGizmo(light: IEntityLight): boolean {
    return light.type === 'Point' || light.type === 'Spot' || light.type === 'Area';
  }

  public hasRotationGizmo(light: IEntityLight): boolean {
    return (
      light.type === 'Spot' ||
      light.type === 'Ambient' ||
      light.type === 'Area' ||
      light.type === 'Directional'
    );
  }

  public hasSpotParams(light: IEntityLight): boolean {
    return light.type === 'Spot';
  }

  public hasAreaSize(light: IEntityLight): boolean {
    return light.type === 'Area';
  }
}
