import {AfterViewInit, Component, Input, OnInit, QueryList, ViewChildren} from '@angular/core';
import {int} from 'babylonjs';

import {AnnotationService} from '../../services/annotation/annotation.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {AnnotationComponent} from '../annotations/annotation/annotation.component';

@Component({
  selector: 'app-annotationcards',
  templateUrl: './annotationcards.component.html',
  styleUrls: ['./annotationcards.component.scss'],
})
export class AnnotationcardsComponent implements OnInit {

  @ViewChildren(AnnotationComponent)
  annotationsList: QueryList<AnnotationComponent>;

  constructor(public annotationService: AnnotationService) {
  }

  ngOnInit() {
  }

}
