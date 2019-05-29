import {Injectable} from '@angular/core';
// import { text } from '@angular/core/src/render3';
import { AbstractMesh, Mesh, MeshBuilder, StandardMaterial, Tags } from 'babylonjs';
import { AdvancedDynamicTexture,  Control, Ellipse, TextBlock } from 'babylonjs-gui';

import {AnnotationService} from '../annotation/annotation.service';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';

@Injectable({
  providedIn: 'root',
})
export class AnnotationvrService {

  private controlPrevious: AbstractMesh;
  private controlNext: AbstractMesh;

  // FOR VR-HUD
  private advancedTextureFullscreen: AdvancedDynamicTexture;
  private text1: TextBlock;

  public actualRanking: number;

  private posXcontrolPrevious: number;
  private posYcontrolPrevious: number;
  private posZcontrolPrevious: number;
  private posXcontrolNext: number;
  private posYcontrolNext: number;
  private posZcontrolNext: number;

  constructor(private babylonService: BabylonService,
              private annotationService: AnnotationService,
              private cameraService: CameraService) {

    this.actualRanking = 0;

    this.posXcontrolPrevious = -5;
    this.posYcontrolPrevious = -1;
    this.posZcontrolPrevious = 2.5;

    this.posXcontrolNext = 5;
    this.posYcontrolNext = -1;
    this.posZcontrolNext = 2.5;

    this.babylonService.vrModeIsActive.subscribe(vrModeIsActive => {
      if (vrModeIsActive) {

        // FOR VR-HUD
        this.advancedTextureFullscreen = AdvancedDynamicTexture.CreateFullscreenUI('myUI2');
        this.advancedTextureFullscreen.isForeground = true;

        this.createVRAnnotationControls();
        this.createVRAnnotationContentField();
      } else {

        this.deleteVRElements();
      }
    });
  }

  public createVRAnnotationControls() {

    // Previous Control
    this.controlPrevious = MeshBuilder.CreatePlane('controlPrevious', {height: 1, width: 1}, this.babylonService.getScene());
    this.controlPrevious.parent = this.babylonService.getScene().activeCamera;
    // console.log("position of Camera before Controls are positioned ");
    // console.log(this.babylonService.getActiveCamera().position);
    this.controlPrevious.position.x = this.posXcontrolPrevious;
    this.controlPrevious.position.y = this.posYcontrolPrevious;
    this.controlPrevious.position.z = this.posZcontrolPrevious;
    this.controlPrevious.material = new StandardMaterial('controlMat', this.babylonService.getScene());
    this.controlPrevious.material.alpha = 1;
    this.controlPrevious.renderingGroupId = 1;
    this.controlPrevious.billboardMode = Mesh.BILLBOARDMODE_ALL;
    Tags.AddTagsTo(this.controlPrevious, 'control');

    const label = this.createLabel();
    AdvancedDynamicTexture.CreateForMesh(this.controlPrevious).addControl(label);

    // Next Control
    this.controlNext = MeshBuilder.CreatePlane('controlNext', {height: 1, width: 1}, this.babylonService.getScene());
    this.controlNext.parent = this.babylonService.getScene().activeCamera;
    this.controlNext.position.x = this.posXcontrolNext;
    this.controlNext.position.y = this.posYcontrolNext;
    this.controlNext.position.z = this.posZcontrolNext;
    this.controlNext.material = new StandardMaterial('controlMat', this.babylonService.getScene());
    this.controlNext.material.alpha = 1;
    this.controlNext.renderingGroupId = 1;
    this.controlNext.billboardMode = Mesh.BILLBOARDMODE_ALL;
    Tags.AddTagsTo(this.controlNext, 'control');

    const label2 = this.createLabel2();
    AdvancedDynamicTexture.CreateForMesh(this.controlNext).addControl(label2);
  }

  private createLabel() {

    const label = new Ellipse('controlPreviousLabel');
    label.width = '100%';
    label.height = '100%';
    label.color = 'white';
    label.thickness = 1;
    label.background = 'white';
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    label.onPointerMoveObservable.add(() => {
      if (this.controlPrevious.metadata) {
        this.controlPrevious.metadata = null;
        this.previousAnnotation();
      }
    });
    return label;
  }

  private createLabel2() {

    const label = new Ellipse('controlNextLabel');
    label.width = '100%';
    label.height = '100%';
    label.color = 'white';
    label.thickness = 1;
    label.background = 'black';
    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;

    label.onPointerMoveObservable.add(() => {
      if (this.controlNext.metadata) {
        this.controlNext.metadata = null;
        this.nextAnnotation();
      }
    });
    return label;
  }

  public createVRAnnotationContentField() {

    // FOR VR-HUD
    this.text1 = new TextBlock();
    this.text1.text = 'Look around to start the annotation tour. \n Look at black button => next annotation \n Look at white button => previous annotation';
    this.text1.color = 'white';
    this.text1.fontSize = 24;
    this.text1.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.advancedTextureFullscreen.addControl(this.text1);
  }

  public deleteVRElements() {

    // FOR VR-HUD
    this.advancedTextureFullscreen.isForeground = false;
    this.advancedTextureFullscreen.removeControl(this.text1);

    this.babylonService.getScene().getMeshesByTags('control').forEach(function(value) {
      value.dispose();
    });
  }

  private previousAnnotation() {

    if (this.annotationService.getCurrentAnnotations().length) {
      if (this.actualRanking === 0) {
        this.actualRanking = this.annotationService.getCurrentAnnotations().length;
      }
      if (this.actualRanking !== 0) {
        this.actualRanking = this.actualRanking - 1;
      }
    }
    if (this.actualRanking < 0) {
      this.actualRanking = 0;
    }
    if (this.actualRanking > this.annotationService.getCurrentAnnotations().length) {
      this.actualRanking = this.annotationService.getCurrentAnnotations().length;
    }
    this.getAction(this.actualRanking);
  }

  private nextAnnotation() {

    if (this.annotationService.getCurrentAnnotations().length) {
      if (this.actualRanking > this.annotationService.getCurrentAnnotations().length - 1) {
        this.actualRanking = this.annotationService.getCurrentAnnotations().length - 1;
      } else {
        this.actualRanking = this.actualRanking + 1;
      }
      if (this.actualRanking === this.annotationService.getCurrentAnnotations().length) {
        this.actualRanking = 0;
      }
    } else {
      this.actualRanking = 0;
    }
    if (this.actualRanking < 1) {
      this.actualRanking = 0;
    }
    if (this.actualRanking > this.annotationService.getCurrentAnnotations().length) {
      this.actualRanking = 0;
    }
    this.getAction(this.actualRanking);
  }

  private getAction(index: number) {

    if (this.annotationService.getCurrentAnnotations().length) {
      // FOR VR-HUD

      this.text1.text = this.annotationService.getCurrentAnnotations()[index].body.content.title;

      let cameraVector;
      let i = 1;
      this.babylonService.getScene().getMeshesByTags('plane', mesh => {

        if (Math.abs(i % 2) != 1) {
          i++;
        } else {
          i++;

          const annoID = this.annotationService.getCurrentAnnotations()[index]['_id'] + '_pick';

          if (annoID === mesh.name) {
            // console.log("Active-Camera - Before Animation");
            // console.log(this.babylonService.getActiveCamera().position);
            cameraVector = mesh.position;
            this.cameraService.moveVRCameraToTarget(cameraVector);
          }
        }
      });
    } else {
      this.actualRanking = 0;
    }
  }

}
