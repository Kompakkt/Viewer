import {Component, OnInit} from '@angular/core';
import {Vector3} from 'babylonjs';
import * as BABYLON from 'babylonjs';

import {AnnotationService} from '../../../services/annotation/annotation.service';
import {BabylonService} from '../../../services/babylon/babylon.service';
import {CameraService} from '../../../services/camera/camera.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
})
export class AnnotationwalkthroughComponent implements OnInit {

  public title: string;
  private positionVector: Vector3;
  private actualRanking: number;

  constructor(private cameraService: CameraService,
              public annotationService: AnnotationService,
              private babylonService: BabylonService) {
  }

  ngOnInit() {
    this.positionVector = Vector3.Zero();
    this.actualRanking = 0;
    this.title = 'Annotation Walkthrough';
  }

  public previousAnnotation() {
    this.actualRanking === 0 ?
      this.actualRanking = this.annotationService.annotations.length - 1 :
      this.actualRanking = this.actualRanking - 1;
    this.getAction(this.actualRanking);
  }

  public nextAnnotation() {
    this.actualRanking === (this.annotationService.annotations.length) - 1 ?
      this.actualRanking = 0 : this.actualRanking = this.actualRanking + 1;
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {

    this.title = this.annotationService.annotations[index].body.content.title;

    let camera;
    camera = this.annotationService.annotations[index].body.content.relatedPerspective;

    if (camera !== undefined) {
      const positionVector =
        new BABYLON.Vector3(camera.position.x, camera.position.y, camera.position.z);
      const targetVector =
        new BABYLON.Vector3(camera.target.x, camera.target.y, camera.target.z);

      this.cameraService.moveCameraToTarget(positionVector);
      this.cameraService.arcRotateCamera.setTarget(targetVector);
    }

    this.annotationService.setSelectedAnnotation(
      this.annotationService.annotations[index]._id);
    this.babylonService.hideMesh(this.annotationService.annotations[index]._id, true);
  }

}
