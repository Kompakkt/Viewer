import { Component, inject } from '@angular/core';
import {
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent } from 'projects/komponents/src';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
    selector: 'app-dialog-meshsettings',
    templateUrl: './dialog-meshsettings.component.html',
    styleUrls: ['./dialog-meshsettings.component.scss'],
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatDialogClose,
        TranslatePipe,
        ButtonComponent,
        ButtonRowComponent,
    ]
})
export class DialogMeshsettingsComponent {
  #ref = inject(MatDialogRef);

  public close(choice: boolean) {
    this.#ref.close(choice);
  }
}
