import {AfterViewInit, Component, ElementRef, HostListener, ViewChild, ViewContainerRef} from '@angular/core';
import {MatDialog, MatDialogConfig} from '@angular/material';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {ProcessingService} from '../../services/processing/processing.service';
import {LoginComponent} from '../dialogs/dialog-login/login.component';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.scss'],
})
export class SceneComponent implements AfterViewInit {

  @HostListener('window:resize', ['$event'])

  public onResize() {
    this.babylonService.resize();
  }

  constructor(private babylonService: BabylonService,
              private processingService: ProcessingService,
              public annotationService: AnnotationService,
              private viewContainerRef: ViewContainerRef,
              private mongo: MongohandlerService,
              private dialog: MatDialog) {
  }

  private loginAttempt() {
    this.mongo.isAuthorized()
      .then(result => {
        if (result.status === 'ok') {
          this.setupCanvas();
        } else {
          // Show Login Screen before loading Babylon
          this.openLoginDialog();
        }
      })
      .catch(e => console.error(e));
  }

  private openLoginDialog() {
    const dialogConfig = new MatDialogConfig();
    dialogConfig.disableClose = true;
    dialogConfig.autoFocus = true;
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
    this.loginAttempt();
  }
}
