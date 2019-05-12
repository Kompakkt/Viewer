import {Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

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

  constructor(public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
              @Inject(MAT_DIALOG_DATA) public data: IDialogData) {
  }

  public addObject(object) {

    switch (object.mediaType) {

      case 'externalImage':
        this.addExternalImage(object);
        break;

      case 'image':
        this.addImage(object);
        break;

      case 'text':
        this.addText(object);
        break;

      case 'model':
        this.addModel(object);
        break;

      case 'video':
        this.addVideo(object);
        break;

      case 'audio':
        this.addAudio(object);
        break;

      default:
        console.log(`Unknown media type ${object.mediaType}`);
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

    const target = image.relatedDigitalObject.digobj_externalLink[0].externalLink_value;

    let mdImage = `<a href="${target}" target="_blank">`;
    mdImage += `<img src="${image.settings.preview}" alt="${image.name}"></a>`;

    this.data.content = this.createMarkdown(mdImage);
  }

  private addText(text) {

    const target = text.relatedDigitalObject.digobj_externalLink[0].externalLink_value;

    let mdText = `<a href="${target}" target="_blank">`;
    mdText += `<img src="${text.settings.preview}" alt="${text.name}"></a>`;

    this.data.content = this.createMarkdown(mdText);
  }

  // ToDo: Link to Model in Object Repository
  private addModel(model) {

    const mdModel = `<img src="${model.settings.preview}" alt="${model.name}">`;
    this.data.content = this.createMarkdown(mdModel);
  }

  private addVideo(video) {

    let mdVideo = `<video class="video" controls poster="">`;
    mdVideo += `<source src="https://miskatonic.hki.uni-koeln.de:1337/${video.processed.medium}" `;
    mdVideo += `type="video/mp4">`;
    mdVideo += `</video>`;

    this.data.content = this.createMarkdown(mdVideo);
  }

  private addAudio(audio) {

    let mdAudio = `<audio controls>`;
    mdAudio += `<source src="https://miskatonic.hki.uni-koeln.de:1337/${audio.processed.medium}" `;
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
