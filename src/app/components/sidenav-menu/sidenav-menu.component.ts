import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
  standalone: true,
  imports: [MatIconButton, MatTooltip, MatIcon, AsyncPipe, TranslatePipe],
})
export class SidenavMenuComponent implements OnInit {
  @HostBinding('class.is-open')
  public isOpen = false;
  private mode = '';

  constructor(public overlay: OverlayService, public processing: ProcessingService) {
    setTimeout(() => {
      this.overlay.sidenav$.subscribe(({ mode, open }) => {
        this.mode = mode;
        this.isOpen = open;
      });
    }, 0);
  }

  get isSettings() {
    return this.mode === 'settings';
  }

  get isCompilationBrowser() {
    return this.mode === 'compilationBrowser';
  }

  get isAnnotation() {
    return this.mode === 'annotation';
  }

  ngOnInit() {}
}
