import { Injectable, signal } from '@angular/core';

export type SidenavMode =
  | 'compilationBrowser'
  | 'annotation'
  | 'settings'
  | 'pointCloud'
  | 'animations'
  | '';
export type SidenavState = { mode: SidenavMode; open: boolean };

@Injectable({ providedIn: 'root' })
export class OverlayService {
  readonly sidenav = signal<SidenavState>({ mode: '', open: true });
  readonly panelResizing = signal(false);

  closeSidenav() {
    this.sidenav.set({ mode: '', open: false });
  }

  toggleSidenav(mode: SidenavMode, open?: boolean) {
    const sidenavState = this.sidenav();

    if (sidenavState.mode === mode) {
      const shouldOpen = open !== undefined ? open : !sidenavState.open;
      return this.sidenav.set({ mode, open: shouldOpen });
    }

    this.sidenav.set({ mode, open: true });
  }
}
