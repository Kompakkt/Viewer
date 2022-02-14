import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, OnInit, QueryList, ViewChildren } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
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

  public currentAnnotations$ = this.annotations.currentAnnotations$;

  constructor(
    public annotations: AnnotationService,
    public processing: ProcessingService,
    public userdata: UserdataService,
  ) {}

  get annotationCount$() {
    return this.currentAnnotations$.pipe(map(arr => arr.length));
  }

  get isDefault() {
    if (!this.isAnnotatingAllowed) return false;
    if (this.processing.compilationLoaded) return false;
    return true;
  }

  get isForbidden() {
    return (
      !this.processing.upload &&
      !this.isAnnotatingAllowed &&
      !this.processing.compilationLoaded &&
      !this.processing.defaultEntityLoaded
    );
  }

  ngOnInit() {
    this.isAnnotatingAllowed = this.processing.annotationAllowance;

    this.processing.setAnnotationAllowance.subscribe((allowed: boolean) => {
      this.isAnnotatingAllowed = allowed;
    });
  }

  drop(event: CdkDragDrop<string[]>) {
    this.annotations.moveAnnotationByIndex(event.previousIndex, event.currentIndex);
  }

  exportAnnotations() {
    firstValueFrom(this.currentAnnotations$).then(arr => {
      saveAs(
        new Blob([JSON.stringify(arr)], {
          type: 'text/plain;charset=utf-8',
        }),
        'annotations.json',
      );
    });
  }
}
