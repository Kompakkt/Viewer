import { Component } from '@angular/core';

import { AnnotationComponent } from './annotation.component';

@Component({
  selector: 'app-annotation-for-editor',
  templateUrl: './annotation-for-editor.component.html',
  styleUrls: ['./annotation-for-editor.component.scss'],
})
export class AnnotationComponentForEditorComponent extends AnnotationComponent {
  toggleVisibility() {
    if (!this.annotation) {
      console.error('AnnotationComponentForEditorComponent without Annotation', this);
      throw new Error('AnnotationComponentForEditorComponent without Annotation');
    }
    if (this.showAnnotation) {
      this.showAnnotation = false;
      if (this.selectedAnnotation === this.annotation._id) {
        this.annotationService.setSelectedAnnotation('');
      }
      this.babylon.hideMesh(this.annotation._id.toString(), false);
    } else {
      this.showAnnotation = true;
      this.annotationService.setSelectedAnnotation(this.annotation._id.toString());
      this.babylon.hideMesh(this.annotation._id.toString(), true);
    }
  }

  // TODO set perspective in annotation Service and make it not async and public and save!
  public async selectPerspective() {
    await this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      if (!this.annotation) {
        console.error('AnnotationComponentForEditorComponent without Annotation', this);
        throw new Error('AnnotationComponentForEditorComponent without Annotation');
      }
      const camera = this.babylon.getActiveCamera();
      if (!camera) {
        console.error('AnnotationComponentForEditorComponent cannot get ActiveCamera', this);
        throw new Error('AnnotationComponentForEditorComponent cannot get ActiveCamera');
      }

      this.annotation.body.content.relatedPerspective = {
        ...this.babylon.cameraManager.getInitialPosition(),
        preview: detailScreenshot,
      };

      this.annotationService.updateAnnotation(this.annotation);
    });
  }

  public changeOpenPopup() {
    if (!this.annotation) {
      console.error('AnnotationComponentForEditorComponent without Annotation', this);
      throw new Error('AnnotationComponentForEditorComponent without Annotation');
    }
    if (!this.isEditMode) {
      this.collapsed = !this.collapsed;
    }
    this.collapsed && this.selectedAnnotation === this.annotation._id
      ? this.annotationService.setSelectedAnnotation('')
      : this.annotationService.setSelectedAnnotation(this.annotation._id.toString());
    this.babylon.hideMesh(this.annotation._id.toString(), true);
    this.showAnnotation = true;
  }

  public handleEditModeChange() {
    // empty handler to overwrite parent handler
    // otherwise we would send multiple write requests per annotation
  }
}
