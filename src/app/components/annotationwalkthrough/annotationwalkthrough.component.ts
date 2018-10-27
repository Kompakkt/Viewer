import {Component, OnInit} from '@angular/core';
import * as BABYLON from 'babylonjs';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {CameraService} from '../../services/camera/camera.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.css']
})
export class AnnotationwalkthroughComponent implements OnInit {

  public title = '';
  public positionVector: BABYLON.Vector3;
  public actualRanking: number;

  constructor(public annotationService: AnnotationService, private cameraService: CameraService,
              private annotationmarkerService: AnnotationmarkerService) {
    this.title = 'walkthrough annotation';
    this.positionVector = BABYLON.Vector3.Zero();
    this.actualRanking = 0;
  }

  public previousAnnotation() {
    if (this.annotationService.annotations.length) {
      if (this.actualRanking === 0) {
        this.actualRanking = this.annotationService.annotations.length;
      }
      if (this.actualRanking !== 0) {
        this.actualRanking = this.actualRanking - 1;
      }
    }
    if (this.actualRanking < 0) {
      this.actualRanking = 0;
    }
    if (this.actualRanking > this.annotationService.annotations.length) {
      this.actualRanking = this.annotationService.annotations.length;
    }
    this.getAction(this.actualRanking);
  }

  public nextAnnotation() {
    if (this.annotationService.annotations.length) {
      if (this.actualRanking > this.annotationService.annotations.length - 1) {
        this.actualRanking = this.annotationService.annotations.length - 1;
      } else {
        this.actualRanking = this.actualRanking + 1;
      }
      if (this.actualRanking === this.annotationService.annotations.length) {
        this.actualRanking = 0;
      }
    } else {
      this.actualRanking = 0;
    }
    if (this.actualRanking < 1) {
      this.actualRanking = 0;
    }
    if (this.actualRanking > this.annotationService.annotations.length) {
      this.actualRanking = 0;
    }
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {
    const test = this.annotationService.annotations[index];
    const test2 = this.annotationService.annotations.length;
    console.log('annotation an der Stelle ' + index + ' ist ' + test + 'Array länge ' + test2);
    if (this.annotationService.annotations.length) {
      this.title = this.annotationService.annotations[index].title;
      const cameraVector = new BABYLON.Vector3(this.annotationService.annotations[index].cameraPosition[0].value,
        this.annotationService.annotations[index].cameraPosition[1].value,
        this.annotationService.annotations[index].cameraPosition[2].value);
      this.cameraService.moveCameraToTarget(cameraVector);
      // this.annotationmarkerService.toggleCreatorPopup(this.annotationService.annotations[index]._id);
    } else {
      this.actualRanking = 0;
    }
  }

  ngOnInit() {
  }

}
