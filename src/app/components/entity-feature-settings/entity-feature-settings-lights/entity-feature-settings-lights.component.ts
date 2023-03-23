import { Component } from '@angular/core';
import { firstValueFrom, map, ReplaySubject } from 'rxjs';
import { IEntityLight } from '~common/interfaces';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { LightService } from '../../../services/light/light.service';
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

  constructor(
    public entitySettings: EntitySettingsService,
    public lights: LightService,
    private processing: ProcessingService,
  ) {
    const pointLight = this.lights.getLightByType('pointLight');
    if (pointLight) this.pointlight$.next(pointLight);
  }

  get pointLightX() {
    return this.lights.getLightByType('pointLight')?.position?.x ?? 0;
  }
  get pointLightY() {
    return this.lights.getLightByType('pointLight')?.position?.y ?? 0;
  }
  get pointLightZ() {
    return this.lights.getLightByType('pointLight')?.position?.z ?? 0;
  }

  // Lights
  public async setLightIntensity(intensity = 0, lightType: string) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.lights.getLightIndexByType(lightType);
    if (!indexOfLight) return;
    localSettings.lights[indexOfLight].intensity = intensity;
    this.entitySettings.loadLightIntensity(lightType);
  }

  public getLightIntensity(lightType: string) {
    return this.lights.getLightByType(lightType)?.intensity ?? 0;
  }

  public async setPointlightPosition(dimension: 'x' | 'y' | 'z', value = 0) {
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.lights.getLightIndexByType('pointLight');
    if (!indexOfLight) return;
    localSettings.lights[indexOfLight].position[dimension] = value;
    this.entitySettings.loadPointLightPosition();
  }
}
