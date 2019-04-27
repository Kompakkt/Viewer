import {AfterViewInit, ChangeDetectorRef, Component, HostBinding, OnInit} from '@angular/core';
import {MatDialog, MatDialogConfig, MatRadioButton, MatRadioChange} from '@angular/material';

import {MediaTypePipe} from '../../pipes/media-type.pipe';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {MessageService} from '../../services/message/message.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {UserdataService} from '../../services/userdata/userdata.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';
import {DialogPasswordComponent} from '../dialogs/dialog-password/dialog-password.component';

@Component({
  selector: 'app-content-browser',
  templateUrl: './content-browser.component.html',
  styleUrls: ['./content-browser.component.scss'],
  providers: [MediaTypePipe],
})

  export class ContentBrowserComponent implements OnInit {

  public isLoggedIn: boolean;
  public isObjectCategory = true;
  public filterPersonalCollections = false;
  public filterPersonalObjects = false;

  public showModels = true;
  public showImages = true;
  public showAudio = true;
  public showVideo = true;
  public showText = true;

  private identifierCollection;
  private identifierObject;

  constructor(private overlayService: OverlayService,
              public catalogueService: CatalogueService,
              public loadModelService: LoadModelService,
              private message: MessageService,
              public dialog: MatDialog,
              public userdataService: UserdataService) {
  }

  ngOnInit() {

    this.catalogueService.loggedIn.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
    });
  }

  public loginDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    this.dialog.open(LoginComponent, dialogConfig);
  }

  public changeCategory(mrChange: MatRadioChange) {
    const mrButton: MatRadioButton = mrChange.source;

    if (mrChange.value === 'objects') {
      this.isObjectCategory = true;
    }
    if (mrChange.value === 'collections') {
      this.isObjectCategory = false;
    }
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
    },                                                  error => {
      this.message.error('Connection to object server refused.');
    });
  }

  public passwordDialog() {
    const dialogConfig = new MatDialogConfig();

    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;

    dialogConfig.data = {
      id: this.identifierCollection,
    };
    console.log('password');

    const dialogRef = this.dialog.open(DialogPasswordComponent, dialogConfig);
    dialogRef.afterClosed().subscribe(data => {
      if (data === true) {
        this.identifierCollection = '';
      }
    });

  }

  searchObjectByID(event?) {
    let id = '';
    if (event) {
      id = event.value._id;
    } else {
      id = this.identifierObject;
    }

    const isloadable = this.catalogueService.selectModelByID(id);
    if (isloadable) {
    } else {
      this.message.error('Can not find Model with ID ' + id + '.');
    }
  }

  handleCollectionChoice(event) {
    console.log('Ausgewählt: ', event.value);
    this.catalogueService.selectCollection(event.value._id);
  }

  handleModelChoice(event) {
    this.catalogueService.selectModel(event.value._id, !this.isObjectCategory);
  }

}
