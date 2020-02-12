import { Component, OnInit } from '@angular/core';
import { Vector3 } from 'babylonjs';

import { IAnnotation } from '../../../interfaces/interfaces';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { AnnotationmarkerService } from '../../../services/annotationmarker/annotationmarker.service';
import { BabylonService } from '../../../services/babylon/babylon.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
})
export class AnnotationwalkthroughComponent implements OnInit {
  public title = 'Annotation Walkthrough';
  private actualRanking = -1;
  public annotations;

  constructor(
    public annotationService: AnnotationService,
    private babylonService: BabylonService,
    private annotationMarkerService: AnnotationmarkerService,
  ) {}

  ngOnInit() {
    this.annotationService.currentAnnotations.subscribe(currentAnnotations => {
      this.annotations = currentAnnotations;
      this.title = 'Annotation Walkthrough';
      this.actualRanking = -1;
    });

    this.annotationMarkerService.isSelectedAnnotation.subscribe(
      currentAnnotation => {
        const selectedAnnotation = this.annotations.find(
          (anno: IAnnotation) => anno._id === currentAnnotation,
        );
        if (selectedAnnotation)
          this.title = selectedAnnotation.body.content.title;
      },
    );
  }

  public previousAnnotation() {
    const isFirst = this.actualRanking === 0;
    this.actualRanking = isFirst
      ? this.annotations.length - 1
      : (this.actualRanking = this.actualRanking - 1);
    this.getAction(this.actualRanking);
  }

  public nextAnnotation() {
    const isLast = this.actualRanking === this.annotations.length - 1;

    this.actualRanking = isLast ? 0 : this.actualRanking + 1;
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {
    const annotation = this.annotations[index];

    this.title = annotation.body.content.title;

    const perspective = annotation.body.content.relatedPerspective;

    if (perspective !== undefined) {
      const positionVector = new Vector3(
        perspective.position.x,
        perspective.position.y,
        perspective.position.z,
      );
      const targetVector = new Vector3(
        perspective.target.x,
        perspective.target.y,
        perspective.target.z,
      );

      this.babylonService.cameraManager.moveActiveCameraToPosition(
        positionVector,
      );
      this.babylonService.cameraManager.setActiveCameraTarget(targetVector);
    }

    this.annotationService.setSelectedAnnotation(annotation._id);
    this.babylonService.hideMesh(annotation._id, true);
  }
}
