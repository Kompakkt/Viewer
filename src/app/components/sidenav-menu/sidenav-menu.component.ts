import { Component, computed, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
  imports: [MatIcon, TranslatePipe, TooltipDirective, ButtonComponent],
  host: {
    '[class.is-open]': 'isOpen()',
    '[class.disabled]': 'isDisabled()',
  },
})
export class SidenavMenuComponent {
  #annotation = inject(AnnotationService);
  overlay = inject(OverlayService);
  processing = inject(ProcessingService);

  mode = computed(() => this.overlay.sidenav()?.mode);
  isOpen = computed(() => this.overlay.sidenav()?.open && this.mode() !== '');
  isDisabled = computed(() => {
    const isRepositioning = this.#annotation.isRepositioning();
    return isRepositioning;
  });
}
