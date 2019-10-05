import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
})
export class SidenavMenuComponent implements OnInit {
  @HostBinding('class.is-open')
  public isOpen = false;

  constructor(
    public overlayService: OverlayService,
    public processingService: ProcessingService,
  ) {}

  ngOnInit() {
    this.overlayService.sidenav.subscribe(
      state =>
        (this.isOpen =
          this.overlayService.actualSidenavMode !== '' ? state : false),
    );
  }
}
