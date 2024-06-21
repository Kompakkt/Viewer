import { Component, ElementRef, HostBinding, Input, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Matrix, Vector3 } from '@babylonjs/core';
import { BehaviorSubject, ReplaySubject, combineLatest, firstValueFrom, interval, map } from 'rxjs';
import { IAnnotation } from 'src/common';
import { environment } from 'src/environment';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { QuillEditorComponent } from 'ngx-quill';
import { ButtonComponent, ButtonRowComponent, InputComponent } from 'projects/komponents/src';
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
    MatFormField,
    MatLabel,
    MatInput,
    MatIconButton,
    MatIcon,
    MatCardContent,
    CdkTextareaAutosize,
    MarkdownPreviewComponent,
    MatCardActions,
    MatTooltip,
    AsyncPipe,
    TranslatePipe,
    ButtonComponent,
    ButtonRowComponent,
    InputComponent,
    QuillEditorComponent,
  ],
})
export class AnnotationComponent {
  public annotationService = inject(AnnotationService);
  public babylon = inject(BabylonService);
  public dialog = inject(MatDialog);
  public userdata = inject(UserdataService);
  public processing = inject(ProcessingService);

  public fullscreen = false;
  @HostBinding('class.fullscreen')
  get __fullscreen() {
    return this.fullscreen;
  }

  public toggleFullscreen() {
    this.fullscreen = !this.fullscreen;
  }

  public enableEditMode() {
    firstValueFrom(this.annotation$).then(annotation => {
      this.fullscreen = true;
      this.annotationService.setEditModeAnnotation(annotation._id.toString());
    });
  }

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

  constructor() {
    combineLatest([interval(15), this.annotation$])
      .pipe(map(([_, annotation]) => annotation))
      .subscribe(annotation => this.setPosition(annotation));
    this.isSelectedAnnotation$.subscribe(isSelected => {
      this.#isSelected = isSelected;
    });
  }

  get previewImage$() {
    return this.annotation$.pipe(
      map(annotation => annotation.body.content.relatedPerspective.preview),
      map(preview =>
        preview.startsWith('data:image') ? preview : environment.server_url + preview,
      ),
    );
  }

  public closeAnnotation(): void {
    this.annotationService.setSelectedAnnotation('');
  }

  public async toggleEditViewMode() {
    const annotation = await firstValueFrom(this.annotation$);
    const isEditMode = await firstValueFrom(this.isEditMode$);
    this.annotationService.setEditModeAnnotation(isEditMode ? '' : annotation._id.toString());
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

  public async editFullscreen() {
    const annotation = await firstValueFrom(this.annotation$);
    const dialogRef = this.dialog.open(DialogAnnotationEditorComponent, {
      width: '75%',
      data: {
        title: annotation.body.content.title,
        content: annotation.body.content.description,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && annotation) {
        annotation.body.content.title = result.title;
        annotation.body.content.description = result.content;
      }
      console.log(result);
    });
  }
}
