import {Component, Input, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';

import {DataService} from '../../services/data/data.service';
import {AnnotationService} from '../../services/annotation/annotation.service';
import {BabylonService} from '../../services/babylon/babylon.service';

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
  public _id = '';
  public preview = '';

  constructor(private dataService: DataService, private annotationService: AnnotationService, private babylonService: BabylonService
  ) {
  }


  ngOnInit() {
    this.preview = this.annotation.preview;
    this._id = this.annotation._id;
  }

  public getValidation(validated) {
    if (validated) {
      return 'validated';
    } else {
      return 'unvalidated';
    }
  }

  public selectPerspective() {
    this.babylonService.createPreviewScreenshot(220).then(detailScreenshot => {
      this.preview = detailScreenshot;
    });
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
      this.save();
    } else {
      this.collapsed = false;
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'view';
    }
  }

  private save(): void {
    console.log(this._id + ' hat den titel ' + this.annotation.title);
    this.dataService.updateAnnotation(this._id, this.annotation.title, this.annotation.description, this.preview);
  }


}


