import { Component } from '@angular/core';
import { firstValueFrom, map, ReplaySubject } from 'rxjs';
import { IEntityLight } from '~common/interfaces';
import {
  EntitySettingsService,
  IEntityLightType,
} from '../../../services/entitysettings/entitysettings.service';
import { ProcessingService } from '../../../services/processing/processing.service';

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
})
export class EntityFeatureSettingsLightsComponent {
  public pointlight$ = new ReplaySubject<IEntityLight>(1);
  public pointlightPosition$ = this.pointlight$.pipe(
    map(({ position: { x, y, z } }) => ({ x, y, z })),
  );

  constructor(public entitySettings: EntitySettingsService, private processing: ProcessingService) {
    const pointLight = this.entitySettings.getLightSettingsByType('pointLight');
    if (pointLight) this.pointlight$.next(pointLight);
  }

  public async setLightIntensity(intensity = 0, lightType: IEntityLightType) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.entitySettings.getLightIndexByType(lightType);
    if (!indexOfLight) return;
    localSettings.lights[indexOfLight].intensity = intensity;
    this.entitySettings.loadLightIntensity(lightType);
  }

  public getLightIntensity(lightType: IEntityLightType) {
    return this.entitySettings.getLightSettingsByType(lightType)?.intensity ?? 0;
  }

  public async setPointlightPosition(dimension: 'x' | 'y' | 'z', value = 0) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.entitySettings.getLightIndexByType('pointLight');
    if (!indexOfLight) return;
    localSettings.lights[indexOfLight].position[dimension] = value;
    this.entitySettings.loadPointLightPosition();
  }
}
