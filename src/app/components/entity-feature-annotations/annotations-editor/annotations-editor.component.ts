import { AsyncPipe } from '@angular/common';
import { Component, QueryList, ViewChildren, inject } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { saveAs } from 'file-saver';
import { ButtonComponent, TooltipDirective } from 'komponents';
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
  imports: [
    AnnotationComponentForEditorComponent,
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

  annotationCount$ = this.currentAnnotations$.pipe(map(arr => arr.length));

  objectName$ = this.processing.entity$.pipe(map(entity => entity?.name));

  isDefault$ = combineLatest([
    this.processing.hasAnnotationAllowance$,
    this.processing.compilationLoaded$,
  ]).pipe(
    map(
      ([isAnnotatingAllowed, isCompilationLoaded]) => isAnnotatingAllowed && !isCompilationLoaded,
    ),
  );

  isForbidden$ = combineLatest([
    this.processing.isInUpload$,
    this.processing.hasAnnotationAllowance$,
    this.processing.compilationLoaded$,
    this.processing.defaultEntityLoaded$,
  ]).pipe(map(arr => arr.every(boolean => !boolean)));

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
