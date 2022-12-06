import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IAnnotation } from 'src/common';
import { Camera, Matrix, Nullable, PointerEventTypes, Vector3 } from '@babylonjs/core';

import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
// tslint:disable-next-line:max-line-length

@Component({
  selector: 'app-annotation-marker',
  templateUrl: './annotation-marker.component.html',
  styleUrls: ['./annotation-marker.component.scss'],
})
export class AnnotationMarkerComponent implements OnInit {
  @Input() entityFileName: string | undefined;
  @Input() annotation: IAnnotation | undefined;

  // internal
  public positionTop = 0;
  public positionLeft = 0;
  public positionZ = 0;
  public isMoving = false;
  public hasMoved = 50;
  public cameraPosTemp: Vector3 | undefined;
  public behind = false;
  private scene = this.babylon.getScene();
  private engine = this.babylon.getEngine();
  private camera: Nullable<Camera> = null;

  public selectedAnnotation: IAnnotation | undefined;

  constructor(
    public annotationService: AnnotationService,
    public babylon: BabylonService,
    public dialog: MatDialog,
    public processing: ProcessingService,
  ) {}

  ngOnInit() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }

    this.camera = this.scene.activeCamera;
    //eventlistener on long mousclick and drag
    this.scene.onPointerObservable.add(pointerInfo => {
      if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        this.isMoving = false;
      }
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        this.isMoving = true;
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

  private setPosition(annotation: IAnnotation) {
    //check if user is moving the view
    if (!this.scene || this.hasMoved <= 0 || this.isMoving || !this.camera || !this.annotation) {
      this.cameraPosTemp = this.camera?.position.clone();
      return false;
    }

    //check if camera is still moving
    if (this.camera && this.cameraPosTemp?.equals(this.camera?.position)) {
      this.cameraPosTemp = this.camera?.position.clone();
      return false;
    }

    const getMesh = this.scene.getMeshByName(`${annotation._id}_marker`);

    if (getMesh) {
      const [width, height] = [this.engine.getRenderWidth(), this.engine.getRenderHeight()];

      const p = Vector3.Project(
        getMesh.getBoundingInfo().boundingBox.centerWorld,
        Matrix.Identity(),
        this.scene.getTransformMatrix(),
        this.camera.viewport.toGlobal(width, height),
      );

      const [left, top] = [Math.round(p.x), Math.round(p.y)];
      const [elHeight, elWidth] = [20, 20];

      this.positionTop = top < 0 ? 0 : top + elHeight > height ? height - elHeight : top;
      this.positionLeft = left < 0 ? 0 : left + elWidth > width ? width - elWidth : left;

      this.positionZ = Math.round(p.z * 1000000) / 1000000;
      this.cameraPosTemp = this.camera.position.clone();

      this.castRay();
    }
  }

  private castRay() {
    const result = this.scene.pick(this.positionTop, this.positionLeft, () => true);

    this.behind = !(result?.pickedMesh?.name === `${this.annotation?._id}_marker`);
  }

  public selectAnnotation(annotation: IAnnotation) {
    this.selectedAnnotation = annotation;
    this.annotationService.setSelectedAnnotation(annotation._id.toString());
  }
}
