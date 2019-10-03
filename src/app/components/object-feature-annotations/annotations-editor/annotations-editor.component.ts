import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { saveAs } from 'file-saver';

import { AnnotationService } from '../../../services/annotation/annotation.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { AnnotationComponent } from '../annotation/annotation.component';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
})
export class AnnotationsEditorComponent implements OnInit {
  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent> | undefined;

  // external
  public isAnnotatingAllowed = false;

  constructor(
    public annotationService: AnnotationService,
    public processingService: ProcessingService,
    public userDataService: UserdataService,
  ) {}

  ngOnInit() {
    this.isAnnotatingAllowed = this.annotationService.isAnnotatingAllowed;

    this.annotationService.annnotatingAllowed.subscribe(allowed => {
      this.isAnnotatingAllowed = allowed;
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    this.annotationService.moveAnnotationByIndex(
      event.previousIndex,
      event.currentIndex,
    );
  }

  exportAnnotations() {
    saveAs(
      new Blob(
        [JSON.stringify(this.annotationService.getCurrentAnnotations())],
        {
          type: 'text/plain;charset=utf-8',
        },
      ),
      'annotations.json',
    );
  }
}
