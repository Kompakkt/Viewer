import { AfterViewInit, Component, Input, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IAnnotation } from 'src/common';

import {
  Engine,
  Matrix,
  Scene,
  Vector3
} from '@babylonjs/core';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';
import { ProcessingService } from '../../../services/processing/processing.service';
// tslint:disable-next-line:max-line-length

@Component({
  selector: 'app-annotation-marker',
  templateUrl: './annotation-marker.component.html',
  styleUrls: ['./annotation-marker.component.scss'],
  standalone: true,
})
export class AnnotationMarkerComponent implements OnInit, AfterViewInit {
  @Input() entityFileName: string | undefined;
  @Input() annotation!: IAnnotation;

  public positionData = signal({
    top: 0,
    left: 0,
    z: 0,
    behind: false,
  })

  public markerSize = 32;
  private scene: Scene;
  private engine: Engine;

  public selectedAnnotation: IAnnotation | undefined;

  constructor(
    public annotationService: AnnotationService,
    public babylon: BabylonService,
    public dialog: MatDialog,
    public processing: ProcessingService,
  ) {
    this.scene = this.babylon.getScene();
    this.engine = this.babylon.getEngine();
  }

  ngOnInit() {
    if (!this.annotation) {
      console.error('AnnotationComponent without annotation', this);
      throw new Error('AnnotationComponent without annotation');
    }
  }

  ngAfterViewInit(): void {
    const loop = () => {
      this.setPosition();
      requestAnimationFrame(loop);
    };
    loop();
  }

  public setPosition() {
    const annotation = this.annotation;
    const camera = this.babylon.getActiveCamera();
    if (!this.scene ||  !camera || !annotation) return;

    const marker = this.scene.getMeshByName(`${annotation._id}_marker`);
    if (!marker) return;

    const [width, height] = [this.engine.getRenderWidth(), this.engine.getRenderHeight()];

    const { x, y, z } = Vector3.Project(
      marker.getBoundingInfo().boundingBox.centerWorld,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      camera.viewport.toGlobal(width, height),
    );

    const [left, top] = [Math.round(x), Math.round(y)];

    this.positionData.set({
      top: top < 0 ? 0 : top + this.markerSize > height ? height - this.markerSize : top,
      left: left < 0 ? 0 : left + this.markerSize > width ? width - this.markerSize : left,
      z: Math.round(z * 1000000) / 1000000,
      behind: marker.isOccluded,
    })
  }

  public selectAnnotation(annotation: IAnnotation) {
    this.selectedAnnotation = annotation;
    this.annotationService.setSelectedAnnotation(annotation._id.toString());
  }
}
