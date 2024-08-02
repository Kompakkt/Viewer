import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { AsyncPipe } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { saveAs } from 'file-saver';
import { ButtonComponent, TooltipDirective } from 'projects/komponents/src';
import { combineLatest, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { AnnotationComponentForEditorComponent } from '../annotation/annotation-for-editor.component';
import { AnnotationComponent } from '../annotation/annotation.component';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    CdkDropList,
    AnnotationComponentForEditorComponent,
    CdkDrag,
    MatIcon,
    AsyncPipe,
    TranslatePipe,
    TooltipDirective,
    ButtonComponent,
  ],
})
export class AnnotationsEditorComponent {
  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent> | undefined;

  public annotations = inject(AnnotationService);
  public processing = inject(ProcessingService);
  public userdata = inject(UserdataService);

  // external
  public isAnnotatingAllowed$ = this.processing.hasAnnotationAllowance$;

  public currentAnnotations$ = this.annotations.currentAnnotations$;

  get annotationCount$() {
    return this.currentAnnotations$.pipe(map(arr => arr.length));
  }

  get objectName$() {
    return this.processing.entity$.pipe(map(entity => entity?.name));
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
      this.processing.compilation$,
    ]).pipe(
      map(([isAnnotatingAllowed, isCompilationLoaded, compilation]) => {
        if (!isAnnotatingAllowed) return true;
        if (isCompilationLoaded) return this.userdata.doesUserOwn(compilation);
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

  closeNote(event: Event) {
    const target = event.target as HTMLElement;
    if (target) target.parentElement?.remove();
  }
}
