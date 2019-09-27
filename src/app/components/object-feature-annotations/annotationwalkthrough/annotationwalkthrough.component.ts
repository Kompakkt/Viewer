import { Component, OnInit } from '@angular/core';
import { Vector3 } from 'babylonjs';

import { AnnotationService } from '../../../services/annotation/annotation.service';
import { BabylonService } from '../../../services/babylon/babylon.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
})
export class AnnotationwalkthroughComponent implements OnInit {
  public title = 'Annotation Walkthrough';
  private actualRanking = -1;
  private annotations;

  constructor(
    public annotationService: AnnotationService,
    private babylonService: BabylonService,
  ) {}

  ngOnInit() {

    this.annotationService.currentAnnotations.subscribe(currentAnnotations => {
      this.annotations = currentAnnotations;
      this.title = 'Annotation Walkthrough';
    });
  }

  public previousAnnotation() {
    const isFirst = this.actualRanking === 0;
    this.actualRanking = isFirst
      ? this.annotations.length - 1
      : (this.actualRanking = this.actualRanking - 1);
    this.getAction(this.actualRanking);
  }

  public nextAnnotation() {
    const isLast =
      this.actualRanking ===
      this.annotations.length - 1;

    this.actualRanking = isLast ? 0 : this.actualRanking + 1;
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {
    this.title = this.annotations[
      index
    ].body.content.title;

    const perspective = this.annotations[index]
      .body.content.relatedPerspective;

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

    this.annotationService.setSelectedAnnotation(
      this.annotations[index]._id,
    );
    this.babylonService.hideMesh(
      this.annotations[index]._id,
      true,
    );
  }
}
