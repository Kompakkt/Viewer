import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
})
export class SidenavComponent implements OnInit {
  @HostBinding('class.is-open')
  public isReady = false;

  public isOpen = false;
  public mode = '';

  constructor(public overlay: OverlayService) {
    setTimeout(() => {
      this.overlay.sidenav$.subscribe(({ mode, open }) => {
        console.log(mode, open);
        this.mode = mode;
        this.isOpen = open;
        this.isReady = this.isOpen && !!this.mode;
      });
    }, 0);
  }

  ngOnInit() {}
}
