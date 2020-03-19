import { Injectable } from '@angular/core';
import { Mesh, MeshBuilder, Space, Tags, Vector3 } from 'babylonjs';
import {
  AdvancedDynamicTexture,
  Control,
  Ellipse,
  TextBlock,
} from 'babylonjs-gui';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
// 11/02/19

import { IAnnotation } from '@kompakkt/shared';
import { BabylonService } from '../babylon/babylon.service';

@Injectable({
  providedIn: 'root',
})
export class AnnotationmarkerService {
  private selectedAnnotation: BehaviorSubject<string> = new BehaviorSubject('');
  public isSelectedAnnotation = this.selectedAnnotation.asObservable();

  constructor(private babylonService: BabylonService) {}

  public createAnnotationMarker(annotation: IAnnotation, color: string) {
    // 11/02/19
    const positionVector = new Vector3(
      annotation.target.selector.referencePoint.x,
      annotation.target.selector.referencePoint.y,
      annotation.target.selector.referencePoint.z,
    );
    const normalVector = new Vector3(
      annotation.target.selector.referenceNormal.x,
      annotation.target.selector.referenceNormal.y,
      annotation.target.selector.referenceNormal.z,
    );
    const camera = annotation.body.content.relatedPerspective;
    // const positionVector = new Vector3(annotation.referencePoint[0].value,
    //   annotation.referencePoint[1].value, annotation.referencePoint[2].value);
    // const normalVector = new Vector3(annotation.referencePointNormal[0].value,
    //   annotation.referencePointNormal[1].value, annotation.referencePointNormal[2].value);
    // const cameraVector = new Vector3(annotation.cameraPosition[0].value,
    //   annotation.cameraPosition[1].value, annotation.cameraPosition[2].value);

    // two Labels: one is for isOccluded true, one for false -> alpha 0.5 for transparancy

    const _id = annotation._id.toString();

    const plane1 = this.createPlane(
      _id + '_pick',
      1,
      1,
      _id,
      positionVector,
      normalVector,
    );
    const label1 = this.createClickLabel(
      _id,
      '100%',
      '100%',
      _id,
      'White',
      color,
      camera,
    );

    AdvancedDynamicTexture.CreateForMesh(plane1).addControl(label1);
    label1.addControl(this.createRankingNumber(_id, annotation.ranking));
    if (plane1.material) {
      plane1.material.alpha = 1;
    }
    plane1.renderingGroupId = 2;

    const plane2 = this.createPlane(
      _id + '_pick',
      1,
      1,
      _id,
      positionVector,
      normalVector,
    );
    const label2 = this.createClickLabel(
      _id,
      '100%',
      '100%',
      _id,
      'White',
      color,
      camera,
    );

    AdvancedDynamicTexture.CreateForMesh(plane2).addControl(label2);
    label2.addControl(this.createRankingNumber(_id, annotation.ranking));

    if (plane2.material) {
      plane2.material.alpha = 0.5;
    }
    // TODO: click is not working if renderingGroup == 1 and Entity is behind another entity
    plane2.renderingGroupId = 3;
  }

  private createPlane(
    name: string,
    height: number,
    width: number,
    tag: string,
    position: Vector3,
    normal: Vector3,
  ) {
    const plane = MeshBuilder.CreatePlane(
      name,
      { height, width },
      this.babylonService.getScene(),
    );
    Tags.AddTagsTo(plane, tag + ' plane');
    plane.position = position;
    plane.translate(normal, 0.5, Space.WORLD);
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    return plane;
  }

  private createClickLabel(
    name: string,
    height: string,
    width: string,
    tag: string,
    color: string,
    backgroundColor: string,
    camera: any,
  ) {
    const label = new Ellipse(name);
    label.width = width;
    label.height = height;
    label.color = color;
    label.thickness = 1;
    label.background = backgroundColor;
    label.adaptHeightToChildren = true;
    label.adaptWidthToChildren = true;

    label.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    Tags.AddTagsTo(label, tag + ' label');

    label.onPointerDownObservable.add(() => {
      this.onMarkerClicked(name, camera);
    });
    return label;
  }

  private onMarkerClicked(id, camera: any) {
    this.selectedAnnotation.next(id);

    const positionVector = new Vector3(
      camera.position.x,
      camera.position.y,
      camera.position.z,
    );
    const targetVector = new Vector3(
      camera.target.x,
      camera.target.y,
      camera.target.z,
    );
    this.babylonService.cameraManager.moveActiveCameraToPosition(
      positionVector,
    );
    this.babylonService.cameraManager.setActiveCameraTarget(targetVector);
  }

  public createRankingNumber(annotationID: string, rankingNumber: number) {
    const number = new TextBlock();
    number.text = rankingNumber.toString();
    number.color = 'white';
    number.fontSize = '50%';
    Tags.AddTagsTo(number, annotationID + ' number');

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
    marker.forEach(value => {
      value.dispose();
    });
  }

  public async deleteAllMarker() {
    await this.babylonService
      .getScene()
      .getMeshesByTags('label')
      .map(mesh => mesh.dispose());
    await this.babylonService
      .getScene()
      .getMeshesByTags('plane')
      .map(mesh => mesh.dispose());
  }

  public async hideAllMarker(visibility: boolean) {
    this.babylonService.hideMesh('label', visibility);
    this.babylonService.hideMesh('plane', visibility);
  }
}
