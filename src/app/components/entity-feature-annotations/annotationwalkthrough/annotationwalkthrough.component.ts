import { AsyncPipe } from '@angular/common';
import { Component, HostBinding, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
import { BehaviorSubject, combineLatest, firstValueFrom, map } from 'rxjs';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AnnotationService } from '../../../services/annotation/annotation.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
  imports: [MatIcon, AsyncPipe, TranslatePipe, TooltipDirective, ButtonComponent],
})
export class AnnotationwalkthroughComponent {
  public annotationService = inject(AnnotationService);
  #isRepositioning = toObservable(this.annotationService.isRepositioning);

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
    map(annotation =>
      annotation ? annotation.body.content.title || 'No title' : 'Annotation Walkthrough',
    ),
  );
  public showWalkthrough$ = combineLatest([
    this.annotationService.currentAnnotations$,
    this.#isRepositioning,
  ]).pipe(map(([annotations, isRepositioning]) => annotations.length > 1 && !isRepositioning));

  public showWalkthrough = toSignal(this.showWalkthrough$);

  @HostBinding('class.hidden') get hidden() {
    return !this.showWalkthrough();
  }

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
