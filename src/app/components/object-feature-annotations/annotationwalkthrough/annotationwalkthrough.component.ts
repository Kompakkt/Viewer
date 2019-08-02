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
  private actualRanking = 0;

  constructor(
    public annotationService: AnnotationService,
    private babylonService: BabylonService,
  ) {}

  ngOnInit() {}

  public previousAnnotation() {
    this.actualRanking === 0
      ? (this.actualRanking =
          this.annotationService.getCurrentAnnotations().length - 1)
      : (this.actualRanking = this.actualRanking - 1);
    this.getAction(this.actualRanking);
  }

  public nextAnnotation() {
    this.actualRanking ===
    this.annotationService.getCurrentAnnotations().length - 1
      ? (this.actualRanking = 0)
      : (this.actualRanking = this.actualRanking + 1);
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {
    this.title = this.annotationService.getCurrentAnnotations()[
      index
    ].body.content.title;

    const perspective = this.annotationService.getCurrentAnnotations()[index]
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
      this.babylonService.cameraManager
        .getActiveCamera()
        .setTarget(targetVector);
    }

    this.annotationService.setSelectedAnnotation(
      this.annotationService.getCurrentAnnotations()[index]._id,
    );
    this.babylonService.hideMesh(
      this.annotationService.getCurrentAnnotations()[index]._id,
      true,
    );
  }
}
