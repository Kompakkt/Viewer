import { Component, effect, inject, input, OnDestroy, OnInit, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { IColor, IEntityLight } from '@kompakkt/common';
import { ColorChromeModule } from 'ngx-color/chrome';
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
import {
  LightEntry,
  LightService,
  LightType,
  SPOT_ANGLE_MAX,
} from '../../../services/light/light.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatIconModule } from '@angular/material/icon';
import { KeyValuePipe } from '@angular/common';

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
    MenuComponent,
    MenuOptionComponent,
    LabelledCheckboxComponent,
    ColorChromeModule,
    DetailsComponent,
    MatIconModule,
    KeyValuePipe,
  ],
})
export class EntityFeatureSettingsLightsComponent implements OnInit, OnDestroy {
  public entitySettings = inject(EntitySettingsService);
  public lights = inject(LightService);
  public processing = inject(ProcessingService);
  public spotAngleMax = SPOT_ANGLE_MAX;

  public helpersActive = input(false);

  private pickedSubscription?: Subscription;

  public lightTypes: LightType[] = ['Point', 'Spot', 'Ambient', 'Area', 'Directional'];
  public expandedLightIndex = signal<number | undefined>(
    this.lights.entries.keys().next().value ?? 0,
  );

  constructor() {
    effect(() => this.lights.setHelpersVisible(this.helpersActive()));
  }

  public ngOnInit(): void {
    this.pickedSubscription = this.lights.lightPicked.subscribe(index => {
      this.setLightExpanded(index, true);
    });
  }

  public ngOnDestroy(): void {
    this.lights.setHelpersVisible(false);
    this.pickedSubscription?.unsubscribe();
  }

  public setLightExpanded(index: number, expanded: boolean) {
    if (expanded) {
      this.expandedLightIndex.set(index);
    } else if (this.expandedLightIndex() === index) {
      this.expandedLightIndex.set(undefined);
    }
  }

  public async addLight(type: LightType) {
    const settings = this.processing.settings().localSettings;
    const index = this.lights.addLight(type);
    this.processing.localSettings.set(settings);
    this.expandedLightIndex.set(index);
  }

  public async removeLight(index: number) {
    const settings = this.processing.settings().localSettings;
    this.lights.removeLight(index);
    this.processing.localSettings.set(settings);

    const remaining = settings.lights.length;
    const expanded = this.expandedLightIndex();
    if (expanded === undefined) return;
    if (expanded === index) {
      this.expandedLightIndex.set(remaining > 0 ? Math.min(index, remaining - 1) : undefined);
    } else if (expanded > index) {
      this.expandedLightIndex.set(expanded - 1);
    }
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

  public hasPositionGizmo(light: LightEntry): boolean {
    return light.type === 'Point' || light.type === 'Spot' || light.type === 'Area';
  }

  public hasRotationGizmo(light: LightEntry): boolean {
    return (
      light.type === 'Spot' ||
      light.type === 'Ambient' ||
      light.type === 'Area' ||
      light.type === 'Directional'
    );
  }

  public hasSpotParams(light: LightEntry): boolean {
    return light.type === 'Spot';
  }

  public hasAreaSize(light: LightEntry): boolean {
    return light.type === 'Area';
  }
}
