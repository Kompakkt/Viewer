import { Component, OnInit } from '@angular/core';
import { IAnnotation } from '~common/interfaces';

import { AnnotationService } from '../../../services/annotation/annotation.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
})
export class AnnotationwalkthroughComponent implements OnInit {
  public title = 'Annotation Walkthrough';
  private ranking = -1;
  public annotations: IAnnotation[] = [];

  constructor(public annotationService: AnnotationService) {}

  ngOnInit() {
    this.annotationService.currentAnnotations.subscribe(currentAnnotations => {
      this.annotations = currentAnnotations;
      this.title = 'Annotation Walkthrough';
      this.ranking = -1;
    });

    this.annotationService.isSelectedAnnotation.subscribe(currentAnnotation => {
      const selectedAnnotation = this.annotations.find(
        (anno: IAnnotation) => anno._id === currentAnnotation,
      );
      if (selectedAnnotation) {
        this.title = selectedAnnotation.body.content.title;
      }
    });
  }

  public previousAnnotation() {
    const isFirst = this.ranking === 0;
    this.ranking = isFirst ? this.annotations.length - 1 : (this.ranking = this.ranking - 1);
    this.annotationService.setSelectedAnnotation(this.annotations[this.ranking]._id.toString());
  }

  public nextAnnotation() {
    const isLast = this.ranking === this.annotations.length - 1;

    this.ranking = isLast ? 0 : this.ranking + 1;
    this.annotationService.setSelectedAnnotation(this.annotations[this.ranking]._id.toString());
  }
}
