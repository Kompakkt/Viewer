import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  public sidenav$ = new BehaviorSubject({ mode: '', open: true });

  public toggleSidenav(mode: string, open?: boolean) {
    const sidenavState = this.sidenav$.getValue();

    if (sidenavState.mode === mode) {
      const shouldOpen = open !== undefined ? open : !sidenavState.open;
      return this.sidenav$.next({ mode, open: shouldOpen });
    }

    setTimeout(() => this.sidenav$.next({ mode, open: true }), sidenavState.open ? 300 : 0);
    this.sidenav$.next({ mode, open: false });
  }
}
