import {
  Component,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Matrix, Vector3 } from '@babylonjs/core';
import { firstValueFrom } from 'rxjs';
import { IAnnotation } from '@kompakkt/common';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, ButtonRowComponent, TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { DialogAnnotationEditorComponent } from '../../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';
import { ExtenderSlotDirective } from '../../../directives/extender-slot.directive';
import DeepClone from 'rfdc';
import deepEqual from 'fast-deep-equal';
import { toObservable } from '@angular/core/rxjs-interop';
const deepClone = DeepClone({ circles: true });

export type ReorderMovement = 'one-up' | 'one-down' | 'first' | 'last';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
  imports: [
    FormsModule,
    MatIcon,
    MarkdownPreviewComponent,
    TranslatePipe,
    ButtonComponent,
    ButtonRowComponent,
    TooltipDirective,
    ExtenderSlotDirective,
  ],
  host: {
    '[style.--top]': 'this.position().top + "px"',
    '[style.--left]': 'this.position().left + "px"',
    '[class.selected]': 'this.isSelected()',
  },
})
export class AnnotationComponent implements OnInit {
  annotationService = inject(AnnotationService);
  babylon = inject(BabylonService);
  dialog = inject(MatDialog);
  userdata = inject(UserdataService);
  processing = inject(ProcessingService);

  reorderAnnotation = output<ReorderMovement>();

  entityFileName = input<string>();
  annotation = input.required<IAnnotation>();
  annotation$ = toObservable(this.annotation);

  position = signal<{ top: number; left: number }>({ top: 0, left: 0 });
  isSelected = computed(() => {
    const annotation = this.annotation();
    return annotation._id === this.annotationService.selectedAnnotation()?._id;
  });

  collapsed = signal(false);

  isAnnotationOwner = computed(() => {
    const _user = this.userdata.userdata();
    const annotation = this.annotation();
    return this.userdata.isAnnotationOwner(annotation);
  });

  userOwnsCompilation = computed(() => {
    const _user = this.userdata.userdata();
    const compilation = this.processing.compilation();
    return this.userdata.doesUserOwn(compilation);
  });

  // TODO: Discuss if these should be the same?
  //canUserEdit$ = this.isAnnotatingAllowed$;
  canUserEditAndDelete = computed(() => {
    return this.processing.hasAnnotationAllowance() && this.isAnnotationOwner();
  });

  canUserReorder = computed(() => {
    const isCompilationLoaded = this.processing.compilation() !== undefined;
    const { ofCompilation, ofEntity } = this.processing.isOwner();
    return isCompilationLoaded ? ofCompilation : ofEntity;
  });

  isEditMode = computed(() => {
    const annotation = this.annotation();
    const isSelected = this.isSelected();
    return annotation._id === this.annotationService.selectedAnnotation()?._id && isSelected;
  });

  isHidden = computed(() => {
    const annotation = this.annotation();
    const hidden = this.annotationService.hiddenAnnotations();
    return hidden.includes(annotation._id.toString());
  });

  isUnsaved = computed(() => {
    const annotation = this.annotation();
    const unsaved = this.annotationService.unsavedAnnotations();
    return unsaved.has(annotation._id.toString());
  });

  toggleRepositionMode() {
    const annotation = this.annotation();
    return this.annotationService.initializeRepositionMode(annotation);
  }

  closeAnnotation(): void {
    this.annotationService.setSelectedAnnotation('');
  }

  shareAnnotation() {
    const annotation = this.annotation();
    return this.annotationService.shareAnnotation(annotation);
  }

  deleteAnnotation() {
    const annotation = this.annotation();
    return this.annotationService.deleteAnnotation(annotation);
  }

  #ref = inject<ElementRef<HTMLElement>>(ElementRef);

  #setPosition(annotation: IAnnotation) {
    const scene = this.babylon.getScene();
    if (!scene || !scene.activeCamera) return;

    const mesh = scene.getMeshByName(`${annotation._id}_marker`);
    if (!mesh) return;

    const engine = this.babylon.getEngine();
    const [width, height] = [engine.getRenderWidth(), engine.getRenderHeight()];

    const p = Vector3.Project(
      mesh.getBoundingInfo().boundingBox.centerWorld,
      Matrix.Identity(),
      scene.getTransformMatrix(),
      scene.activeCamera.viewport.toGlobal(width, height),
    );

    const parent = this.#ref.nativeElement;
    const [left, top] = [Math.round(p.x), Math.round(p.y)];
    const [elHeight, elWidth] = [parent.clientHeight, parent.clientWidth];

    this.position.set({
      top: top < 0 ? 0 : top + elHeight > height ? height - elHeight : top,
      left: left < 0 ? 0 : left + elWidth > width ? width - elWidth : left,
    });
  }

  async toggleFullscreen(mode: 'edit' | 'preview') {
    const annotation = this.annotation();
    const existingDialog = this.dialog.getDialogById('fullscreen-editor');
    if (existingDialog) return;
    const dialogRef = this.dialog.open<
      DialogAnnotationEditorComponent,
      any,
      IAnnotation | undefined
    >(DialogAnnotationEditorComponent, {
      id: 'fullscreen-editor',
      width: 'min(75vw, 860px)',
      maxHeight: '80vh',
      data: { annotation: deepClone(annotation), mode },
    });
    if (mode !== 'edit') return;

    // Save changes only if edited
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;
    if (deepEqual(annotation, result)) return;

    return this.annotationService.updateAnnotation(result);
  }

  openInFullscreenRef = effect(() => {
    const annotation = this.annotation();
    if (!annotation._id) return;
    const selectedAnnotation = this.annotationService.selectedAnnotation();
    const toggleFullscreen = selectedAnnotation?.fullscreen ?? false;
    if (!toggleFullscreen) return;
    if (annotation._id !== selectedAnnotation?._id) return;
    this.openInFullscreenRef.destroy();
    this.annotationService.selectedAnnotation.set({
      _id: annotation._id,
      mode: 'edit',
      fullscreen: false,
    });
    return this.toggleFullscreen('edit');
  });

  ngOnInit() {
    setInterval(() => {
      const annotation = this.annotation();
      if (!annotation) return;
      console.log('[AnnotationComponent] setPosition', annotation._id);
      this.#setPosition(annotation);
    }, 15);
  }
}
