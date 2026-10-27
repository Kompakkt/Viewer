import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import {
  ButtonComponent,
  ButtonRowComponent,
  TooltipDirective,
  MenuComponent,
  MenuOptionComponent,
} from '@kompakkt/komponents';
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
    TranslatePipe,
    ButtonComponent,
    ButtonRowComponent,
    TooltipDirective,
    FixImageUrlPipe,
    MenuComponent,
    MenuOptionComponent,
  ],
})
export class AnnotationComponentForEditorComponent extends AnnotationComponent implements OnInit {
  toggleVisibility() {
    const annotation = this.annotation();
    const isSelected = this.isSelected();
    const isHidden = this.isHidden();
    if (isHidden) return;
    this.annotationService.setSelectedAnnotation(isSelected ? '' : annotation._id.toString());
  }

  setVisibility(visible: boolean) {
    const annotation = this.annotation();
    const isSelected = this.isSelected();
    if (isSelected) {
      this.annotationService.setSelectedAnnotation(visible ? annotation._id.toString() : '');
    }

    this.annotationService.setAnnotationVisibility(annotation._id.toString(), visible);
  }

  selectPerspective() {
    const annotation = this.annotation();
    return this.babylon.createPreviewScreenshot().then(detailScreenshot => {
      const camera = this.babylon.getActiveCamera();
      if (!camera) {
        console.error('AnnotationComponentForEditorComponent cannot get ActiveCamera', this);
        throw new Error('AnnotationComponentForEditorComponent cannot get ActiveCamera');
      }

      annotation.body.content.relatedPerspective = {
        ...this.babylon.cameraManager.getInitialPosition(),
        preview: detailScreenshot,
      };

      return this.annotationService.updateAnnotation(annotation);
    });
  }

  async changeOpenPopup() {
    const annotation = this.annotation();
    const isEditMode = this.isEditMode();
    const isCollapsed = this.collapsed();
    const isSelected = this.isSelected();

    if (!isEditMode) this.collapsed.set(!isCollapsed);
    this.annotationService.setSelectedAnnotation(
      isCollapsed && isSelected ? '' : annotation._id.toString(),
    );
  }

  override ngOnInit() {
    // Do nothing
  }
}
