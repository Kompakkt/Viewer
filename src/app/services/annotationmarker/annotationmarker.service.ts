import {Injectable} from '@angular/core';
import * as BABYLON from 'babylonjs';
import * as GUI from 'babylonjs-gui';
import {Annotation} from '../../interfaces/annotation/annotation';
import {BabylonService} from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root'
})
export class AnnotationmarkerService {

  constructor(private babylonService: BabylonService) {
  }

  // Ein und Ausblenden des Markers
  // Zahl verändern/ aktualisieren
  // Position tracken?

  public createAnnotationMarker(annotation) {

    const positionVector = new BABYLON.Vector3(annotation.referencePoint[0].value,
      annotation.referencePoint[1].value, annotation.referencePoint[2].value);
    const normalVector = new BABYLON.Vector3(annotation.referencePointNormal[0].value,
      annotation.referencePointNormal[1].value, annotation.referencePointNormal[2].value);

    // const mesh = this.babylonService.getScene().getMeshByName(annotation.relatedModel);

    // two Labels: one is for isOccluded true, one for false -> alpha 0.5 for transparancy
    this.createLabel(annotation._id, 1, 0, positionVector, normalVector, annotation.ranking);
    this.createLabel(annotation._id, 0.5, 1, positionVector, normalVector, annotation.ranking);
  }

  private createLabel(name: string, alpha: number, renderingGroup: number,
                      position: BABYLON.Vector3, normal: BABYLON.Vector3, ranking: string) {

    const planeID = name + '_pick';
    const height = 1;
    const width = 1;

    const plane = BABYLON.MeshBuilder.CreatePlane(planeID,
      {height: height, width: width}, this.babylonService.getScene());
    BABYLON.Tags.AddTagsTo(plane, name);
    plane.position = position;
    plane.translate(normal, 1, BABYLON.Space.WORLD);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

    const labelID = name;

    const label = new GUI.Ellipse(labelID);
    label.width = '100%';
    label.height = '100%';
    label.color = 'White';
    label.thickness = 1;
    label.background = 'black';
    label.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

    const that = this;
    const id = '5';

    label.onPointerDownObservable.add(function () {
      that.onMarkerClicked(id);
    });

    GUI.AdvancedDynamicTexture.CreateForMesh(plane).addControl(label);

    label.addControl(this.setRankingNumber(name, ranking));

    plane.material.alpha = alpha;
    // TODO: click is not working if renderingGroup == 1 and Object is behind another object
    plane.renderingGroupId = renderingGroup;
  }

  private onMarkerClicked(id) {
    console.log(id);
  }

  public setRankingNumber(annotationID: string, rankingNumber: string) {
    const number = new GUI.TextBlock();
    number.text = rankingNumber;
    number.color = 'white';
    number.fontSize = 1000;
    BABYLON.Tags.AddTagsTo(number, annotationID);

    return number;
    // setVisible
    // updateText
    // const label = this.babylonService.getScene().getMeshesByTags(annotationID && 'number');

  }

  public visabilityMarker(annotationID: string, visability: boolean) {
    const marker = this.babylonService.getScene().getMeshesByTags(annotationID);
    marker.forEach(function (value) {
      value.isVisible = visability;
    });
  }

  public deleteMarker(annotationID: string) {
    const marker = this.babylonService.getScene().getMeshesByTags(annotationID);
    console.log(annotationID);
    console.log(this.babylonService.getScene().getMeshesByTags(annotationID));
    console.log(marker);
    marker.forEach(function (value) {
      value.dispose();
    });
  }

}
