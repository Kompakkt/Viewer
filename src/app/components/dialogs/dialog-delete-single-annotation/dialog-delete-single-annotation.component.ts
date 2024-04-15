import { Component } from '@angular/core';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatButton } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { MatInput } from '@angular/material/input';
import { MatFormField } from '@angular/material/form-field';
import {
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';

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
