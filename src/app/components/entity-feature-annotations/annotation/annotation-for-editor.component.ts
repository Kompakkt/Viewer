import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import {
  ButtonComponent,
  ButtonRowComponent,
  TooltipDirective,
  MenuComponent,
  MenuOptionComponent,
} from 'komponents';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';
import { AnnotationComponent } from './annotation.component';

@Component({
  selector: 'app-annotation-for-editor',
  templateUrl: './annotation-for-editor.component.html',
  styleUrls: ['./annotation-for-editor.component.scss'],
  imports: [
    FormsModule,

    MatIcon,
    MarkdownPreviewComponent,
    AsyncPipe,
    TranslatePipe,
    ButtonComponent,
    ButtonRowComponent,
    TooltipDirective,
    FixImageUrlPipe,
    MenuComponent,
    MenuOptionComponent,
  ],
})
export class AnnotationComponentForEditorComponent extends AnnotationComponent {
  public async toggleVisibility() {
    const [{ _id }, showAnnotation, isSelectedAnnotation, isAnnotationHidden] = await Promise.all([
      firstValueFrom(this.annotation$),
      firstValueFrom(this.showAnnotation$),
      firstValueFrom(this.isSelectedAnnotation$),
      firstValueFrom(this.isAnnotationHidden$),
    ]);

    if (isAnnotationHidden) return;

    this.showAnnotation$.next(!showAnnotation);
    this.annotationService.setSelectedAnnotation(isSelectedAnnotation ? '' : _id.toString());
    this.babylon.hideMesh(_id.toString(), showAnnotation);
  }

  public async setVisibility(visible: boolean) {
    const [{ _id }, isSelectedAnnotation] = await Promise.all([
      firstValueFrom(this.annotation$),
      firstValueFrom(this.isSelectedAnnotation$),
    ]);

    if (isSelectedAnnotation) {
      this.annotationService.setSelectedAnnotation(visible ? _id.toString() : '');
    }

    this.annotationService.setAnnotationVisibility(_id.toString(), visible);
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
