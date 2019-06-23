import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {Component, OnInit, QueryList, ViewChildren} from '@angular/core';
import {MatRadioChange} from '@angular/material';
import {saveAs} from 'file-saver';

import {AnnotationService} from '../../../services/annotation/annotation.service';
import {ProcessingService} from '../../../services/processing/processing.service';
import {SocketService} from '../../../services/socket/socket.service';
import {UserdataService} from '../../../services/userdata/userdata.service';
import {AnnotationComponent} from '../annotation/annotation.component';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
})
export class AnnotationsEditorComponent implements OnInit {

  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent> | undefined;

  // external
  public isCollectionLoaded = false;
  public isDefaultModelLoaded = false;
  public isAnnotatingAllowed = false;
  public isBroadcastingAllowed = false;
  public isBroadcasting = false;
  public isCollectionOwner = false;

  // internal
  public isDefaultAnnotationsSource = false;

  constructor(public annotationService: AnnotationService,
              private socketService: SocketService,
              public processingService: ProcessingService,
              private  userDataService: UserdataService) {
  }

  ngOnInit() {
    this.isDefaultAnnotationsSource = true;
    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.isDefaultModelLoaded = this.processingService.isDefaultModelLoaded;
    this.isAnnotatingAllowed = this.annotationService.isAnnotatingAllowed;
    this.isCollectionOwner = this.userDataService.isCollectionOwner;

    this.userDataService.collectionOwner.subscribe(isOwner => {
      this.isCollectionOwner = isOwner;
    });

    this.processingService.collectionLoaded.subscribe(isLoaded => {
      this.isCollectionLoaded = isLoaded;
    });

    this.processingService.defaultModelLoaded.subscribe(isLoaded => {
      this.isDefaultModelLoaded = isLoaded;
    });

    this.annotationService.annnotatingAllowed.subscribe(allowed => {
      this.isAnnotatingAllowed = allowed;
    });

    this.socketService.inSocket.subscribe(broadcast => {
      this.isBroadcasting = broadcast;
    });

    this.socketService.broadcastingAllowed.subscribe(broadcast => {
      this.isBroadcastingAllowed = broadcast;
    });

  }

  drop(event: CdkDragDrop<string[]>) {
    this.annotationService
      .moveAnnotationByIndex(event.previousIndex, event.currentIndex);
  }

  exportAnnotations() {
    saveAs(new Blob([JSON.stringify(this.annotationService.getCurrentAnnotations())],
                    {type: 'text/plain;charset=utf-8'}),
           'annotations.json');
  }

  changeCategory(mrChange: MatRadioChange) {
    // for other values check:
    // const mrButton: MatRadioButton = mrChange.source;
    if (mrChange.value === 'col') {
      this.isDefaultAnnotationsSource = false;
      this.annotationService.setCollectionInput(true);
    }
    if (mrChange.value === 'def') {
      this.isDefaultAnnotationsSource = true;
      this.annotationService.setCollectionInput(false);
    }
  }

}
