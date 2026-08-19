import { Component, computed, inject } from '@angular/core';
import { OverlayService } from '../../services/overlay/overlay.service';
import { CompilationBrowserComponent } from '../compilation-browser/compilation-browser.component';
import { EntityFeatureAnimationsComponent } from '../entity-feature-animations/entity-feature-animations.component';
import { EntityFeatureSettingsComponent } from '../entity-feature-settings/entity-feature-settings.component';
import { AnnotationsEditorComponent } from '../entity-feature-annotations/annotations-editor/annotations-editor.component';
import { PointCloudSettingsComponent } from '../point-cloud-settings/point-cloud-settings.component';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  imports: [
    AnnotationsEditorComponent,
    EntityFeatureSettingsComponent,
    EntityFeatureAnimationsComponent,
    CompilationBrowserComponent,
    PointCloudSettingsComponent,
  ],
  host: {
    '[class.is-open]': 'isReady()',
  },
})
export class SidenavComponent {
  #overlay = inject(OverlayService);

  public isOpen = computed(() => this.#overlay.sidenav().open);
  public mode = computed(() => this.#overlay.sidenav().mode);
  public isReady = computed(() => this.isOpen() && !!this.mode());
}
