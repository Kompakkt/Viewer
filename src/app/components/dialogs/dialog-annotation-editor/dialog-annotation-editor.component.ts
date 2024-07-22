import { Component, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
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
import { MatIcon } from '@angular/material/icon';
import {
  ButtonComponent,
  ButtonRowComponent,
  InputComponent,
  TextareaComponent,
} from 'projects/komponents/src';
import { IAnnotation, IEntity } from 'src/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MediaBrowserComponent } from '../../entity-feature-annotations/annotation-media-browser/media-browser.component';
import { MarkdownPreviewComponent } from '../../markdown-preview/markdown-preview.component';

export interface IDialogData {
  annotation: IAnnotation;
  mode: 'edit' | 'preview';
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
    FormsModule,
    MatDialogContent,
    MarkdownPreviewComponent,
    MediaBrowserComponent,
    CdkTextareaAutosize,
    MatDialogActions,
    MatIcon,
    MatDialogClose,
    TranslatePipe,
    TextareaComponent,
    InputComponent,
    ButtonComponent,
    ButtonRowComponent,
  ],
})
export class DialogAnnotationEditorComponent implements OnInit {
  @ViewChild('annotationContent')
  private annotationContent?: TextareaComponent;

  public modes = {
    edit: 'Edit',
    preview: 'Preview',
  };
  public currentMode = signal<keyof typeof this.modes>('preview');
  public data = signal({ title: '', description: '' });

  private serverUrl = environment.server_url;

  public dialogRef = inject(MatDialogRef<DialogAnnotationEditorComponent>);
  public dialogData = inject<IDialogData>(MAT_DIALOG_DATA);

  constructor() {
    effect(() => {
      const mode = this.currentMode();
      this.dialogRef.disableClose = mode === 'edit';
    });
  }

  ngOnInit(): void {
    this.currentMode.set(this.dialogData.mode);
    this.data.update(state => ({
      ...state,
      title: this.dialogData.annotation.body.content.title,
      description: this.dialogData.annotation.body.content.description,
    }));
  }

  public updateDescription(content: string) {
    this.data.update(state => ({ ...state, description: content }));
  }

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
    const textarea = this.annotationContent?.textarea();

    if (!textarea) return { start: 0, value: '' };
    textarea.nativeElement.focus();

    return {
      start: textarea.nativeElement.selectionStart,
      value: textarea.nativeElement.value,
    };
  }

  private createMarkdown(mdElement: any) {
    const caret = this.getCaretPosition();
    const start = caret.start;
    const value = caret.value;

    return `${value.substring(0, start)}${mdElement}${value.substring(start, value.length)}`;
  }

  private addExternalImage(image: IExternalImage) {
    this.updateDescription(this.createMarkdown(`![alt ${image.description}](${image.url})`));
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

    this.updateDescription(this.createMarkdown(markdown));
  }

  public onTextAreaChange(value: string) {
    this.data.update(state => ({ ...state, description: value }));
  }

  public onTitleChange(value: string) {
    this.data.update(state => ({ ...state, title: value }));
  }

  public toggleEditViewMode() {
    if (this.currentMode() === 'edit') {
      this.currentMode.set('preview');
    } else {
      this.currentMode.set('edit');
    }
  }

  public close(withData?: boolean) {
    this.dialogRef.close(withData ? this.data() : undefined);
  }
}
