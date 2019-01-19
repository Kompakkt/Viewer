import {Component, HostBinding, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {Model} from '../../interfaces/model/model.interface';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {MessageService} from '../../services/message/message.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {MatDialog, MatDialogConfig} from '@angular/material';
import {LoginComponent} from '../login/login.component';


@Component({
  selector: 'app-collections-overview',
  templateUrl: './collections-overview.component.html',
  styleUrls: ['./collections-overview.component.scss']
})
export class CollectionsOverviewComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;
  private isSingleModel: boolean;
  private isSingleCollection: boolean;

  private collectionSelected: boolean;
  private modelSelected: boolean;

  private singleCollectionSelected: boolean;
  private singleModelSelected: boolean;

  private actualCollection: any;
  private actualModel: Model;

  private identifierCollection;
  private identifierModel;

  private isLoggedIn: boolean;
  private isLoaded = false;


  constructor(private overlayService: OverlayService,
              public catalogueService: CatalogueService,
              private loadModelService: LoadModelService,
              private message: MessageService,
              private mongohandlerService: MongohandlerService,
              public dialog: MatDialog,
  ) {
  }

  ngOnInit() {

    this.catalogueService.loggedIn.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    this.loadModelService.singleModel.subscribe(singleModel => {
      this.isSingleModel = singleModel;
    });

    this.loadModelService.singleCollection.subscribe(singleCollection => {
      this.isSingleCollection = singleCollection;
    });

    this.loadModelService.Observables.actualCollection.subscribe(actualCollection => {
      this.actualCollection = actualCollection;
    });

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.actualModel = actualModel;
    });

    this.modelSelected = false;
    this.collectionSelected = false;
  }

  onSelectionDataTypeChange(event) {
    if (event.value === 'model') {
      this.collectionSelected = false;
      this.singleCollectionSelected = false;
      this.modelSelected = true;
    }
    if (event.value === 'collection') {
      this.modelSelected = false;
      this.collectionSelected = true;
    }
  }

  handleCollectionChoice(event) {
    this.singleCollectionSelected = true;
    this.singleModelSelected = true;
    this.catalogueService.selectCollection(event.value);
  }

  handleModelChoice(event) {
    this.singleModelSelected = true;
    this.singleCollectionSelected = false;
    this.catalogueService.selectModel(event.value, this.collectionSelected);
  }

  searchCollectionByID() {
    const isloadable = this.catalogueService.selectCollectionByID(this.identifierCollection);
    if (isloadable) {
      this.singleCollectionSelected = true;
      this.singleModelSelected = true;
    } else {
      this.message.error('Can not find Collection with ID ' + this.identifierCollection + '.');
    }
  }

  searchModelByID() {
    const isloadable = this.catalogueService.selectModelbyID(this.identifierModel);
    if (isloadable) {
      this.singleModelSelected = true;
      this.singleCollectionSelected = false;
    } else {
      this.message.error('Can not find Model with ID ' + this.identifierModel + '.');
    }
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

}
