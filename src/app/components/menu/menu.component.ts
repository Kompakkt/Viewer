import { Component, OnInit } from '@angular/core';

import { BabylonService } from '../../services/babylon/babylon.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
  public fullscreen = false;
  public fullscreenCapable = document.fullscreenEnabled;

  constructor(
    public processingService: ProcessingService,
    public babylonService: BabylonService,
    public userDataService: UserdataService,
  ) {}

  ngOnInit() {
    document.addEventListener('fullscreenchange', _ => {
      if (
        !document.fullscreen &&
        this.babylonService.getEngine().isFullscreen
      ) {
        this.babylonService.getEngine().switchFullscreen(false);
      }
    });
  }

  toggleFullscreen() {
    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    const _tf = (): Promise<void> => {
      const _docEl = document.documentElement as any;
      return _docEl.mozRequestFullScreen
        ? _docEl.mozRequestFullScreen()
        : _docEl.webkitRequestFullscreen
        ? _docEl.webkitRequestFullscreen()
        : _docEl.requestFullscreen();
    };
    const isFullscreen = document.fullscreen;
    // TODO: not working if user exit fullscreen with esc
    this.fullscreen = !isFullscreen;
    if (isFullscreen) {
      this.babylonService.getEngine().switchFullscreen(false);
    } else {
      _tf()
        .then(() => {})
        .catch(e => console.error(e));
    }
  }
}
