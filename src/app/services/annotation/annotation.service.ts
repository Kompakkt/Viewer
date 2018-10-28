import {Injectable} from '@angular/core';
import {Annotation} from 'src/app/interfaces/annotation/annotation';
import {DataService} from '../data/data.service';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';

/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root'
})

export class AnnotationService {

  public annotations: Annotation[];
  private unsortedAnnotations: Annotation[];


  constructor(private babylonService: BabylonService,
              private dataService: DataService,
              private actionService: ActionService,
              private annotationmarkerService: AnnotationmarkerService) {

    this.annotations = this.fetchData();

  }

  public initializeAnnotationMode(modelName: string) {
    this.actionService.createActionManager(modelName, BABYLON.ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));

    this.unsortedAnnotations = this.annotations.slice(0);
    this.annotations.splice(0, this.annotations.length);
    this.annotations = this.unsortedAnnotations.slice(0);

    this.annotations.sort((leftSide, rightSide): number => {
      if (+leftSide.ranking < +rightSide.ranking) {
        return -1;
      }
      if (+leftSide.ranking > +rightSide.ranking) {
        return 1;
      }
      return 0;
    });
  }

  public createNewAnnotation = function (result: any) {
    this.babylonService.createPreviewScreenshot(220).then(detailScreenshot => {
      const newAnnotation: Annotation = {
        _id: Math.random().toString(36).substr(2, 9),
        relatedModel: result.pickedMesh.name,
        ranking: String(this.annotations.length + 1),
        referencePoint: [{dimension: 'x', value: result.pickedPoint.x}, {dimension: 'y', value: result.pickedPoint.y}, {
          dimension: 'z', value: result.pickedPoint.z
        }],
        referencePointNormal: [{dimension: 'x', value: result.getNormal(true, true).x},
          {dimension: 'y', value: result.getNormal(true, true).y}, {
            dimension: 'z', value: result.getNormal(true, true).z
          }],
        cameraPosition: [{dimension: 'x', value: this.babylonService.getScene().activeCamera.alpha},
          {dimension: 'y', value: this.babylonService.getScene().activeCamera.beta},
          {dimension: 'z', value: this.babylonService.getScene().activeCamera.radius}],
        preview: detailScreenshot,
        originatorID: 'userID',
        validated: false,
        title: '',
        description: '',
        date: new Date().toISOString()
      };
      this.add(newAnnotation);
      this.annotationmarkerService.createAnnotationMarker(newAnnotation);
    });
  };

  private add(annotation): void {
    this.dataService.database.put(annotation);
    this.annotations.push(annotation);
  }

  private fetchData(): Array<any> {
    const annotationList: Array<any> = [];

    this.dataService.fetch().then(result => {
      for (let i = 0; i < result.rows.length; i++) {
        this.annotationmarkerService.createAnnotationMarker(result.rows[i].doc);
        annotationList.push(result.rows[i].doc);
        console.log(result.rows[i].doc);
      }
    }, error => {
      console.error(error);
    });

    return annotationList;
  }

  public deleteAnnotation(annotation: Annotation) {
    this.annotationmarkerService.deleteMarker(annotation._id);
    this.dataService.delete(annotation._id, annotation._rev);
    const index: number = this.annotations.indexOf(annotation);
    if (index !== -1) {
      this.annotations.splice(index, 1);
    }
  }

  public changedRankingPositions() {

    for (let _i = 0; _i < this.annotations.length; _i++) {
      console.log(this.annotations[_i]);
      this.annotations[_i].ranking = String(_i + 1);
      console.log(this.annotations[_i]);
      this.annotationmarkerService.deleteMarker(this.annotations[_i]._id);
      this.annotationmarkerService.createAnnotationMarker(this.annotations[_i]);
      this.dataService.updateAnnotationRanking(this.annotations[_i]._id, this.annotations[_i].ranking);
    }

  }

}
