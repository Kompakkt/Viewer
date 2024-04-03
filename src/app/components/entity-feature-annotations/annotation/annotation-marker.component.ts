import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IAnnotation } from 'src/common';
import { Camera, Matrix, Nullable, Vector3, PointerEventTypes } from '@babylonjs/core';

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
  public markerSize = 30;
  private scene = this.babylon.getScene();
  private engine = this.babylon.getEngine();
  private camera: Nullable<Camera> = null;
  private intervalSpeed = 25;
  private intervalId: any;

  public selectedAnnotation: IAnnotation | undefined;

  constructor(
    public annotationService: AnnotationService,
    public babylon: BabylonService,
    public dialog: MatDialog,
    public processing: ProcessingService,
  ) {
    this.calculateAndAdjustInterval = this.calculateAndAdjustInterval.bind(this);
    this.startInterval = this.startInterval.bind(this);
  }

  ngOnInit() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }

    this.camera = this.scene.activeCamera;
    //eventlistener on long mousclick and drag
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERUP) {
        this.isMoving = false;
      }
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        this.isMoving = true;
      }
    });
    this.startInterval();
  }

  ngoOnDestroy() {
    clearInterval(this.intervalId);
  }

  private calculateAndAdjustInterval() {
    if (!this.annotation) {
      console.error("AnnotationComponent without annotation", this);
      throw new Error("AnnotationComponent without annotation");
    }
    if (this.isMoving) {
      if (this.intervalSpeed !== 75) {
        this.intervalSpeed = 75;
        this.startInterval(); // Restart the interval with the new speed
      }
    } else {
      // Reset intervalSpeed to the default value when not moving
      if (this.intervalSpeed !== 25) {
        this.intervalSpeed = 25;
        this.startInterval(); // Restart the interval with the new speed
      }
    }
    this.setPosition(this.annotation);
  };

  private startInterval() {
    clearInterval(this.intervalId); // Clear the previous interval, if any
    this.intervalId = setInterval(this.calculateAndAdjustInterval, this.intervalSpeed);
  };

  private setPosition(annotation: IAnnotation) {
    //check if user is moving the view
    if (!this.scene || this.hasMoved <= 0 || !this.camera || !this.annotation) {
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

      this.annotation.positionXOnView = top < 0 ? 0 : top + this.markerSize > height ? height - this.markerSize : top;
      this.annotation.positionYOnView = left < 0 ? 0 : left + this.markerSize > width ? width - this.markerSize : left;

      this.positionZ = Math.round(p.z * 1000000) / 1000000;
      this.cameraPosTemp = this.camera.position.clone();

      this.castRay();
    }
  }

  private castRay() {


    const result = this.scene.pick(
      this.annotation?.positionYOnView || 0,
      this.annotation?.positionXOnView || 0,
      // predicate should always return true, otherwise unpickable meshes will not be picked
      () => true,
    );

    this.behind = !(result?.pickedMesh?.name === `${this.annotation?._id}_marker`);

  }

  public selectAnnotation(annotation: IAnnotation) {
    this.selectedAnnotation = annotation;
    this.annotationService.setSelectedAnnotation(annotation._id.toString());
  }


}
