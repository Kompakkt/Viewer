import { Component } from '@angular/core';

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
    public entitySettingsService: EntitySettingsService,
    public lightService: LightService,
    private processingService: ProcessingService,
  ) {}

  // Lights
  setLightIntensity(intensity: number, lightType: string) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const indexOfLight = this.lightService.getLightIndexByType(lightType);
    if (indexOfLight !== undefined) {
      this.processingService.actualEntitySettings.lights[
        indexOfLight
      ].intensity = intensity;
      this.entitySettingsService.loadLightIntensity(lightType);
    } else {
      // tslint:disable-next-line:prefer-template
      throw new Error('Light, ' + lightType + ', is missing');
      console.error(this);
      return;
    }
  }

  getLightIntensity(lightType: string): number {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return 0;
    }
    const light = this.lightService.getLightByType(lightType);
    if (light) {
      return light.intensity;
    } else {
      return 0;
    }
  }

  setPointlightPosition(dimension: string, value: number) {
    if (!this.processingService.actualEntitySettings) {
      throw new Error('Settings missing');
      console.error(this);
      return;
    }
    const indexOfLight = this.lightService.getLightIndexByType('pointLight');
    if (indexOfLight) {
      switch (dimension) {
        case 'x':
          this.processingService.actualEntitySettings.lights[
            indexOfLight
          ].position.x = value;
          break;
        case 'y':
          this.processingService.actualEntitySettings.lights[
            indexOfLight
          ].position.y = value;
          break;
        case 'z':
          this.processingService.actualEntitySettings.lights[
            indexOfLight
          ].position.z = value;
          break;
        default:
          // tslint:disable-next-line:prefer-template
          throw new Error('Pointlightposition, ' + dimension + ', is missing');
          console.error(this);
          return;
      }
    }
    this.entitySettingsService.loadPointLightPosition();
  }
}
