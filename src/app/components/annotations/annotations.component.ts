import {Component, Inject, OnInit} from '@angular/core';
import {Annotation} from '../../interfaces/annotation/annotation';

import {CameraService} from '../../services/camera/camera.service';

@Component({
  selector: 'app-annotations',
  templateUrl: './annotations.component.html',
  styleUrls: ['./annotations.component.css']
})
export class AnnotationsComponent implements OnInit {

  private collapsed = false;

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


