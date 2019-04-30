import {ChangeDetectorRef, Component, HostBinding, OnInit} from '@angular/core';

import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']})

export class ContentComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  // external
  public isCollectionLoaded: boolean;
  public isDefaultModelLoaded: boolean;
  public showContentBrowser: boolean;

  constructor(private overlayService: OverlayService,
              private processingService: ProcessingService,
              private cdRef: ChangeDetectorRef) {
  }

  ngOnInit() {

    this.processingService.collectionLoaded.subscribe(isCollectionLoaded => {
      this.isCollectionLoaded = isCollectionLoaded;
    });

    this.processingService.defaultModelLoaded.subscribe(isDefaultModelLoaded => {
      this.isDefaultModelLoaded = isDefaultModelLoaded;
    });

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    // TODO subscription undefined
    this.processingService.showCatalogue.subscribe(showCatalogue => {
      this.showContentBrowser = showCatalogue;
      this.cdRef.detectChanges();
    });
  }

}
