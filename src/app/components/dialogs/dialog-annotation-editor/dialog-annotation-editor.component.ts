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

  constructor(public dialogRef: MatDialogRef<DialogAnnotationEditorComponent>,
              @Inject(MAT_DIALOG_DATA) public data: IDialogData) {
  }

  cancel(): void {
    this.dialogRef.close();
  }

}
