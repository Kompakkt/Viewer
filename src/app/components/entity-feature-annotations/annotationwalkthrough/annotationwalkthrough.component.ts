import { Component, OnInit } from '@angular/core';
import { Vector3 } from 'babylonjs';

import { IAnnotation } from '@kompakkt/shared';
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
  private ranking = -1;
  public annotations: IAnnotation[] = [];

  constructor(
    public annotationService: AnnotationService,
    private babylon: BabylonService,
    private annotationMarkerService: AnnotationmarkerService,
  ) {}

  ngOnInit() {
    this.annotationService.currentAnnotations.subscribe(currentAnnotations => {
      this.annotations = currentAnnotations;
      this.title = 'Annotation Walkthrough';
      this.ranking = -1;
    });

    this.annotationMarkerService.isSelectedAnnotation.subscribe(
      currentAnnotation => {
        const selectedAnnotation = this.annotations.find(
          (anno: IAnnotation) => anno._id === currentAnnotation,
        );
        if (selectedAnnotation) {
          this.title = selectedAnnotation.body.content.title;
        }
      },
    );
  }

  public previousAnnotation() {
    const isFirst = this.ranking === 0;
    this.ranking = isFirst
      ? this.annotations.length - 1
      : (this.ranking = this.ranking - 1);
    this.getAction(this.ranking);
  }

  public nextAnnotation() {
    const isLast = this.ranking === this.annotations.length - 1;

    this.ranking = isLast ? 0 : this.ranking + 1;
    this.getAction(this.ranking);
  }

  private getAction(index: number) {
    const annotation = this.annotations[index];

    this.title = annotation.body.content.title;

    const perspective = annotation.body.content.relatedPerspective;

    if (perspective !== undefined) {
      this.babylon.cameraManager.moveActiveCameraToPosition(
        new Vector3(
          perspective.position.x,
          perspective.position.y,
          perspective.position.z,
        ),
      );
      this.babylon.cameraManager.setActiveCameraTarget(
        new Vector3(
          perspective.target.x,
          perspective.target.y,
          perspective.target.z,
        ),
      );
    }

    this.annotationService.setSelectedAnnotation(annotation._id.toString());
    this.babylon.hideMesh(annotation._id.toString(), true);
  }
}
