import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-dialog-delete-single-annotation',
  templateUrl: './dialog-delete-single-annotation.component.html',
  styleUrls: ['./dialog-delete-single-annotation.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatFormField,
    MatInput,
    MatLabel,
    FormsModule,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    TranslatePipe,
  ],
})
export class DialogDeleteSingleAnnotationComponent {
  public username = '';
  public password = '';

  public login() {}

  public withoutlogin() {
    console.log(`username: ${this.username}`);
  }
}
