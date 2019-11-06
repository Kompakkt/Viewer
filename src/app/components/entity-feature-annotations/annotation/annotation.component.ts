import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Matrix, Vector3 } from 'babylonjs';

import { IAnnotation } from '../../../interfaces/interfaces';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { UserdataService } from '../../../services/userdata/userdata.service';
// tslint:disable-next-line:max-line-length
import { DialogAnnotationEditorComponent } from '../../dialogs/dialog-annotation-editor/dialog-annotation-editor.component';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent implements OnInit {
  @Input() entityFileName: string | undefined;
  @Input() annotation: IAnnotation | undefined;

  @ViewChild('annotationForm')
  private annotationForm: ElementRef<HTMLFormElement> | undefined;

  // internal
  public isEditMode = false;
  public showAnnotation = false;
  public positionTop = 0;
  public positionLeft = 0;
  public collapsed = false;
  public selectedAnnotation: string | undefined;

  // external
  public visibility = false;
  public isAnnotatingAllowed = false;
  public isAnnotationOwner = false;

  constructor(
    public annotationService: AnnotationService,
    public babylonService: BabylonService,
    public dialog: MatDialog,
    private userdataService: UserdataService,
    public processingService: ProcessingService,
  ) {}

  ngOnInit() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
    this.showAnnotation = true;
    this.collapsed = false;
    this.isAnnotatingAllowed = this.processingService.annotationAllowance;
    this.isAnnotationOwner = this.userdataService.isAnnotationOwner(
      this.annotation,
    );

    this.annotationService.isSelectedAnnotation.subscribe(selectedAnno => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
      }
      this.visibility = selectedAnno === this.annotation._id;
      this.selectedAnnotation = selectedAnno;
    });

    this.processingService.setAnnotationAllowance.subscribe(allowed => {
      this.isAnnotatingAllowed = allowed;
    });

    this.annotationService.isEditModeAnnotation.subscribe(selectedEditAnno => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
      }
      const isEditAnno = selectedEditAnno === this.annotation._id;
      if (!isEditAnno && this.isEditMode) {
        this.isEditMode = false;
        this.annotationService.updateAnnotation(this.annotation);
        console.log(this.isEditMode);
      }
      if (isEditAnno && !this.isEditMode) {
        this.isEditMode = true;
        console.log(this.isEditMode);
        console.log(this.isAnnotatingAllowed);
        console.log(this.isAnnotationOwner);

        // this.annotationService.setSelectedAnnotation(this.annotation._id);
      }
    });

    setInterval(() => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
      }
      this.setPosition(this.annotation);
    }, 15);
  }

  public closeAnnotation(): void {
    this.annotationService.setSelectedAnnotation('');
  }

  public toggleEditViewMode(): void {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
    this.annotationService.setEditModeAnnotation(
      this.isEditMode ? '' : this.annotation._id,
    );
  }

  public shareAnnotation() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
    this.annotationService.shareAnnotation(this.annotation);
  }

  public deleteAnnotation(): void {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
    this.annotationService.deleteAnnotation(this.annotation);
  }

  private setPosition(annotation: IAnnotation) {
    const scene = this.babylonService.getScene();

    if (!scene) {
      return false;
    }

    const getMesh = scene.getMeshByName(annotation._id + '_pick');

    if (getMesh && scene.activeCamera) {
      if (
        !this.annotationForm ||
        !this.annotationForm.nativeElement.parentElement
      ) {
        return;
      }

      const engine = this.babylonService.getEngine();

      const [width, height] = [
        engine.getRenderWidth(),
        engine.getRenderHeight(),
      ];

      const p = Vector3.Project(
        getMesh.getBoundingInfo().boundingBox.centerWorld,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(width, height),
      );

      const parent = this.annotationForm.nativeElement.parentElement;
      const [left, top] = [Math.round(p.x), Math.round(p.y)];
      const [elHeight, elWidth] = [parent.clientHeight, parent.clientWidth];

      this.positionTop =
        top < 0 ? 0 : top + elHeight > height ? height - elHeight : top;
      this.positionLeft =
        left < 0 ? 0 : left + elWidth > width ? width - elWidth : left;
    }
  }

  public editFullscreen(): void {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
    const dialogRef = this.dialog.open(DialogAnnotationEditorComponent, {
      width: '75%',
      data: {
        title: this.annotation.body.content.title,
        content: this.annotation.body.content.description,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.annotation) {
        this.annotation.body.content.title = result.title;
        this.annotation.body.content.description = result.content;
      }
      console.log(result);
    });
  }
}
