import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent, TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { AnnotationService } from '../../../services/annotation/annotation.service';
import { OverlayService } from '../../../services/overlay/overlay.service';

@Component({
  selector: 'app-annotationwalkthrough',
  templateUrl: './annotationwalkthrough.component.html',
  styleUrls: ['./annotationwalkthrough.component.scss'],
  imports: [MatIconModule, TranslatePipe, TooltipDirective, ButtonComponent],
  host: {
    '[class.hidden]': '!showWalkthrough()',
    '[class.is-resizing]': 'isResizing()',
  },
})
export class AnnotationwalkthroughComponent {
  annotationService = inject(AnnotationService);
  #overlay = inject(OverlayService);

  isResizing = computed(() => this.#overlay.panelResizing());

  ranking = signal(0);
  selectedAnnotation = computed(() => {
    const activeAnnotations = this.annotationService.activeAnnotations();
    const selectedAnnotationId = this.annotationService.selectedAnnotation()?._id;
    return activeAnnotations.find(({ _id }) => _id === selectedAnnotationId);
  });
  title = computed(() => {
    const annotation = this.selectedAnnotation();
    return annotation ? annotation.body.content.title || 'No title' : 'Annotation Walkthrough';
  });

  showWalkthrough = computed(() => {
    const isRepositioning = this.annotationService.isRepositioning();
    const activeAnnotations = this.annotationService.activeAnnotations();
    return activeAnnotations.length > 1 && !isRepositioning;
  });

  previousAnnotation() {
    const ranking = this.ranking();
    const activeAnnotations = this.annotationService.activeAnnotations();
    const isFirst = ranking <= 0;
    const newRanking = isFirst ? activeAnnotations.length - 1 : ranking - 1;
    this.ranking.set(newRanking);
    this.annotationService.setSelectedAnnotation(activeAnnotations[newRanking]._id.toString());
  }

  async nextAnnotation() {
    const ranking = this.ranking();
    const activeAnnotations = this.annotationService.activeAnnotations();
    const isLast = ranking === activeAnnotations.length - 1;
    const newRanking = isLast ? 0 : ranking + 1;
    this.ranking.set(newRanking);
    this.annotationService.setSelectedAnnotation(activeAnnotations[newRanking]._id.toString());
  }
}
