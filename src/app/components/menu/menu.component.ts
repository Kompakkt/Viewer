import { Component, OnInit } from '@angular/core';

import { BabylonService } from '../../services/babylon/babylon.service';
import { MessageService } from '../../services/message/message.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';

import fscreen from 'fscreen';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
  public fullscreen = !!fscreen.fullscreenElement;
  public fullscreenCapable = fscreen.fullscreenEnabled;

  constructor(
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    public userDataService: UserdataService,
    private message: MessageService,
  ) {}

  ngOnInit() {
    fscreen.addEventListener(
      'fullscreenchange',
      () => (this.fullscreen = !!fscreen.fullscreenElement),
    );
  }

  getAvailableQuality(quality: string) {
    const entity = this.processingService.getCurrentEntity();
    if (!entity) return false;
    switch (quality) {
      case 'low':
        return entity.processed.low !== entity.processed.medium;
      case 'medium':
        return entity.processed.medium !== entity.processed.low;
      case 'high':
        return entity.processed.high !== entity.processed.medium;
      default:
        return false;
    }
  }

  updateEntityQuality(quality: string) {
    if (this.processingService.actualEntityQuality !== quality) {
      this.processingService.actualEntityQuality = quality;
      const entity = this.processingService.getCurrentEntity();
      if (!entity || !entity.processed) {
        throw new Error(
          'The object is not available and unfortunately ' +
            'I can not update the actualEntityQuality.',
        );
      }
      if (
        entity &&
        entity.processed[this.processingService.actualEntityQuality] !==
          undefined
      ) {
        this.processingService.loadEntity(entity);
      } else {
        throw new Error('Entity actualEntityQuality is not available.');
      }
    }
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
