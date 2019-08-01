import {Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

import {environment} from '../../../../environments/environment';

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

  @ViewChild('annotationContent', { static: false }) private annotationContent;

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'Edit';

  private repository = `${environment.repository}/`;
  private serverUrl = `${environment.express_server_url}:${environment.express_server_port}`;

  constructor(public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
              @Inject(MAT_DIALOG_DATA) public data: IDialogData) {
  }

  public addEntitySwitch(entity) {

    switch (entity.mediaType) {

      case 'externalImage':
        this.addExternalImage(entity);
        break;

      case 'image':
        this.addImage(entity);
        break;

      case 'text':
        this.addText(entity);
        break;

      case 'entity':
        this.addEntity(entity);
        break;

      case 'video':
        this.addVideo(entity);
        break;

      case 'audio':
        this.addAudio(entity);
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

    return `${value.substring(0, start)}${mdElement}${value.substring(start, value.length)}`;
  }

  private addExternalImage(image) {
    this.data.content = this.createMarkdown(`![alt ${image.description}](${image.url})`);
  }

  // ToDo: Reduce doubled / redundant code in addImage vs. addText or unify functions
  private addImage(image) {

    const target = image.relatedDigitalEntity.digobj_externalLink[0].externalLink_value;

    let mdImage = `<a href="${target}" target="_blank">`;
    mdImage += `<img src="${image.settings.preview}" alt="${image.name}"></a>`;

    this.data.content = this.createMarkdown(mdImage);
  }

  private addText(text) {

    const target = text.relatedDigitalEntity.digobj_externalLink[0].externalLink_value;

    let mdText = `<a href="${target}" target="_blank">`;
    mdText += `<img src="${text.settings.preview}" alt="${text.name}"></a>`;

    this.data.content = this.createMarkdown(mdText);
  }

  private addEntity(entity) {

    let mdEntity = `<a href="${this.repository}entity-overview?entity=${entity._id}" target="_blank">`;
    mdEntity += `<img src="${entity.settings.preview}" alt="${entity.name}"></a>`;

    this.data.content = this.createMarkdown(mdEntity);
  }

  private addVideo(video) {

    let mdVideo = `<video class="video" controls poster="">`;

    let url = '';
    if (!video.dataSource.isExternal) url += `${this.serverUrl}/`;

    mdVideo += `<source src="${url}/${video.processed.medium}" `;
    mdVideo += `type="video/mp4">`;
    mdVideo += `</video>`;

    this.data.content = this.createMarkdown(mdVideo);
  }

  private addAudio(audio) {

    let mdAudio = `<audio controls>`;

    let url = '';
    if (!audio.dataSource.isExternal) url += `${this.serverUrl}/`;

    mdAudio += `<source src="${url}${audio.processed.medium}" `;
    mdAudio += `type="audio/mpeg">`;
    mdAudio += `</audio>`;

    this.data.content = this.createMarkdown(mdAudio);
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
