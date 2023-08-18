import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, firstValueFrom, map } from 'rxjs';
import { AnnotationService } from '../../../services/annotation/annotation.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
})
export class AnnotationwalkthroughComponent {
  public ranking$ = new BehaviorSubject(-1);
  public selectedAnnotation$ = combineLatest([
    this.annotationService.currentAnnotations$,
    this.annotationService.selectedAnnotation$,
  ]).pipe(
    map(([annotations, selectedAnnotationId]) =>
      annotations.find(({ _id }) => _id === selectedAnnotationId),
    ),
  );

  public title$ = this.selectedAnnotation$.pipe(
    map(annotation => annotation?.body.content.title ?? 'Annotation Walkthrough'),
  );
  public showWalkthrough$ = this.annotationService.currentAnnotations$.pipe(
    map(annotations => annotations.length > 1),
  );

  constructor(public annotationService: AnnotationService) {}

  public async previousAnnotation() {
    const [ranking, annotations] = await Promise.all([
      firstValueFrom(this.ranking$),
      firstValueFrom(this.annotationService.currentAnnotations$),
    ]);
    const isFirst = ranking === 0;
    const newRanking = isFirst ? annotations.length - 1 : ranking - 1;
    this.ranking$.next(newRanking);
    this.annotationService.setSelectedAnnotation(annotations[newRanking]._id.toString());
  }

  public async nextAnnotation() {
    const [ranking, annotations] = await Promise.all([
      firstValueFrom(this.ranking$),
      firstValueFrom(this.annotationService.currentAnnotations$),
    ]);
    const isLast = ranking === annotations.length - 1;
    const newRanking = isLast ? 0 : ranking + 1;
    this.ranking$.next(newRanking);
    this.annotationService.setSelectedAnnotation(annotations[newRanking]._id.toString());
  }
}
