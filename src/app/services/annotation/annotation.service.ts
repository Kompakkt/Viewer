import {Injectable} from '@angular/core';

import {Observable, of} from 'rxjs';
import {Annotation} from 'src/app/interfaces/annotation/annotation';
import {DataService} from '../data/data.service';
import {BabylonService} from '../babylon/babylon.service';
import * as BABYLON from 'babylonjs';
import {ActionService} from '../action/action.service';
import {AnnotationmarkerService} from '../annotationmarker/annotationmarker.service';
import {BehaviorSubject} from 'rxjs/internal/BehaviorSubject';


/**
 * @author Zoe Schubert
 * @author Jan G. Wieners
 */

@Injectable({
  providedIn: 'root'
})

export class AnnotationService {


  public annotations$: Observable<Annotation[]>;

  private numberOfAnnotations: number;

  constructor(private babylonService: BabylonService, private dataService: DataService,
              private actionService: ActionService, private annotationmarkerService: AnnotationmarkerService) {
    this.numberOfAnnotations = 1;
  }

  public initializeAnnotationMode(modelName: string) {
    this.actionService.createActionManager(modelName, BABYLON.ActionManager.OnDoublePickTrigger, this.createNewAnnotation.bind(this));
  }

  private createAnnotationID(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private getInitialRanking(): string {
    // TODO: count all Annotations
    return this.numberOfAnnotations.toString();
  }

  private getAnnotationView() {
    // TODO
    // return cameraposition
  }

  private getOriginatorID(): string {
    const userID = 'userID';
    return userID;
  }

  private getTimestamp(): string {
    // TODO
    const timestamp = Date.now();
    return timestamp.toString();
  }


  public createNewAnnotation = function (result: any) {
    this.babylonService.createPreviewScreenshot(220).then(detailScreenshot => {
      const newAnnotation: Annotation = {
        _id: this.createAnnotationID(),
        relatedModel: result.pickedMesh.name,
        ranking: this.getInitialRanking(),
        referencePoint: [{dimension: 'x', value: result.pickedPoint.x}, {dimension: 'y', value: result.pickedPoint.y}, {
          dimension: 'z', value: result.pickedPoint.z
        }],
        referencePointNormal: [{dimension: 'x', value: result.getNormal(true, true).x},
          {dimension: 'y', value: result.getNormal(true, true).y}, {
            dimension: 'z', value: result.getNormal(true, true).z
          }],
        cameraPosition: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
        preview: detailScreenshot,
        originatorID: this.getOriginatorID(),
        validated: false,
        title: '',
        description: '',
        date: this.getTimestamp()
      };

      this.add(newAnnotation);
      this.annotationmarkerService.createAnnotationMarker(newAnnotation);
    }
  };


  private add(annotation): void {
    this.dataService.database.put(annotation);
    this.annotations$ = this.fetchAnnotations();
  }

  public fetchAnnotations(): Observable<Annotation[]> {
    return of(this.fetchData());
  }

  private fetchData(): Array<any> {
    const annotationList: Array<any> = [];

    this.dataService.fetch().then(result => {
      for (let i = 0; i < result.rows.length; i++) {
        this.numberOfAnnotations = result.rows.length + 1;
        console.log(result.rows.length);
        this.annotationmarkerService.createAnnotationMarker(result.rows[i].doc);
        annotationList.push(result.rows[i].doc);
        console.log(result.rows[i].doc);
      }
    }, error => {
      console.error(error);
    });


    return annotationList;
  }


  deleteAnnotation(annotation: Annotation) {
    this.numberOfAnnotations = this.numberOfAnnotations - 1;
    this.annotationmarkerService.deleteMarker(annotation._id);
    this.dataService.database.remove(annotation._id, annotation._rev, function (error, response) {
      if (error) {
        console.log('removed');
        return console.log(error);
      }
    });
    this.annotations$ = this.fetchAnnotations();
  }

}
