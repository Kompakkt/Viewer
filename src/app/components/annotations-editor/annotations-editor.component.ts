import {Component, Inject, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';

import {CameraService} from '../../services/camera/camera.service';

@Component({
  selector: 'app-annotations-editor',
  templateUrl: './annotations-editor.component.html',
  styleUrls: ['./annotations-editor.component.css']
})
export class AnnotationsEditorComponent implements OnInit {

  public collapsed = true;

  annotation: Annotation = {
    counter: 1,
    id: 1,
    validated: true,
    title: 'Interesting Annotation',
    description: 'Here you can write interesting or uninteresting things about your annotation.'

  };

  constructor(
    private cameraService: CameraService,
  ) {
  }


  ngOnInit() {
  }

  public getValidation(validated) {
    if (validated) {
      return 'validated';
    } else { return 'unvalidated'; }
  }


  public takeScreenshot() {
    this.cameraService.createScreenshot();
  }

}


