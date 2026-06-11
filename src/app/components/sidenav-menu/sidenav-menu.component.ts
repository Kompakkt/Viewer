import { Component, computed, HostBinding, OnInit, signal } from '@angular/core';

import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
  imports: [MatIcon, AsyncPipe, TranslatePipe, TooltipDirective, ButtonComponent],
  host: {
    '[class.is-open]': 'isOpen()',
    '[class.disabled]': 'isDisabled()',
  },
})
export class SidenavMenuComponent {
  constructor(
    public overlay: OverlayService,
    public processing: ProcessingService,
    public annotation: AnnotationService,
  ) {}

  private sidenav = toSignal(this.overlay.sidenav$);
  public mode = computed(() => this.sidenav()?.mode);
  public isOpen = computed(() => this.sidenav()?.open && this.mode() !== '');
  public isDisabled = computed(() => {
    const isRepositioning = this.annotation.isRepositioning();
    return isRepositioning;
  });
}
