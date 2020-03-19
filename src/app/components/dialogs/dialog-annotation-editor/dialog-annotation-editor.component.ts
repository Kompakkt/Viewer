import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { environment } from '../../../../environments/environment';
import { IEntity } from '@kompakkt/shared';

export interface IDialogData {
  title: string;
  content: string;
}

@Component({
  selector: 'app-dialog-annotation-editor',
  templateUrl: './dialog-annotation-editor.component.html',
  styleUrls: ['./dialog-annotation-editor.component.scss'],
})
export class DialogAnnotationEditorComponent {
  @ViewChild('annotationContent') private annotationContent;

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'Edit';

  private serverUrl = `${environment.express_server_url}:${environment.express_server_port}`;

  constructor(
    public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
    @Inject(MAT_DIALOG_DATA) public data: IDialogData,
  ) {}

  public addEntitySwitch(entity: IEntity) {
    switch (entity.mediaType) {
      case 'externalImage':
        this.addExternalImage(entity);
        break;

      case 'video':
      case 'audio':
      case 'image':
      case 'text':
      case 'entity':
      case 'model':
        this.addEntity(entity);
        break;
      default:
        console.log(`Unknown media type ${entity.mediaType}`);
    }
  }

  private getCaretPosition() {
    this.annotationContent.nativeElement.focus();

    return {
      start: this.annotationContent.nativeElement.selectionStart,
      value: this.annotationContent.nativeElement.value,
    };
  }

  private createMarkdown(mdElement) {
    const caret = this.getCaretPosition();
    const start = caret.start;
    const value = caret.value;

    return `${value.substring(0, start)}${mdElement}${value.substring(
      start,
      value.length,
    )}`;
  }

  private addExternalImage(image) {
    this.data.content = this.createMarkdown(
      `![alt ${image.description}](${image.url})`,
    );
  }

  private addEntity(entity: IEntity) {
    const target = `${environment.repository}/entity/${entity._id}`;
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
          <img src="${entity.settings.preview}" alt="${entity.name}">
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
