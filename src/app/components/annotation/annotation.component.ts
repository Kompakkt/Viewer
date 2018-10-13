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
    model: 'example',
    id: 1,
    sequence: 1,
    positionx: 1,
    positiony: 1,
    babylonVectorx: 1,
    babylonVectory: 1,
    babylonVectorz: 1,
    validated: true,
    title: 'Interesting Annotation',
    description: 'Here you can write interesting or uninteresting things about your annotation.',
    person: 'x',
    date: 1,
    preview: './assets/exampleDataAnnotations/images/anno1.png'

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
