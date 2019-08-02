import { Component, HostBinding, OnInit, ViewChild } from '@angular/core';

import { AnnotationService } from '../../services/annotation/annotation.service';
import { OverlayService } from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-entity-features',
  templateUrl: './object-features.component.html',
  styleUrls: ['./object-features.component.scss'],
})
export class EntityFeaturesComponent implements OnInit {
  @HostBinding('class.is-open') private isOpen = false;
  @ViewChild('tabGroup', { static: false }) tabGroup;

  // external
  public isMeshSettingsMode = false;

  // internal
  public selectedTab;

  constructor(
    public overlayService: OverlayService,
    public annotationService: AnnotationService,
  ) {}

  ngOnInit() {
    this.overlayService.defaultAnnotations.subscribe(annotationsMode => {
      if (this.isOpen && annotationsMode) {
        this.changeTab(0);
      }
    });

    this.overlayService.editorSetting.subscribe(meshSettingsMode => {
      this.isMeshSettingsMode = meshSettingsMode;
      if (this.isOpen && meshSettingsMode) {
        this.changeTab(1);
      }
    });

    this.overlayService.editor.subscribe(editor => {
      this.isOpen = editor;
    });
  }

  private changeTab(tabIndex) {
    if (tabIndex <= 3 && tabIndex >= 0) {
      this.tabGroup.selectedIndex = tabIndex;
    }
  }
}
