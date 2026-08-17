import { Component, computed, inject, viewChildren } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { saveAs } from 'file-saver';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
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
    MatIconModule,
    TranslatePipe,
    TooltipDirective,
    ButtonComponent,
  ],
})
export class AnnotationsEditorComponent {
  readonly annotationsList = viewChildren(AnnotationComponent);

  annotationService = inject(AnnotationService);
  processing = inject(ProcessingService);
  userdata = inject(UserdataService);

  // external
  isDefaultAnnotationMode = computed(() => {
    const hasAnnotationAllowance = this.processing.hasAnnotationAllowance();
    const isCompilationLoaded = this.processing.compilation() !== undefined;
    return hasAnnotationAllowance && !isCompilationLoaded;
  });

  // TODO: Is this check correct?
  isForbidden = computed(() => {
    const isInUpload = this.processing.isInUpload();
    const hasAnnotationAllowance = this.processing.hasAnnotationAllowance();
    const isCompilationLoaded = this.processing.compilation() !== undefined;
    const isDefaultEntityLoaded = this.processing.isDefaultEntity();
    return !isInUpload && !hasAnnotationAllowance && !isCompilationLoaded && !isDefaultEntityLoaded;
  });

  exportAnnotations() {
    const activeAnnotations = this.annotationService.activeAnnotations();
    saveAs(
      new Blob([JSON.stringify(activeAnnotations)], {
        type: 'text/plain;charset=utf-8',
      }),
      'annotations.json',
    );
  }

  closeNote(event: Event) {
    const target = event.target as HTMLElement;
    if (target) target.parentElement?.remove();
  }
}
