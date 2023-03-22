import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AnnotationComponent } from './annotation.component';

@Component({
  selector: 'app-annotation-for-editor',
  templateUrl: './annotation-for-editor.component.html',
  styleUrls: ['./annotation-for-editor.component.scss'],
})
export class AnnotationComponentForEditorComponent extends AnnotationComponent {
  public async toggleVisibility() {
    const [{ _id }, showAnnotation, isSelectedAnnotation] = await Promise.all([
      firstValueFrom(this.annotation$),
      firstValueFrom(this.showAnnotation$),
      firstValueFrom(this.isSelectedAnnotation$),
    ]);

    this.showAnnotation$.next(!showAnnotation);
    this.annotationService.setSelectedAnnotation(isSelectedAnnotation ? '' : _id.toString());
    this.babylon.hideMesh(_id.toString(), showAnnotation);
  }

  // TODO: set perspective in annotation Service and make it not async and public and save!
  public async selectPerspective() {
    const annotation = await firstValueFrom(this.annotation$);
    await this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      const camera = this.babylon.getActiveCamera();
      if (!camera) {
        console.error('AnnotationComponentForEditorComponent cannot get ActiveCamera', this);
        throw new Error('AnnotationComponentForEditorComponent cannot get ActiveCamera');
      }

      annotation.body.content.relatedPerspective = {
        ...this.babylon.cameraManager.getInitialPosition(),
        preview: detailScreenshot,
      };

      this.annotationService.updateAnnotation(annotation);
    });
  }

  public async changeOpenPopup() {
    const [{ _id }, isEditMode, isCollapsed, isSelectedAnnotation] = await Promise.all([
      firstValueFrom(this.annotation$),
      firstValueFrom(this.isEditMode$),
      firstValueFrom(this.collapsed$),
      firstValueFrom(this.isSelectedAnnotation$),
    ]);

    if (!isEditMode) this.collapsed$.next(!isCollapsed);
    this.annotationService.setSelectedAnnotation(
      isCollapsed && isSelectedAnnotation ? '' : _id.toString(),
    );
    this.babylon.hideMesh(_id.toString(), true);
    this.showAnnotation$.next(true);
  }

  public handleEditModeChange() {
    // empty handler to overwrite parent handler
    // otherwise we would send multiple write requests per annotation
  }
}
