import { Component, ElementRef, HostBinding, Input, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Matrix, Vector3 } from '@babylonjs/core';
import { BehaviorSubject, ReplaySubject, combineLatest, firstValueFrom, interval, map } from 'rxjs';
import { IAnnotation } from 'src/common';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import {
  ButtonComponent,
  ButtonRowComponent,
  InputComponent,
  TooltipDirective,
} from 'projects/komponents/src';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { DialogAnnotationEditorComponent } from '../../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    FormsModule,
    MatCardHeader,
    MatCardTitle,
    MatIcon,
    MatCardContent,
    CdkTextareaAutosize,
    MarkdownPreviewComponent,
    MatCardActions,
    AsyncPipe,
    TranslatePipe,
    ButtonComponent,
    ButtonRowComponent,
    InputComponent,
    TooltipDirective,
  ],
})
export class AnnotationComponent {
  public annotationService = inject(AnnotationService);
  public babylon = inject(BabylonService);
  public dialog = inject(MatDialog);
  public userdata = inject(UserdataService);
  public processing = inject(ProcessingService);

  @Input() entityFileName: string | undefined;
  @Input('annotation') set setAnnotation(annotation: IAnnotation) {
    this.annotation$.next(annotation);
  }
  public annotation$ = new ReplaySubject<IAnnotation>(1);

  public positionTop = 0;
  public positionLeft = 0;

  @HostBinding('style.--top')
  get __positionTop() {
    return `${this.positionTop}px`;
  }

  @HostBinding('style.--left')
  get __positionLeft() {
    return `${this.positionLeft}px`;
  }

  #isSelected = false;
  @HostBinding('class.selected')
  get isSelected() {
    return this.#isSelected;
  }

  public showAnnotation$ = new BehaviorSubject(false);
  public collapsed$ = new BehaviorSubject(false);
  public isAnnotatingAllowed$ = this.processing.hasAnnotationAllowance$;
  public isAnnotationOwner$ = this.annotation$.pipe(
    map(annotation => this.userdata.isAnnotationOwner(annotation)),
  );
  public userOwnsCompilation$ = this.processing.compilation$.pipe(
    map(compilation => this.userdata.doesUserOwn(compilation)),
  );
  public canUserEdit$ = this.isAnnotatingAllowed$;
  public canUserDelete$ = combineLatest([this.isAnnotatingAllowed$, this.isAnnotationOwner$]).pipe(
    map(([isAnnotatingAllowed, isAnnotationOwner]) => isAnnotatingAllowed && isAnnotationOwner),
  );

  public isSelectedAnnotation$ = combineLatest([
    this.annotation$,
    this.annotationService.selectedAnnotation$,
  ]).pipe(map(([annotation, selectedAnnotation]) => annotation?._id === selectedAnnotation));

  public isEditMode$ = combineLatest([
    this.annotationService.editModeAnnotation$,
    this.annotation$,
  ]).pipe(
    map(([editModeAnnotation, annotation]) => {
      if (!annotation) return false;
      const isEditAnno = editModeAnnotation === annotation._id;
      if (!isEditAnno) this.annotationService.updateAnnotation(annotation);
      return isEditAnno;
    }),
  );

  public isAnnotationHidden$ = combineLatest([
    this.annotation$,
    this.annotationService.hiddenAnnotations$,
  ]).pipe(
    map(([annotation, hiddenAnnotations]) => hiddenAnnotations.includes(annotation._id.toString())),
  );

  constructor() {
    combineLatest([interval(15), this.annotation$])
      .pipe(map(([_, annotation]) => annotation))
      .subscribe(annotation => this.setPosition(annotation));
    this.isSelectedAnnotation$.subscribe(isSelected => {
      this.#isSelected = isSelected;
    });
  }

  public closeAnnotation(): void {
    this.annotationService.setSelectedAnnotation('');
  }

  public async shareAnnotation() {
    const annotation = await firstValueFrom(this.annotation$);
    this.annotationService.shareAnnotation(annotation);
  }

  public async deleteAnnotation() {
    const annotation = await firstValueFrom(this.annotation$);
    this.annotationService.deleteAnnotation(annotation);
  }

  #ref = inject<ElementRef<HTMLElement>>(ElementRef);

  private setPosition(annotation: IAnnotation) {
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

    this.positionTop = top < 0 ? 0 : top + elHeight > height ? height - elHeight : top;
    this.positionLeft = left < 0 ? 0 : left + elWidth > width ? width - elWidth : left;
  }

  public async toggleFullscreen(mode: 'edit' | 'preview') {
    const annotation = await firstValueFrom(this.annotation$);
    const dialogRef = this.dialog.open<
      DialogAnnotationEditorComponent,
      any,
      { title: string; description: string } | undefined
    >(DialogAnnotationEditorComponent, {
      width: 'min(75vw, 860px)',
      data: { annotation, mode },
    });
    if (mode !== 'edit') return;

    // Save changes only if edited
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (!result) return;
    if (
      result.title === annotation.body.content.title &&
      result.description === annotation.body.content.description
    )
      return;

    annotation.body.content.title = result.title;
    annotation.body.content.description = result.description;

    this.annotationService.updateAnnotation(annotation);
  }
}
