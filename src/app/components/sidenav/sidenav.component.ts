import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent implements OnInit {
  @HostBinding('class.is-open')
  public isOpen = false;

  constructor(public overlayService: OverlayService) {}

  ngOnInit() {
    this.overlayService.sidenav.subscribe(state => {
      this.isOpen =
        this.overlayService.actualSidenavMode !== '' ? state : false;
    });
  }
}
