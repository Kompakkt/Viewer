import { Component, HostBinding, OnInit } from '@angular/core';

import {OverlayService} from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent implements OnInit {
  @HostBinding('class.is-open') public isOpen = false;
  public mode = 'settings';
  public isMeshSettingsMode = false;

  constructor(
      public overlayService: OverlayService,
  ) { }

  ngOnInit() {

    this.overlayService.sidenav.subscribe(
        state => {
          this.mode = this.overlayService.actualSidenavMode;
          console.log('mode', this.overlayService.actualSidenavMode);
          this.isOpen = state;
        },
    );
    /*
      this.overlayService.editorSetting.subscribe(meshSettingsMode => {
          this.isMeshSettingsMode = meshSettingsMode;
          if (this.isOpen && meshSettingsMode) {
              this.changeTab(1);
          }
      });
*/
  }

}
