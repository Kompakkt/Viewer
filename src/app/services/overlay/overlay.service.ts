import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  private sidenavIsOpen = true;
  private _mode = '';
  private sidenavMode = new BehaviorSubject(this._mode);
  public sidenavMode$ = this.sidenavMode.asObservable();

  private sidenav = new BehaviorSubject(this.sidenavIsOpen);
  public sidenav$ = this.sidenav.asObservable();

  public toggleSidenav(mode: string, open?: boolean): boolean {
    if (this._mode === mode) {
      if (open !== undefined) {
        this.sidenavIsOpen = open;
      } else {
        this.sidenavIsOpen = !this.sidenavIsOpen;
      }
      this.sidenav.next(this.sidenavIsOpen);
      return this.sidenavIsOpen;
    }

    setTimeout(
      () => {
        this.sidenavIsOpen = true;
        this.sidenav.next(this.sidenavIsOpen);
      },
      this.sidenavIsOpen ? 300 : 0,
    );

    this._mode = mode;
    this.sidenavMode.next(this._mode);

    this.sidenavIsOpen = false;
    this.sidenav.next(this.sidenavIsOpen);
    return true;
  }
}
