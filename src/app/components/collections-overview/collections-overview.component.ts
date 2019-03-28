import {AfterViewInit, ChangeDetectorRef, Component, HostBinding} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';

import {Model} from '../../interfaces/model/model.interface';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {MessageService} from '../../services/message/message.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';
import {PasswordComponent} from '../password/password.component';

@Component({
  selector: 'app-collections-overview',
  templateUrl: './collections-overview.component.html',
  styleUrls: ['./collections-overview.component.scss'],
})
export class CollectionsOverviewComponent implements AfterViewInit {

  @HostBinding('class.is-open') private isOpen = false;
  public isSingleModel: boolean;

  public collectionSelected: boolean;
  public modelSelected: boolean;

  private singleCollectionSelected: boolean;
  private singleModelSelected: boolean;

  private actualCollection: any;
  private actualModel: Model;

  private identifierCollection;
  private identifierModel;

  public isLoggedIn: boolean;
  public isSingleObject: boolean;
  public isSingleCollection: boolean;

  public filterPersonal = false;
  public filterPersonalCollections = false;

  constructor(private overlayService: OverlayService,
              public catalogueService: CatalogueService,
              public loadModelService: LoadModelService,
              private message: MessageService,
              public dialog: MatDialog,
              private _changeDetectionRef: ChangeDetectorRef,
  ) {
  }

  ngAfterViewInit() {
    this.catalogueService.loggedIn.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });

    this.overlayService.collectionsOverview.subscribe(collectionsOverviewIsOpen => {
      this.isOpen = collectionsOverviewIsOpen;
    });

    this.loadModelService.singleModel.subscribe(singleModel => {
      this.isSingleModel = singleModel;
    });

    /*
    this.loadModelService.singleCollection.subscribe(singleCollection => {
      this.isSingleCollection = singleCollection;
      if (this.isSingleCollection) {
        this.overlayService.toggleCollectionsOverview();
      }
    });*/

    this.catalogueService.singleCollection.subscribe(singleCollection => {
      this.isSingleCollection = singleCollection;
      if (this.isSingleCollection) {
        this.overlayService.toggleCollectionsOverview();
      }
    });

    this.catalogueService.singleObject.subscribe(singleObject => {
      this.isSingleObject = singleObject;
    });

    this.loadModelService.Observables.actualCollection.subscribe(actualCollection => {
      this.actualCollection = actualCollection;
    });

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.actualModel = actualModel;
    });

    this.modelSelected = false;
    this.collectionSelected = false;

    this._changeDetectionRef.detectChanges();
  }

  private loadCollection(): void {

    this.modelSelected = false;
    this.collectionSelected = true;
  }

  private loadModel(): void {

    this.collectionSelected = false;
    this.singleCollectionSelected = false;
    this.modelSelected = true;
  }

  handleCollectionChoice(event) {
    console.log('Ausgewählt: ', event.value);
    this.singleCollectionSelected = true;
    this.singleModelSelected = true;
    this.catalogueService.selectCollection(event.value);
  }

  handleModelChoice(event) {
    this.singleModelSelected = true;
    this.singleCollectionSelected = false;
    this.catalogueService.selectModel(event.value, this.collectionSelected);
  }

  async searchCollectionByID(event?) {
    let id = '';
    if (event) {
      id = event.value._id;
    } else {
      id = this.identifierCollection;
    }
    this.catalogueService.selectCollectionByID(id).then(result => {
      switch (result) {
        case 'loaded':
          this.singleCollectionSelected = true;
          this.singleModelSelected = true;
          break;

        case 'missing':
          this.message.error('Can not find Collection with ID ' + this.identifierCollection + '.');
          break;

        case 'password':
          console.log('password');
          this.passwordDialog();
          break;

        default:
          this.message.error('Can not find Collection with ID ' + this.identifierCollection + '.');
      }
    }, error => {
      this.message.error('Connection to object server refused.');
    });
  }

  searchModelByID(event?) {
    let id = '';
    if (event) {
      id = event.value._id;
    } else {
      id = this.identifierModel;
    }

    const isloadable = this.catalogueService.selectModelbyID(id);
    if (isloadable) {
      this.singleModelSelected = true;
      this.singleCollectionSelected = false;
    } else {
      this.message.error('Can not find Model with ID ' + id + '.');
    }
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

  public passwordDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    dialogConfig.data = {
      id: this.identifierCollection,
    };
    console.log('password');

    const dialogRef = this.dialog.open(PasswordComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(data => {
      if (data === true) {
        this.singleCollectionSelected = true;
        this.singleModelSelected = true;
        this.identifierCollection = '';
      }
    });

  }

}
