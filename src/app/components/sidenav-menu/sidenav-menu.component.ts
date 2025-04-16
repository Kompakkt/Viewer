import { Component, computed, HostBinding, OnInit, signal } from '@angular/core';

import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, TooltipDirective } from 'komponents';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
  imports: [MatIcon, AsyncPipe, TranslatePipe, TooltipDirective, ButtonComponent],
})
export class SidenavMenuComponent {
  constructor(
    public overlay: OverlayService,
    public processing: ProcessingService,
  ) {}

  private sidenav = toSignal(this.overlay.sidenav$);
  public mode = computed(() => this.sidenav()?.mode);
  public isOpen = computed(() => this.sidenav()?.open && this.mode() !== '');

  @HostBinding('class.is-open')
  get isSidenavOpen() {
    return this.isOpen();
  }
}
