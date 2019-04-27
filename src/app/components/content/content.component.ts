import {AfterViewInit, Component, HostBinding, OnInit} from '@angular/core';

import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {OverlayService} from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss']})

export class ContentComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  public showContentBrowser = true;

  constructor(public catalogueService: CatalogueService,
              private overlayService: OverlayService,
              private loadModelService: LoadModelService) {
  }

  ngOnInit() {

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    // Default Modell wurde geladen,
    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      if (actualModel._id === 'Cube') {
        this.showContentBrowser = true;
      }
    });

    console.log('Show Browser', this.showContentBrowser);
  }

  public selectObject(_id: string) {
      this.catalogueService.selectModel(_id, undefined);
  }

  public closeEditor() {
    this.overlayService.toggleCollectionsOverview();
  }
}
