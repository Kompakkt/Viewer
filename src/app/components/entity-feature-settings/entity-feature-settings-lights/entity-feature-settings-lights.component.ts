import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IColor, IEntityLight, IEntitySettings } from '@kompakkt/common';
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
    AsyncPipe,
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
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.addLight(type, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async removeLight(index: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.removeLight(index, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async resetLights() {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    localSettings.lights = [
      {
        type: 'Ambient',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        intensity: 1,
        color: { ...WHITE },
        name: 'Ambient',
      },
    ];
    this.lights.initialiseLights(localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setName(index: number, value: string) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.setName(index, value, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setIntensity(index: number, value: number | null) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.setIntensity(index, value ?? 0, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setColor(index: number, color: IColor) {
    console.log('[Light color]', color);
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.setColor(index, color, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setPosition(index: number, axis: 'x' | 'y' | 'z', value: number | null) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const current = localSettings.lights[index].position;
    const next = { ...current, [axis]: value ?? 0 };
    this.lights.setPosition(index, next, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setRotation(index: number, axis: 'x' | 'y' | 'z', value: number | null) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const current = localSettings.lights[index].rotation ?? { x: 0, y: 0, z: 0 };
    const next = { ...current, [axis]: value ?? 0 };
    this.lights.setRotation(index, next, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setSpotParams(index: number, angle: number, exponent: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.setSpotParams(index, angle, exponent, localSettings);
    this.emitSettingsUpdate(localSettings);
  }

  public async setAreaSize(index: number, width: number, height: number) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    this.lights.setAreaSize(index, width, height, localSettings);
    this.emitSettingsUpdate(localSettings);
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

  private emitSettingsUpdate(settings: IEntitySettings): void {
    this.processing.settings$.next({
      ...this.processing.settings$.value,
      localSettings: settings,
    });
  }
}
