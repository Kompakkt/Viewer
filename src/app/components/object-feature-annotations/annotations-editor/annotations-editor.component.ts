import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {Component, OnInit, QueryList, ViewChildren} from '@angular/core';
import {MatRadioChange} from '@angular/material';
import {saveAs} from 'file-saver';

import {AnnotationService} from '../../../services/annotation/annotation.service';
import {LoadModelService} from '../../../services/load-model/load-model.service';
import {SocketService} from '../../../services/socket/socket.service';
import {AnnotationComponent} from '../annotation/annotation.component';
import {UserdataService} from '../../../services/userdata/userdata.service';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
})
export class AnnotationsEditorComponent implements OnInit {

  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent>;

  // external
  public isCollectionLoaded: boolean;
  public isDefaultModelLoaded: boolean;
  public isAnnotatingAllowed: boolean;
  public isBroadcastingAllowed: boolean;
  public isBroadcasting: boolean;

  // internal
  private isDefaultAnnotationsSource: boolean;

  constructor(private annotationService: AnnotationService,
              private socketService: SocketService,
              public loadModelService: LoadModelService,
              private  userDataService: UserdataService) {
  }

  ngOnInit() {

    this.isDefaultAnnotationsSource = true;

    this.loadModelService.collectionLoaded.subscribe(isLoaded => {
      this.isCollectionLoaded = isLoaded;
    });

    this.loadModelService.defaultModelLoaded.subscribe(isLoaded => {
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
    moveItemInArray(this.annotationService.annotations, event.previousIndex, event.currentIndex);
    this.annotationService.changedRankingPositions(this.annotationService.annotations);
    this.annotationService.redrawMarker();
  }

  exportAnnotations() {
    saveAs(new Blob([JSON.stringify(this.annotationService.annotations)],
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
