import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Matrix, Vector3 } from '@babylonjs/core';
import { BehaviorSubject, combineLatest, firstValueFrom, interval, map, ReplaySubject } from 'rxjs';
import { IAnnotation } from 'src/common';
import { environment } from 'src/environments/environment';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogAnnotationEditorComponent } from '../../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';
import { TranslateService } from './../../../services/translate/translate.service';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent {
  @Input() entityFileName: string | undefined;
  @Input('annotation') set setAnnotation(annotation: IAnnotation) {
    this.annotation$.next(annotation);
  }
  public annotation$ = new ReplaySubject<IAnnotation>(1);

  @ViewChild('annotationForm')
  private annotationForm: ElementRef<HTMLFormElement> | undefined;

  public positionTop = 0;
  public positionLeft = 0;

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
  translateItems: string[] = [];

  constructor(private translate: TranslateService,
    public annotationService: AnnotationService,
    public babylon: BabylonService,
    public dialog: MatDialog,
    public userdata: UserdataService,
    public processing: ProcessingService,
  ) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.translateStrings();
    combineLatest([interval(15), this.annotation$])
      .pipe(map(([_, annotation]) => annotation))
      .subscribe(annotation => this.setPosition(annotation));
  }

  async translateStrings () {
    let translateSet = ["Save Annotation","Edit Annotation","Show","Hide","validated","unvalidated"];
    this.translateItems = await this.translate.loadFromFile(translateSet);
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

  private setPosition(annotation: IAnnotation) {
    if (!this.annotationForm?.nativeElement.parentElement) return;

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

    const parent = this.annotationForm.nativeElement.parentElement;
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
