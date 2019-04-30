import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Observable} from 'rxjs/internal/Observable';
// 11/02/19

import {IAnnotation} from '../../interfaces/interfaces';
import {BabylonService} from '../babylon/babylon.service';
import {CameraService} from '../camera/camera.service';

@Injectable({
  providedIn: 'root',
})
export class AnnotationmarkerService {

  private selectedAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();

  constructor(private babylonService: BabylonService,
              private cameraService: CameraService) {

  }

  public createAnnotationMarker(annotation: IAnnotation, color: string) {

    // 11/02/19
    const positionVector = new BABYLON.Vector3(
      annotation.target.selector.referencePoint.x,
      annotation.target.selector.referencePoint.y,
      annotation.target.selector.referencePoint.z);
    const normalVector = new BABYLON.Vector3(
      annotation.target.selector.referenceNormal.x,
      annotation.target.selector.referenceNormal.y,
      annotation.target.selector.referenceNormal.z);
    const camera = annotation.body.content.relatedPerspective;
    // const positionVector = new BABYLON.Vector3(annotation.referencePoint[0].value,
    //   annotation.referencePoint[1].value, annotation.referencePoint[2].value);
    // const normalVector = new BABYLON.Vector3(annotation.referencePointNormal[0].value,
    //   annotation.referencePointNormal[1].value, annotation.referencePointNormal[2].value);
    // const cameraVector = new BABYLON.Vector3(annotation.cameraPosition[0].value,
    //   annotation.cameraPosition[1].value, annotation.cameraPosition[2].value);

    // two Labels: one is for isOccluded true, one for false -> alpha 0.5 for transparancy

    const plane1 = this.createPlane(annotation._id + '_pick', 1, 1, annotation._id, positionVector, normalVector);
    const label1 = this.createClickLabel(annotation._id, '100%', '100%', annotation._id, 'White', color, camera);

    GUI.AdvancedDynamicTexture.CreateForMesh(plane1).addControl(label1);
    label1.addControl(this.createRankingNumber(annotation._id, annotation.ranking));
    if (plane1.material) {
      plane1.material.alpha = 1;
    }
    plane1.renderingGroupId = 0;

    const plane2 = this.createPlane(annotation._id + '_pick', 1, 1, annotation._id, positionVector, normalVector);
    const label2 = this.createClickLabel(annotation._id, '100%', '100%', annotation._id, 'White', color, camera);

    GUI.AdvancedDynamicTexture.CreateForMesh(plane2).addControl(label2);
    label2.addControl(this.createRankingNumber(annotation._id, annotation.ranking));
    if (plane2.material) {
      plane2.material.alpha = 0.5;
    }
    // TODO: click is not working if renderingGroup == 1 and Object is behind another object
    plane2.renderingGroupId = 1;
  }

  private createPlane(name: string, height: number, width: number, tag: string, position: BABYLON.Vector3, normal: BABYLON.Vector3) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name,
                                                  {height, width}, this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(plane, tag + ' plane');
    plane.position = position;
    plane.translate(normal, 0.5, BABYLON.Space.WORLD);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    return plane;
  }

  private createClickLabel(name: string, height: string, width: string, tag: string, color: string,
                           backgroundColor: string, camera: any) {

    const label = new GUI.Ellipse(name);
    label.width = width;
    label.height = height;
    label.color = color;
    label.thickness = 1;
    label.background = backgroundColor;

    label.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    BABYLON.Tags.AddTagsTo(label, tag + ' label');

    label.onPointerDownObservable.add(() => {
      this.onMarkerClicked(name, camera);
    });
    return label;

  }

  private onMarkerClicked(id, camera: any) {
    this.selectedAnnotation.next(id);

    const positionVector = new BABYLON.Vector3(camera.position.x, camera.position.y, camera.position.z);
    const targetVector = new BABYLON.Vector3(camera.target.x, camera.target.y, camera.target.z);
    this.cameraService.moveCameraToTarget(positionVector);
    this.cameraService.arcRotateCamera.setTarget(targetVector);

  }

  public createRankingNumber(annotationID: string, rankingNumber: number) {
    const number = new GUI.TextBlock();
    number.text = rankingNumber.toString();
    number.color = 'white';
    number.fontSize = 1000;
    BABYLON.Tags.AddTagsTo(number, annotationID + ' number');

    return number;
  }

  public setRankingNumber() {

    // need to redraw -> delete and create
    // http://playground.babylonjs.com/#HETZDX#4
    /*
    const label = this.babylonService.getScene().getMeshesByTags(annotationID && 'plane');
    label.forEach(function (value) {
      label.updateText(rankingNumber);
    });*/
  }

  public deleteMarker(annotationID: string) {
    const marker = this.babylonService.getScene().getMeshesByTags(annotationID);
    marker.forEach(function(value) {
      value.dispose();
    });
  }

  public async deleteAllMarker() {
    await this.babylonService.getScene().getMeshesByTags('label').map(mesh => mesh.dispose());
    await this.babylonService.getScene().getMeshesByTags('plane').map(mesh => mesh.dispose());
  }

  public async hideAllMarker(visibility: boolean) {
    this.babylonService.hideMesh('label', visibility);
    this.babylonService.hideMesh('plane', visibility);
  }
}
