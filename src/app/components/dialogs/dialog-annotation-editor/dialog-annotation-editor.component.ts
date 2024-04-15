import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';

import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { IEntity } from 'src/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MediaBrowserComponent } from '../../entity-feature-annotations/annotation-media-browser/media-browser.component';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';

export interface IDialogData {
  title: string;
  content: string;
}

interface IExternalImage {
  description: string;
  url: string;
  mediaType: string;
}

@Component({
  selector: 'app-dialog-annotation-editor',
  templateUrl: './dialog-annotation-editor.component.html',
  styleUrls: ['./dialog-annotation-editor.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatFormField,
    MatInput,
    FormsModule,
    MatDialogContent,
    MarkdownPreviewComponent,
    MediaBrowserComponent,
    CdkTextareaAutosize,
    MatDialogActions,
    MatButton,
    MatIcon,
    MatDialogClose,
    TranslatePipe,
  ],
})
export class DialogAnnotationEditorComponent {
  @ViewChild('annotationContent')
  private annotationContent: ElementRef<HTMLTextAreaElement> | undefined;

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'Edit';

  private serverUrl = environment.server_url;

  constructor(
    public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IDialogData,
  ) {}

  public addEntitySwitch(entity: IEntity | IExternalImage) {
    switch (entity.mediaType) {
      case 'externalImage':
        this.addExternalImage(entity as IExternalImage);
        break;

      case 'video':
      case 'audio':
      case 'image':
      case 'text':
      case 'entity':
      case 'model':
        this.addEntity(entity as IEntity);
        break;
      default:
        console.log(`Unknown media type ${entity.mediaType}`);
    }
  }

  private getCaretPosition() {
    if (!this.annotationContent) return { start: 0, value: '' };
    this.annotationContent.nativeElement.focus();

    return {
      start: this.annotationContent.nativeElement.selectionStart,
      value: this.annotationContent.nativeElement.value,
    };
  }

  private createMarkdown(mdElement: any) {
    const caret = this.getCaretPosition();
    const start = caret.start;
    const value = caret.value;

    return `${value.substring(0, start)}${mdElement}${value.substring(start, value.length)}`;
  }

  private addExternalImage(image: IExternalImage) {
    this.data.content = this.createMarkdown(`![alt ${image.description}](${image.url})`);
  }

  private addEntity(entity: IEntity) {
    const target = `${environment.repo_url}/entity/${entity._id}`;
    let url = '';

    let markdown = '';
    switch (entity.mediaType) {
      case 'video':
        if (!entity.dataSource.isExternal) url += `${this.serverUrl}`;
        markdown += `
        <video class="video" controls poster="">
          <source src="${url}/${entity.processed.medium}" type="video/mp4">
        </video>`;
        break;
      case 'audio':
        if (!entity.dataSource.isExternal) url += `${this.serverUrl}`;
        markdown += `
        <audio controls>
          <source src="${url}${entity.processed.medium}" type="audio/mpeg">
        </audio>`;
        break;
      case 'image':
      case 'text':
      case 'model':
      case 'entity':
      default:
        markdown += `
        <a href="${target}" target="_blank">
          <img src="${environment.server_url + entity.settings.preview}" alt="${entity.name}">
        </a>`;
    }

    this.data.content = this.createMarkdown(markdown);
  }

  public toggleEditViewMode() {
    if (this.editMode) {
      this.editMode = false;
      this.labelMode = 'edit';
      this.labelModeText = 'Edit';
    } else {
      this.editMode = true;
      this.labelMode = 'remove_red_eye';
      this.labelModeText = 'View';
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
