import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, QueryList, ViewChildren } from '@angular/core';
import { saveAs } from 'file-saver';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { AnnotationComponent } from '../annotation/annotation.component';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
})
export class AnnotationsEditorComponent {
  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent> | undefined;

  // external
  public isAnnotatingAllowed$ = this.processing.hasAnnotationAllowance$;

  public currentAnnotations$ = this.annotations.currentAnnotations$;

  constructor(
    public annotations: AnnotationService,
    public processing: ProcessingService,
    public userdata: UserdataService,
  ) {}

  get annotationCount$() {
    return this.currentAnnotations$.pipe(map(arr => arr.length));
  }

  get isDefault$() {
    return combineLatest([
      this.processing.hasAnnotationAllowance$,
      this.processing.compilationLoaded$,
    ]).pipe(
      map(
        ([isAnnotatingAllowed, isCompilationLoaded]) => isAnnotatingAllowed && !isCompilationLoaded,
      ),
    );
  }

  get isForbidden$() {
    return combineLatest([
      this.processing.isInUpload$,
      this.processing.hasAnnotationAllowance$,
      this.processing.compilationLoaded$,
      this.processing.defaultEntityLoaded$,
    ]).pipe(map(arr => arr.every(boolean => !boolean)));
  }

  get isDraggingDisabled$() {
    return combineLatest([
      this.processing.hasAnnotationAllowance$,
      this.processing.compilationLoaded$,
      this.userdata.userOwnsCompilation$,
    ]).pipe(
      map(([isAnnotatingAllowed, isCompilationLoaded, userOwnsCompilation]) => {
        if (!isAnnotatingAllowed) return true;
        if (isCompilationLoaded) return userOwnsCompilation;
        return false;
      }),
    );
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
