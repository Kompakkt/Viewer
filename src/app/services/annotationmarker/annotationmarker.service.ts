import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import {BabylonService} from '../babylon/babylon.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';
import {Observable} from 'rxjs/internal/Observable';
import {CameraService} from '../camera/camera.service';
// 11/02/19
import {Annotation} from 'src/app/interfaces/annotation2/annotation2';
// import {Annotation} from '../../interfaces/annotation/annotation';

@Injectable({
  providedIn: 'root'
})
export class AnnotationmarkerService {


  public open_popup = '';
  private isOpen: BehaviorSubject<string> = new BehaviorSubject('');


  public toggleCreatorPopup(id: string) {
    this.open_popup = id;
    this.isOpen.next(this.open_popup);
  }

  popupIsOpen(): Observable<any> {
    return this.isOpen.asObservable();
  }


  constructor(private babylonService: BabylonService, private cameraService: CameraService) {

  }

  // Ein und Ausblenden des Markers
  // Zahl verändern/ aktualisieren

  public createAnnotationMarker(annotation: Annotation) {

    // 11/02/19
    const positionVector = new BABYLON.Vector3(
      annotation.target.selector.referencePoint.x,
      annotation.target.selector.referencePoint.y,
      annotation.target.selector.referencePoint.z);
    const normalVector = new BABYLON.Vector3(
      annotation.target.selector.referenceNormal.x,
      annotation.target.selector.referenceNormal.y,
      annotation.target.selector.referenceNormal.z);
    const cameraVector = new BABYLON.Vector3(
      annotation.body.content.relatedPerspective.vector.x,
      annotation.body.content.relatedPerspective.vector.y,
      annotation.body.content.relatedPerspective.vector.z);
    // const positionVector = new BABYLON.Vector3(annotation.referencePoint[0].value,
    //   annotation.referencePoint[1].value, annotation.referencePoint[2].value);
    // const normalVector = new BABYLON.Vector3(annotation.referencePointNormal[0].value,
    //   annotation.referencePointNormal[1].value, annotation.referencePointNormal[2].value);
    // const cameraVector = new BABYLON.Vector3(annotation.cameraPosition[0].value,
    //   annotation.cameraPosition[1].value, annotation.cameraPosition[2].value);

    // two Labels: one is for isOccluded true, one for false -> alpha 0.5 for transparancy

    const plane1 = this.createPlane(annotation._id + '_pick', 1, 1, annotation._id, positionVector, normalVector);
    const label1 = this.createClickLabel(annotation._id, '100%', '100%', annotation._id, 'White', 'black', cameraVector);

    GUI.AdvancedDynamicTexture.CreateForMesh(plane1).addControl(label1);
    label1.addControl(this.createRankingNumber(annotation._id, annotation.ranking));
    if (plane1.material) plane1.material.alpha = 1;
    plane1.renderingGroupId = 0;

    const plane2 = this.createPlane(annotation._id + '_pick', 1, 1, annotation._id, positionVector, normalVector);
    const label2 = this.createClickLabel(annotation._id, '100%', '100%', annotation._id, 'White', 'black', cameraVector);

    GUI.AdvancedDynamicTexture.CreateForMesh(plane2).addControl(label2);
    label2.addControl(this.createRankingNumber(annotation._id, annotation.ranking));
    if (plane2.material) plane2.material.alpha = 0.5;
    // TODO: click is not working if renderingGroup == 1 and Object is behind another object
    plane2.renderingGroupId = 1;
  }

  private createPlane(name: string, height: number, width: number, tag: string, position: BABYLON.Vector3, normal: BABYLON.Vector3) {
    const plane = BABYLON.MeshBuilder.CreatePlane(name,
      {height: height, width: width}, this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(plane, tag + ' plane');
    plane.position = position;
    plane.translate(normal, 1, BABYLON.Space.WORLD);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    return plane;
  }

  private createClickLabel(name: string, height: string, width: string, tag: string, color: string,
                           backgroundColor: string, cameraVector: BABYLON.Vector3) {

    const label = new GUI.Ellipse(name);
    label.width = width;
    label.height = height;
    label.color = color;
    label.thickness = 1;
    label.background = backgroundColor;
    label.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
    BABYLON.Tags.AddTagsTo(label, tag + ' label');

    label.onPointerDownObservable.add(() => {
      this.onMarkerClicked(name, cameraVector);
    });
    return label;

  }

  private onMarkerClicked(id, cameraVector: BABYLON.Vector3) {
    this.toggleCreatorPopup(id);
    this.cameraService.moveCameraToTarget(cameraVector);
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
    marker.forEach(function (value) {
      value.dispose();
    });
  }

  public async deleteAllMarker() {
    await this.babylonService.getScene().getMeshesByTags('label').map(mesh => mesh.dispose());
    await this.babylonService.getScene().getMeshesByTags('plane').map(mesh => mesh.dispose());
  }

  public redrawAllMarker(annotations: Annotation[]) {
    this.deleteAllMarker();
    annotations.forEach(function (value) {
      this.createAnnotationMarker(value);
    });
  }

  public redrawMarker(annotation: Annotation) {
    this.deleteMarker(annotation._id);
    this.createAnnotationMarker(annotation);
  }

  public async hideAllMarker(visibility: boolean) {
    this.babylonService.hideMesh('label', visibility);
    this.babylonService.hideMesh('plane', visibility);
  }
}
