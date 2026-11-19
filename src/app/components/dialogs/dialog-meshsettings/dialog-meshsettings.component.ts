import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent, ButtonRowComponent } from '@kompakkt/komponents';
import { FluentPipe } from '../../../pipes/fluent.pipe';

@Component({
  selector: 'app-dialog-meshsettings',
  templateUrl: './dialog-meshsettings.component.html',
  styleUrls: ['./dialog-meshsettings.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FluentPipe, ButtonComponent, ButtonRowComponent],
})
export class DialogMeshsettingsComponent {
  #ref = inject(MatDialogRef);

  public close(choice: boolean) {
    this.#ref.close(choice);
  }
}
