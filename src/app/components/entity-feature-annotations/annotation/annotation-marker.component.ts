import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IAnnotation } from 'src/common';
import { Matrix, Vector3 } from '@babylonjs/core';

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

    setInterval(() => {
      if (!this.annotation) {
        console.error('AnnotationComponent without annotation', this);
        throw new Error('AnnotationComponent without annotation');
      }
      this.setPosition(this.annotation);
    }, 15);
  }

  private setPosition(annotation: IAnnotation) {
    const scene = this.babylon.getScene();

    if (!scene) {
      return false;
    }
    const getMesh = scene.getMeshByName(`${annotation._id}_marker`);

    if (getMesh && scene.activeCamera) {
      const engine = this.babylon.getEngine();

      const [width, height] = [engine.getRenderWidth(), engine.getRenderHeight()];

      const p = Vector3.Project(
        getMesh.getBoundingInfo().boundingBox.centerWorld,
        Matrix.Identity(),
        scene.getTransformMatrix(),
        scene.activeCamera.viewport.toGlobal(width, height),
      );

      const [left, top] = [Math.round(p.x) - 20, Math.round(p.y) - 20];
      const [elHeight, elWidth] = [20, 20];

      this.positionTop = top < 0 ? 0 : top + elHeight > height ? height - elHeight : top;
      this.positionLeft = left < 0 ? 0 : left + elWidth > width ? width - elWidth : left;
      /* p.z is just a minimal change like: 0.99993 -> 0.99994 */
      /* so we have to look at the 5th decimal place and throw away the beginning */
      this.positionZ = Math.round(((1 / p.z) * 1000000) % 100000);
    }
  }

  public selectAnnotation(annotation: IAnnotation) {
    this.selectedAnnotation = annotation;
    this.annotationService.setSelectedAnnotation(annotation._id.toString());
  }
}
