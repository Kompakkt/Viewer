import {Component, Inject, Input, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';

import {DataService} from '../../services/data/data.service';
import {AnnotationService} from '../../services/annotation/annotation.service';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.css']
})
export class AnnotationsEditorComponent implements OnInit {

  @Input() annotation: Annotation;


  public collapsed = true;
  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'edit';

  constructor(private dataservice: DataService, private annotationService: AnnotationService
  ) {
  }


  ngOnInit() {
  }

  public getValidation(validated) {
    if (validated) {
      return 'validated';
    } else {
      return 'unvalidated';
    }
  }


  public selectPerspective() {
  }

  public deleteAnnotation(): void {
    this.annotationService.deleteAnnotation(this.annotation);
  }

  public toggleEditViewMode() {
    console.log('toggle Function');

    if (this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'edit';
    } else {
      this.collapsed = false;
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    }
  }


}


