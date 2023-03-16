import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  public sidenav$ = new BehaviorSubject({ mode: '', open: true });

  public toggleSidenav(mode: string, open?: boolean): boolean {
    const sidenavState = this.sidenav$.getValue();

    if (sidenavState.mode === mode) {
      const shouldOpen = open !== undefined ? open : !sidenavState.open;
      this.sidenav$.next({ ...sidenavState, open: shouldOpen });
      return shouldOpen;
    }

    if (sidenavState.open) {
      setTimeout(() => this.sidenav$.next({ ...sidenavState, open: true }), 300);
    } else {
      this.sidenav$.next({ ...sidenavState, open: true });
    }

    this.sidenav$.next({ mode, open: false });
    return true;
  }
}
