import {Component, HostBinding, OnInit, ViewChild} from '@angular/core';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {OverlayService} from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-object-features',
  templateUrl: './object-features.component.html',
  styleUrls: ['./object-features.component.scss'],
})
export class ObjectFeaturesComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;
  @ViewChild('tabGroup') tabGroup;

  // external
  //TODO
  public isMeshSettingsMode: boolean;
  // Toggled during upload after meshsettings have been set
  public defaultAnnotationsMode: boolean;

  // internal
  public selectedTab;

  constructor(public overlayService: OverlayService,
              public annotationService: AnnotationService) {
  }

  ngOnInit() {

    // TODO
    this.overlayService.defaultAnnotations.subscribe(annotationsMode => {
      this.defaultAnnotationsMode = annotationsMode;
      if (this.isOpen && annotationsMode) {
        this.annotationService.annotationMode(true);
        this.changeTab(0);
      }
    });

    // TODO
    this.overlayService.editorSetting.subscribe(meshSettingsMode => {
      this.isMeshSettingsMode = meshSettingsMode;
      if (this.isOpen) {
        if (meshSettingsMode) {
          // TODO
          this.annotationService.annotationMode(false);
          this.changeTab(1);
        } else {
          this.annotationService.annotationMode(true);
        }
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
