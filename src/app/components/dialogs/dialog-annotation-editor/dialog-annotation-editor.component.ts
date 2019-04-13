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

  public addImage() {

    const mdImage = '![alt DESCRIPTION](URL)';

    this.annotationContent.nativeElement.focus();

    const startPos = this.annotationContent.nativeElement.selectionStart;
    const value = this.annotationContent.nativeElement.value;

    this.annotationContent.nativeElement.value =
      `${value.substring(0, startPos)}${mdImage}${value.substring(startPos, value.length)}`;
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
