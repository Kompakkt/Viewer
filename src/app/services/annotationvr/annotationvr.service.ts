import {Injectable} from '@angular/core';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';
import * as BABYLON from 'babylonjs';
import {AnnotationService} from '../annotation/annotation.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationvrService {

  private controlPrevious: BABYLON.AbstractMesh;
  private controlNext: BABYLON.AbstractMesh;
  private annotationTextField: BABYLON.GUI.TextBlock;
  private annotationTextGround: BABYLON.AbstractMesh;

  private selectingControlPrevious: boolean;
  private selectedControlPrevious: boolean;
  private selectingControlNext: boolean;
  private selectedControlNext: boolean;

  public actualRanking: number;

  private posXcontrolPrevious: number;
  private posYcontrolPrevious: number;
  private posZcontrolPrevious: number;

  private posXcontrolNext: number;
  private posYcontrolNext: number;
  private posZcontrolNext: number;

  private posXtextfield: number;
  private posYtextfield: number;
  private posZtextfield: number;

  private cameraWrapper = BABYLON.AbstractMesh;


  constructor(private babylonService: BabylonService,
              private annotationService: AnnotationService,
              private cameraService: CameraService) {

    this.actualRanking = 0;
    this.selectingControlPrevious = false;
    this.selectedControlPrevious = false;
    this.selectingControlNext = false;
    this.selectedControlNext = false;

    this.posXcontrolPrevious = -1.5;
    this.posYcontrolPrevious = -0.9;
    this.posZcontrolPrevious = 3;

    this.posXcontrolNext = 1.5;
    this.posYcontrolNext = -0.9;
    this.posZcontrolNext = 3;

    this.posXtextfield = 0;
    this.posYtextfield = -0.9;
    this.posZtextfield = 3;

    this.babylonService.vrModeIsActive.subscribe(vrModeIsActive => {

      if (vrModeIsActive) {
        this.createVRAnnotationControls();
        this.createVRAnnotationContentField();
        this.initializeControls();
      } else {
        this.deleteVRElements();
      }
    });
  }

  public createVRAnnotationControls() {

    // this.cameraWrapper = BABYLON.Mesh.CreateBox('cameraWrapper', 2, this.babylonService.getScene());

    this.controlPrevious = BABYLON.Mesh.CreateBox('controlPrevious', 2, this.babylonService.getScene());
    // BABYLON.Tags.AddTagsTo(this.controlPrevious, 'control');
    this.controlPrevious.position.x = this.posXcontrolPrevious;
    this.controlPrevious.position.y = this.posYcontrolPrevious;
    this.controlPrevious.position.z = this.posZcontrolPrevious;
    this.controlPrevious.material = new BABYLON.StandardMaterial('controlMat', this.babylonService.getScene());
    this.controlPrevious.renderingGroupId = 1;
    // this.controlPrevious.parent = this.cameraWrapper;

    this.controlNext = BABYLON.Mesh.CreateBox('controlNexts', 2, this.babylonService.getScene());
    // BABYLON.Tags.AddTagsTo(this.controlNext, 'control');
    this.controlNext.position.x = this.posXcontrolNext;
    this.controlNext.position.y = this.posXcontrolNext;
    this.controlNext.position.z = this.posZcontrolNext;
    this.controlNext.material = new BABYLON.StandardMaterial('controlMat', this.babylonService.getScene());
    this.controlNext.renderingGroupId = 1;
    // this.controlNext.parent = this.cameraWrapper;

  }

  public createVRAnnotationContentField() {

    this.annotationTextGround = BABYLON.Mesh.CreatePlane('annotationTextGround', 1, this.babylonService.getScene());
    // BABYLON.Tags.AddTagsTo(this.annotationTextGround, 'control');
    this.annotationTextGround.material = new BABYLON.StandardMaterial('contentMat', this.babylonService.getScene());
    this.annotationTextGround.material.alpha = 1;
    this.annotationTextGround.renderingGroupId = 1;
    this.annotationTextGround.parent = this.babylonService.getScene().activeCamera;
    this.annotationTextGround.position.x = this.posXtextfield;
    this.annotationTextGround.position.y = this.posYtextfield;
    this.annotationTextGround.position.z = this.posZtextfield;
    this.annotationTextGround.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    // this.annotationTextGround.parent = this.cameraWrapper;

    const rect1 = new BABYLON.GUI.Rectangle();
    rect1.cornerRadius = 45;
    rect1.thickness = 10;
    rect1.background = 'gray';
    rect1.alpha = 0.5;

    BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(this.annotationTextGround, 1024, 512).addControl(rect1);

    this.annotationTextField = new BABYLON.GUI.TextBlock();
    this.annotationTextField.text = 'Look around to start the annotation tour.';
    this.annotationTextField.fontFamily = 'Lucida Console';
    this.annotationTextField.fontSize = '50';
    rect1.addControl(this.annotationTextField);
  }

  public deleteVRElements() {
    /*
        this.babylonService.getScene().getMeshesByTags('control').forEach(function (value) {
          value.dispose();
        });*/
    this.controlPrevious.dispose();
    this.controlNext.dispose();
    this.annotationTextGround.dispose();
  }

  private moveVRcontrols() {

  }

  public initializeControls() {

    this.babylonService.getScene().registerBeforeRender(function () {
      // this.cameraWrapper.position = this.cameraService.getActualVRCameraPosAnnotation();
      // this.cameraWrapper.rotation = camera.rotation;

      if (this.selectingControlPrevious && !this.selectedControlPrevious) {
        this.controlPrevious.scaling.width += 0.005;
        this.controlPrevious.scaling.height += 0.005;

        if (this.controlPrevious.scaling.width >= 1.2) {
          this.selectedControlPrevious = true;
          this.previousAnnotation();
        }
      }
      if (this.selectedControlPrevious) {
        this.controlPrevious.material.diffuseColor = BABYLON.Color3.Red();
      }
      if (this.selectingControlNext && !this.selectedControlNext) {
        this.controlNext.scaling.width += 0.005;
        this.controlNext.scaling.height += 0.005;

        if (this.controlNext.scaling.width >= 1.2) {
          this.selectedControlNext = true;
          this.nextAnnotation();
        }
      }
      if (this.selectedControlNext) {
        this.controlNext.material.diffuseColor = BABYLON.Color3.Red();
      }
    });

    this.babylonService.getVRHelper().onNewMeshSelected.add(function (mesh) {
      if (mesh.name = 'controlPrevious') {
        this.controlPrevious.material.diffuseColor = BABYLON.Color3.Blue();
        this.selectingControlPrevious = true;
      }
      if (mesh.name = 'controlNext') {
        this.controlNext.material.diffuseColor = BABYLON.Color3.Blue();
        this.selectingControlNext = true;
      } else {
        this.selectingControlPrevious = false;
        this.selectedControlPrevious = false;
        this.selectingControlNext = false;
        this.selectedControlNext = false;

        this.controlPrevious.material.diffuseColor = BABYLON.Color3.White();
        this.controlPrevious.scaling.x = 1;
        this.controlPrevious.scaling.y = 1;
        this.controlPrevious.scaling.z = 1;

        this.controlNext.material.diffuseColor = BABYLON.Color3.White();
        this.controlNext.scaling.x = 1;
        this.controlNext.scaling.y = 1;
        this.controlNext.scaling.z = 1;
      }
    });
  }


  private previousAnnotation() {

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

  private nextAnnotation() {

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
      this.annotationTextField.text = this.annotationService.annotations[index].title;

      const cameraVector = new BABYLON.Vector3(this.annotationService.annotations[index].cameraPosition[0].value,
        this.annotationService.annotations[index].cameraPosition[1].value,
        this.annotationService.annotations[index].cameraPosition[2].value);
      this.cameraService.moveVRCameraToTarget(cameraVector);
      this.moveVRcontrols();
    } else {
      this.actualRanking = 0;
    }
  }

}
