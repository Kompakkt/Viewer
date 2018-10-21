import {Component, OnInit} from '@angular/core';
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
