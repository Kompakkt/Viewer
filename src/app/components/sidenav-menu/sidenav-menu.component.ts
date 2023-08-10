import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { TranslateService } from './../../services/translate/translate.service';

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
})
export class SidenavMenuComponent implements OnInit {
  @HostBinding('class.is-open')
  public isOpen = false;
  private mode = '';
  translateItems: string[] = [];

  constructor(private translate: TranslateService, public overlay: OverlayService, public processing: ProcessingService) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.translateStrings();
    setTimeout(() => {
      this.overlay.sidenav$.subscribe(({ mode, open }) => {
        this.mode = mode;
        this.isOpen = open;
      });
    }, 0);
  }

  async translateStrings () {
    let translateSet = ["Close","Annotation","Settings","Browse in Collection"];
    this.translateItems = await this.translate.loadFromFile(translateSet);
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
