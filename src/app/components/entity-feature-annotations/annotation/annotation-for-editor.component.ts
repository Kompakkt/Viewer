import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatCard,
  MatCardActions,
  MatCardAvatar,
  MatCardContent,
  MatCardHeader,
  MatCardImage,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { ButtonComponent, ButtonRowComponent, SlideToggleComponent, TooltipDirective } from 'projects/komponents/src';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';
import { AnnotationComponent } from './annotation.component';

@Component({
  selector: 'app-annotation-for-editor',
  templateUrl: './annotation-for-editor.component.html',
  styleUrls: ['./annotation-for-editor.component.scss'],
  standalone: true,
  imports: [
    MatCard,
    FormsModule,
    MatCardHeader,
    MatCardAvatar,
    MatCardTitle,
    MatCardSubtitle,
    MatCardImage,
    MatCardContent,
    CdkTextareaAutosize,
    MatIcon,
    MarkdownPreviewComponent,
    MatCardActions,
    AsyncPipe,
    UpperCasePipe,
    TranslatePipe,
    SlideToggleComponent,
    ButtonComponent,
    ButtonRowComponent,
    TooltipDirective,
    FixImageUrlPipe,
  ],
})
export class AnnotationComponentForEditorComponent extends AnnotationComponent {
  public async toggleVisibility() {
    console.log('Toggling')
    const [{ _id }, showAnnotation, isSelectedAnnotation] = await Promise.all([
      firstValueFrom(this.annotation$),
      firstValueFrom(this.showAnnotation$),
      firstValueFrom(this.isSelectedAnnotation$),
    ]);
    console.log({ _id, showAnnotation, isSelectedAnnotation });

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
