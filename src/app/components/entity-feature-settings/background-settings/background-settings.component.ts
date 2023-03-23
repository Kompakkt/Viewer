import { Component } from '@angular/core';
import { RGBA } from 'ngx-color';
import { EntitySettingsService } from 'src/app/services/entitysettings/entitysettings.service';
import { ProcessingService } from 'src/app/services/processing/processing.service';

@Component({
  selector: 'app-background-settings',
  templateUrl: './background-settings.component.html',
  styleUrls: ['./background-settings.component.scss'],
})
export class BackgroundSettingsComponent {
  constructor(public processing: ProcessingService, public entitySettings: EntitySettingsService) {}

  public changeColor(color: RGBA) {
    this.entitySettings.setBackground({ color });
  }

  public toggleGradientEffect(enabled: boolean) {
    this.entitySettings.setBackground({ enabled });
  }
}
