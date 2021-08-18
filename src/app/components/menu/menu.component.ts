import { Component, OnInit } from '@angular/core';

import { BabylonService } from '../../services/babylon/babylon.service';
import { MessageService } from '../../services/message/message.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';

import { IEntity } from 'src/common';

import fscreen from 'fscreen';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
  public fullscreen = !!fscreen.fullscreenElement;
  public fullscreenCapable = fscreen.fullscreenEnabled;
  private entity: IEntity | undefined;

  constructor(
    public processing: ProcessingService,
    public babylon: BabylonService,
    public userdata: UserdataService,
    private message: MessageService,
  ) {
    this.processing.entity$.subscribe(entity => (this.entity = entity));
  }

  get userData() {
    return this.userdata.userData;
  }

  get loginRequired() {
    return this.userdata.loginRequired;
  }

  get isAuthenticated() {
    return this.userdata.authenticatedUser;
  }

  ngOnInit() {
    fscreen.addEventListener(
      'fullscreenchange',
      () => (this.fullscreen = !!fscreen.fullscreenElement),
    );
  }

  getAvailableQuality(quality: string) {
    if (!this.entity) return false;
    switch (quality) {
      case 'low':
        return this.entity.processed.low !== this.entity.processed.medium;
      case 'medium':
        return this.entity.processed.medium !== this.entity.processed.low;
      case 'high':
        return this.entity.processed.high !== this.entity.processed.medium;
      default:
        return false;
    }
  }

  updateEntityQuality(quality: string) {
    if (this.processing.entityQuality !== quality) {
      this.processing.updateEntityQuality(quality);
      if (!this.entity?.processed) {
        throw new Error(
          'The object is not available and unfortunately ' + 'I can not update the entityQuality.',
        );
      }
      const qualities: any = this.entity?.processed ?? {};
      if (!!qualities[this.processing.entityQuality]) {
        this.processing.loadEntity(this.entity);
      } else {
        throw new Error('Entity entityQuality is not available.');
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
