import {ChangeDetectorRef, Component, HostBinding, OnInit} from '@angular/core';

import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']})

export class ContentComponent implements OnInit {

  @HostBinding('class.is-open') public isOpen = false;

  // external
  public isCollectionLoaded: boolean;
  public isDefaultModelLoaded: boolean;
  public showContentBrowser: boolean;

  constructor(private overlayService: OverlayService,
              public processingService: ProcessingService,
              private cdRef: ChangeDetectorRef) {
  }

  ngOnInit() {

    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.isDefaultModelLoaded = this.processingService.isDefaultModelLoaded;
    this.isOpen = this.overlayService.collectionsOverviewIsOpen;
    this.showContentBrowser = this.processingService.isShowCatalogue;

    this.processingService.collectionLoaded.subscribe(isCollectionLoaded => {
      this.isCollectionLoaded = isCollectionLoaded;
    });

    this.processingService.defaultModelLoaded.subscribe(isDefaultModelLoaded => {
      this.isDefaultModelLoaded = isDefaultModelLoaded;
    });

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    this.processingService.showCatalogue.subscribe(showCatalogue => {
      this.showContentBrowser = showCatalogue;
      this.cdRef.detectChanges();
    });
  }

}
