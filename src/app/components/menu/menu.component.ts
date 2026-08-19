import { KeyValuePipe } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import fscreen from 'fscreen';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { BabylonService } from '../../services/babylon/babylon.service';
import { MessageService } from '../../services/message/message.service';
import { ProcessingService, QualitySetting } from '../../services/processing/processing.service';
import { TranslateService } from '../../services/translate/translate.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { CameraSettingsComponent } from './camera-settings/camera-settings.component';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  imports: [
    MatIconModule,
    CameraSettingsComponent,
    MatMenuModule,
    KeyValuePipe,
    TranslatePipe,
    TooltipDirective,
    ButtonComponent,
  ],
})
export class MenuComponent implements OnInit {
  public processing = inject(ProcessingService);
  public babylon = inject(BabylonService);
  public userdata = inject(UserdataService);
  public translateService = inject(TranslateService);
  private message = inject(MessageService);

  public fullscreen = !!fscreen.fullscreenElement;
  public fullscreenCapable = fscreen.fullscreenEnabled;

  qualities = computed(() => {
    const entity = this.processing.entity();
    if (!entity) return undefined;
    return {
      low: entity.processed.low !== entity.processed.medium,
      medium: entity.processed.medium !== entity.processed.low,
      high: entity.processed.high !== entity.processed.medium,
    };
  });

  ngOnInit() {
    fscreen.addEventListener(
      'fullscreenchange',
      () => (this.fullscreen = !!fscreen.fullscreenElement),
    );
  }

  public updateEntityQuality(nextQuality: QualitySetting) {
    const currentQuality = this.processing.quality();
    const entity = this.processing.entity();
    if (nextQuality === currentQuality) return;
    if (!entity?.processed?.[nextQuality]) return;

    this.processing.updateEntityQuality(nextQuality);
    return this.processing.loadEntity(entity);
  }

  toggleFullscreen() {
    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    if (this.fullscreen) {
      fscreen.exitFullscreen();
    } else {
      fscreen.requestFullscreen(document.body);
    }
  }

  openLoginExplanation() {
    this.message.info('You are logged in, that is required here.');
  }
}
