import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IAnnotation } from 'src/common';
import { Matrix, PointerEventTypes, Vector3 } from '@babylonjs/core';

import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
import { map } from 'rxjs';
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
  public behind = false;
  private scene = this.babylon.getScene();
  private engine = this.babylon.getEngine();

  public markerSize = 30; // in px

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

    //eventlistener on long mousclick and drag
    const { POINTERUP, POINTERDOWN } = PointerEventTypes;
    this.scene.onPointerObservable.add(({ type }) => {
      if (type === POINTERUP || type === POINTERDOWN) this.isMoving = type === POINTERDOWN;
    });

    requestAnimationFrame(() => this.render());
  }

  get isSelected$() {
    return this.annotationService.isSelectedAnnotation.pipe(
      map(selected => this.annotation?._id === selected),
    );
  }

  private render() {
    this.setPosition(this.annotation!);
    // Less updates on lower framerates
    setTimeout(() => this.render(), 1000 / this.babylon.getEngine().getFps());
  }

  private setPosition(annotation: IAnnotation) {
    const camera = this.babylon.getActiveCamera();
    if (!camera) return;

    const marker = this.scene.getMeshByName(`${annotation._id}_marker`);
    if (!marker) return;
    const [width, height] = [this.engine.getRenderWidth(), this.engine.getRenderHeight()];

    const p = Vector3.Project(
      marker.getBoundingInfo().boundingBox.centerWorld,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      camera.viewport.toGlobal(width, height),
    );

    this.positionTop = Math.min(Math.max(0, Math.round(p.y)), height - this.markerSize);
    this.positionLeft = Math.min(Math.max(0, Math.round(p.x)), width - this.markerSize);

    this.positionZ = Math.round(p.z * 1000000) / 1000000;

    // TODO: figure out how to better detect
    // const result = this.scene.pick(this.positionTop, this.positionLeft, () => true);
    // if (!result) return;
    // console.log(result?.pickedMesh?.name);
    // this.behind = !(result?.pickedMesh?.name === `${this.annotation?._id}_marker`);
  }

  public selectAnnotation(annotation: IAnnotation) {
    this.annotationService.setSelectedAnnotation(annotation._id.toString());
  }
}
