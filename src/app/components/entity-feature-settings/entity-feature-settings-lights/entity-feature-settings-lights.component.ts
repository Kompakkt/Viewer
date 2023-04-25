import { Component } from '@angular/core';
import { map } from 'rxjs';
import { EntitySettingsService } from '../../../services/entitysettings/entitysettings.service';

@Component({
  selector: 'app-entity-feature-settings-lights',
  templateUrl: './entity-feature-settings-lights.component.html',
  styleUrls: ['./entity-feature-settings-lights.component.scss'],
})
export class EntityFeatureSettingsLightsComponent {
  constructor(public entitySettings: EntitySettingsService) {}

  get pointLight$() {
    return this.entitySettings.lights$.pipe(map(lights => lights?.pointLight));
  }

  get ambientlightUp$() {
    return this.entitySettings.lights$.pipe(map(lights => lights?.ambientlightUp));
  }

  get ambientlightDown$() {
    return this.entitySettings.lights$.pipe(map(lights => lights?.ambientlightDown));
  }
}
