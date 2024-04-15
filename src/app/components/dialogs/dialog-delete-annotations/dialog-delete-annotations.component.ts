import { Component } from '@angular/core';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatButton } from '@angular/material/button';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-ask-delete-all-annotations',
  templateUrl: './dialog-delete-annotations.component.html',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslatePipe,
  ],
})
export class DialogDeleteAnnotationsComponent {}
