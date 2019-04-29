import {ChangeDetectorRef, Component, HostBinding, OnInit} from '@angular/core';

import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {OverlayService} from '../../services/overlay/overlay.service';

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

  constructor(public catalogueService: CatalogueService,
              private overlayService: OverlayService,
              private loadModelService: LoadModelService,
              private cdRef: ChangeDetectorRef) {
  }

  ngOnInit() {

    this.loadModelService.collectionLoaded.subscribe(isCollectionLoaded => {
      this.isCollectionLoaded = isCollectionLoaded;
    });

    this.loadModelService.defaultModelLoaded.subscribe(isDefaultModelLoaded => {
      this.isDefaultModelLoaded = isDefaultModelLoaded;
    });

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    // TODO subscription undefined
    this.catalogueService.showCatalogue.subscribe(showCatalogue => {
      this.showContentBrowser = showCatalogue;
      this.cdRef.detectChanges();
    });
  }

}
