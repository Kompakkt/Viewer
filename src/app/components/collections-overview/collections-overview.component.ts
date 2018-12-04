import {Component, HostBinding, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-collections-overview',
  templateUrl: './collections-overview.component.html',
  styleUrls: ['./collections-overview.component.scss']
})
export class CollectionsOverviewComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  constructor(private overlayService: OverlayService,
              public catalogueService: CatalogueService) {
  }

  ngOnInit() {

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

  }

}
