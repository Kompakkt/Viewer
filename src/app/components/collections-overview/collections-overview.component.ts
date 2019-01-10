import {Component, HostBinding, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {Model} from '../../interfaces/model/model.interface';

@Component({
  selector: 'app-collections-overview',
  templateUrl: './collections-overview.component.html',
  styleUrls: ['./collections-overview.component.scss']
})
export class CollectionsOverviewComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  private model: boolean;
  private collection: boolean;
  private collectionSelected: boolean;
  private collectionName: string;

  private modelSelected: boolean;
  private modelName: string;
  private singleModel: Model;

  constructor(private overlayService: OverlayService,
              public catalogueService: CatalogueService) {
  }

  ngOnInit() {

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    this.model = false;
    this.collection = false;
    this.collectionSelected = false;
    this.modelSelected = false;

    this.catalogueService.fetchCollectionData();
    this.catalogueService.fetchModelData();
  }

  onSelectionDataTypeChange(event) {
    if (event.value === 'model') {
      this.collection = false;
      this.model = true;
      this.catalogueService.fetchModelData();
    }
    if (event.value === 'collection') {
      this.model = false;
      this.collection = true;
    }
  }

  handleCollectionChoice(event) {
    this.catalogueService.isInitialLoad = false;
    this.collectionSelected = true;
    this.collectionName = event.value.name;
    this.catalogueService.fetchData(event.value._id);
  }

  handleModelChoice(event) {
    this.singleModel = event.value;
    this.catalogueService.isInitialLoad = false;
    this.modelSelected = true;
    this.modelName = event.value.name;
    this.catalogueService.updateActiveModel(event.value);
  }

}
