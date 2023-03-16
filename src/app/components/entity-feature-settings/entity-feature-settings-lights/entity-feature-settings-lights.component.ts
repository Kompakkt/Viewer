import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';
import { LightService } from '../../../services/light/light.service';
import { ProcessingService } from '../../../services/processing/processing.service';

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
})
export class EntityFeatureSettingsLightsComponent {
  constructor(
    public entitySettings: EntitySettingsService,
    public lights: LightService,
    private processing: ProcessingService,
  ) {}

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
  public async setLightIntensity(intensity: number | null, lightType: string) {
    if (!intensity) intensity = 0;
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.lights.getLightIndexByType(lightType);
    if (indexOfLight !== undefined) {
      localSettings.lights[indexOfLight].intensity = intensity;
      this.entitySettings.loadLightIntensity(lightType);
    } else {
      console.error(this);
      throw new Error('Light, ' + lightType + ', is missing');
    }
  }

  public getLightIntensity(lightType: string) {
    return this.lights.getLightByType(lightType)?.intensity ?? 0;
  }

  public async setPointlightPosition(dimension: string, value: number | null) {
    if (!value) value = 0;
    const { localSettings } = await firstValueFrom(this.processing.settings$);
    const indexOfLight = this.lights.getLightIndexByType('pointLight');
    if (indexOfLight) {
      switch (dimension) {
        case 'x':
          localSettings.lights[indexOfLight].position.x = value;
          break;
        case 'y':
          localSettings.lights[indexOfLight].position.y = value;
          break;
        case 'z':
          localSettings.lights[indexOfLight].position.z = value;
          break;
        default:
          // tslint:disable-next-line:prefer-template
          console.error(this);
          throw new Error('Pointlightposition, ' + dimension + ', is missing');
      }
    }
    this.entitySettings.loadPointLightPosition();
  }
}
