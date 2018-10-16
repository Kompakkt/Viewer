import {Component, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';
import {AnnotationService} from '../../services/annotation/annotation.service';

@Component({
  selector: 'app-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.css']
})

export class AnnotationComponent implements OnInit {

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'edit';

  annotation: Annotation = {
    _id: 'sdfsdf',
    relatedModel: 'example',
    ranking: 1,
    referencePoint: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
    cameraPosition: [{dimension: 'x', value: 1}, {dimension: 'y', value: 1}, {dimension: 'z', value: 1}],
    preview: './assets/exampleDataAnnotations/images/anno1.png',
    originatorID: 'x',
    validated: true,
    title: 'Interesting Annotation',
    description: 'Here you can write interesting',
    date: 'sometime'
  };

  constructor(public annotationService: AnnotationService) {

  }

  private closeAnnotation() {
    this.annotationService.hideAnnotation();
  }

  public getValidation(validated) {
    if (validated) {
      return 'validated';
    } else {
      return 'unvalidated';
    }
  }

  public deleteAnnotation() {
  }

  public toggleEditViewMode() {
    if (this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
    } else {
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    }
  }

  ngOnInit() {
  }

}
