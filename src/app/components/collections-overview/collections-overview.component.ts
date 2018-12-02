import {Component, HostBinding, Input, OnInit} from '@angular/core';
import {SidenavService} from '../../services/sidenav/sidenav.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';

@Component({
  selector: 'app-collections-overview',
  templateUrl: './collections-overview.component.html',
  styleUrls: ['./collections-overview.component.scss']
})
export class CollectionsOverviewComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  constructor(private sidenavService: SidenavService,
              public catalogueService: CatalogueService) {
  }

  ngOnInit() {

    this.sidenavService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

  }

}
