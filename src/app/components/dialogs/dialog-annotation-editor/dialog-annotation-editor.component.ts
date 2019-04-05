import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

export interface IDialogData {
  title: string;
  content: string;
}

@Component({
  selector: 'app-dialog-annotation-editor',
  templateUrl: './dialog-annotation-editor.component.html',
  styleUrls: ['./dialog-annotation-editor.component.scss']
})
export class DialogAnnotationEditorComponent {

  public editMode = false;
  public labelMode = 'edit';
  public labelModeText = 'Edit';

  constructor(public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
              @Inject(MAT_DIALOG_DATA) public data: IDialogData) {
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
