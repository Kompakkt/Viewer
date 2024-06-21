import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { AsyncPipe, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
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
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { ButtonComponent, ButtonRowComponent, SlideToggleComponent, TooltipDirective } from 'projects/komponents/src';
import { FallbackImageDirective } from 'src/app/directives/fallback-image.directive';
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
    MatFormField,
    MatInput,
    MatLabel,
    MatCardSubtitle,
    MatCardImage,
    MatCardContent,
    CdkTextareaAutosize,
    MatCheckbox,
    MatIconButton,
    MatButton,
    MatTooltip,
    MatIcon,
    MarkdownPreviewComponent,
    MatCardActions,
    MatSlideToggle,
    AsyncPipe,
    UpperCasePipe,
    TranslatePipe,
    FallbackImageDirective,
    SlideToggleComponent,
    ButtonComponent,
    ButtonRowComponent,
    TooltipDirective,
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
