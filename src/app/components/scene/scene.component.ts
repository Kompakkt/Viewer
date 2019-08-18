import {
  AfterViewInit,
  Component,
  HostListener,
  ViewContainerRef,
} from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material';

import { AnnotationService } from '../../services/annotation/annotation.service';
import { BabylonService } from '../../services/babylon/babylon.service';
import { MongohandlerService } from '../../services/mongohandler/mongohandler.service';
import { ProcessingService } from '../../services/processing/processing.service';
import { LoginComponent } from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
})
export class SceneComponent implements AfterViewInit {
  private firstAttempt = true;
  public isLightMode = false;

  @HostListener('window:resize', ['$event'])
  public onResize() {
    this.babylonService.resize();
  }

  constructor(
    private babylonService: BabylonService,
    private processingService: ProcessingService,
    public annotationService: AnnotationService,
    private viewContainerRef: ViewContainerRef,
    private mongo: MongohandlerService,
    private dialog: MatDialog,
  ) {}

  private loginAttempt() {
    this.mongo
      .isAuthorized()
      .then(result => {
        if (result.status === 'ok') {
          this.setupCanvas();
        } else {
          if (this.firstAttempt) {
            // Show Login Screen before loading Babylon
            this.openLoginDialog();
          } else {
            // Assume user is not interested in logging in
            this.setupCanvas();
          }
        }
      })
      .catch(e => {
        // Server might not be reachable, skip login
        console.error(e);
        this.setupCanvas();
      });
  }

  private openLoginDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
    this.firstAttempt = false;
    this.dialog
      .open(LoginComponent, dialogConfig)
      .afterClosed()
      .toPromise()
      .then(() => this.loginAttempt())
      .catch(e => {
        console.error(e);
        this.loginAttempt();
      });
  }

  private setupCanvas() {
    this.babylonService.attachCanvas(this.viewContainerRef);
    this.babylonService.resize();
    this.processingService.bootstrap();
  }

  ngAfterViewInit() {
    const searchParams = location.search;
    const queryParams = new URLSearchParams(searchParams);
    const isDragDrop = queryParams.get('dragdrop');
    const isSkipLogin = queryParams.get('skiplogin');
    const isLightMode = queryParams.get('light');

    if (isLightMode) {
     this.isLightMode = true;
     console.log('LIGHT');
    } else {
      console.log('NOT LIGHT');
    }

    if (isDragDrop || isSkipLogin) {
      // Assume we are inside an iframe and in the upload process
      // Set up the canvas
      // Drag&Drop is set up in ProcessingService
      this.setupCanvas();
    } else {
      this.loginAttempt();
    }
  }
}
