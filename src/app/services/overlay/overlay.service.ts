import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

type Mode = 'compilationBrowser' | 'annotation' | 'settings' | 'pointCloud' | '';

@Injectable({
  providedIn: 'root',
})
export class OverlayService {
  public sidenav$ = new BehaviorSubject({ mode: '', open: true });

  public closeSidenav() {
    this.sidenav$.next({ mode: '', open: false });
  }

  public toggleSidenav(mode: Mode, open?: boolean) {
    const sidenavState = this.sidenav$.getValue();

    if (sidenavState.mode === mode) {
      const shouldOpen = open !== undefined ? open : !sidenavState.open;
      return this.sidenav$.next({ mode, open: shouldOpen });
    }

    this.sidenav$.next({ mode, open: true });
  }
}
