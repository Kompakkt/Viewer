import {HostListener, Injectable} from '@angular/core';
import {MatSidenav} from '@angular/material';
import {BabylonService} from '../engine/babylon.service';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {

  constructor(public babylonService: BabylonService) {
  }

  private sidenav: MatSidenav;

  public setSidenav(sidenav: MatSidenav) {
    this.sidenav = sidenav;
  }

  public open() {
    return this.sidenav.open();
  }

  public close() {
    return this.sidenav.close();
  }

  public toggle(): void {

    let that = this;

    this.sidenav.toggle().then(function() {
      that.babylonService.resize();
    });
  }
}
