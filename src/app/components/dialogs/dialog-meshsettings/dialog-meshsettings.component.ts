import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent } from 'komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-dialog-meshsettings',
  templateUrl: './dialog-meshsettings.component.html',
  styleUrls: ['./dialog-meshsettings.component.scss'],
  imports: [TranslatePipe, ButtonComponent, ButtonRowComponent],
})
export class DialogMeshsettingsComponent {
  #ref = inject(MatDialogRef);

  public close(choice: boolean) {
    this.#ref.close(choice);
  }
}
