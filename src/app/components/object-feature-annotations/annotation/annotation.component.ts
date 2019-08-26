import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { Matrix, Vector3 } from 'babylonjs';

import { IAnnotation } from '../../../interfaces/interfaces';
import { AnnotationService } from '../../../services/annotation/annotation.service';
// tslint:disable-next-line:max-line-length
import { AnnotationmarkerService } from '../../../services/annotationmarker/annotationmarker.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
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

  @ViewChild('annotationContent', { static: false })
  private annotationContent;

  @ViewChild('annotationForm', { static: false })
  private annotationForm: ElementRef<HTMLFormElement> | undefined;

  // internal
  public isEditMode = false;
  public showAnnotation = false;
  public positionTop = 0;
  public positionLeft = 0;
  public collapsed = false;
  public selectedAnnotation: string | undefined;
  // --- JAN ----
  public showMediaBrowser = false;
  // ---

  // external
  public visibility = false;
  public isAnnotatingAllowed = false;
  public isAnnotationOwner = false;
  public isCollectionOwner = false;
  public isInSocket = false;

  constructor(
    public annotationService: AnnotationService,
    public babylonService: BabylonService,
    public annotationmarkerService: AnnotationmarkerService,
    public dialog: MatDialog,
    private userdataService: UserdataService,
  ) {}

  ngOnInit() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
      return;
    }
    this.showAnnotation = true;
    this.collapsed = false;
    this.isAnnotatingAllowed = this.annotationService.isAnnotatingAllowed;
    this.isAnnotationOwner = this.userdataService.isAnnotationOwner(
      this.annotation,
    );
    this.isCollectionOwner = this.userdataService.isCollectionOwner;

    this.userdataService.isUserAuthenticatedObservable.subscribe(_ => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
        return;
      }
      this.isAnnotationOwner = this.userdataService.isAnnotationOwner(
        this.annotation,
      );
    });

    this.userdataService.collectionOwner.subscribe(colOwner => {
      this.isCollectionOwner = colOwner;
    });

    this.annotationService.isSelectedAnnotation.subscribe(selectedAnno => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
        return;
      }
      this.visibility = selectedAnno === this.annotation._id;
      this.selectedAnnotation = selectedAnno;
    });

    this.annotationService.annnotatingAllowed.subscribe(allowed => {
      this.isAnnotatingAllowed = allowed;
    });

    this.annotationService.broadcasting.subscribe(inSocket => {
      this.isInSocket = inSocket;
      console.log('inSocket');
    });

    this.annotationService.isEditModeAnnotation.subscribe(selectedEditAnno => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
        return;
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

        // this.annotationService.setSelectedAnnotation(this.annotation._id);
      }
    });

    setInterval(() => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
        return;
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
      return;
    }
    this.annotationService.setEditModeAnnotation(
      this.isEditMode ? '' : this.annotation._id,
    );
  }

  public shareAnnotation() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
      return;
    }
    this.annotationService.shareAnnotation(this.annotation);
  }

  public deleteAnnotation(): void {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
      return;
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

  // --- JAN ----
  public editFullscreen(): void {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
      return;
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

  public addMedium(medium) {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
      return;
    }
    const mdImage = `![alt ${medium.description}](${medium.url})`;

    this.annotationContent.nativeElement.focus();

    const start = this.annotationContent.nativeElement.selectionStart;
    const value = this.annotationContent.nativeElement.value;

    this.annotation.body.content.description = `${value.substring(
      0,
      start,
    )}${mdImage}${value.substring(start, value.length)}`;
  }

  // ---
}
