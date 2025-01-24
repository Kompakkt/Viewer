import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';
import { CompilationBrowserComponent } from '../compilation-browser/compilation-browser.component';
import { EntityFeatureSettingsComponent } from '../entity-feature-settings/entity-feature-settings.component';
import { AnnotationsEditorComponent } from '../entity-feature-annotations/annotations-editor/annotations-editor.component';

@Component({
    selector: 'app-sidenav',
    templateUrl: './sidenav.component.html',
    styleUrls: ['./sidenav.component.scss'],
    imports: [
        AnnotationsEditorComponent,
        EntityFeatureSettingsComponent,
        CompilationBrowserComponent,
    ]
})
export class SidenavComponent implements OnInit {
  @HostBinding('class.is-open')
  public isReady = false;

  public isOpen = false;
  public mode = '';

  constructor(public overlay: OverlayService) {
    setTimeout(() => {
      this.overlay.sidenav$.subscribe(({ mode, open }) => {
        console.log(mode, open);
        this.mode = mode;
        this.isOpen = open;
        this.isReady = this.isOpen && !!this.mode;
      });
    }, 0);
  }

  ngOnInit() {}
}
