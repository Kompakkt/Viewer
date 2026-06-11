import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BackendService } from '../../../services/backend/backend.service';
import { MessageService } from '../../../services/message/message.service';

import { FormsModule } from '@angular/forms';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';

export type DialogShareAnnotationResult = {
  collectionId: string;
  annotationListLength: number;
};

export type DialogShareAnnotationData = {
  entityId: string;
};

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
  imports: [FormsModule, TranslatePipe, InputComponent, ButtonRowComponent, ButtonComponent],
})
export class DialogShareAnnotationComponent {
  public targetCollectionId = '';
  private entityId = '';

  constructor(
    private backend: BackendService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogShareAnnotationComponent>,
    @Inject(MAT_DIALOG_DATA) data: DialogShareAnnotationData,
  ) {
    this.entityId = data.entityId;
  }

  public share() {
    if (this.targetCollectionId !== '') {
      this.backend
        .getCompilation(this.targetCollectionId)
        .then(compilation => {
          if (!compilation) throw new Error('Compilation not found');

          if (!compilation.entities[this.entityId])
            return this.message.error(
              'The entity of this annotation is not part of the target collection.',
            );

          const result: DialogShareAnnotationResult = {
            collectionId: this.targetCollectionId,
            annotationListLength: Object.keys(compilation.annotations).length ?? 0,
          };

          this.dialogRef.close(result);
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to entity server refused.');
          // 'missing'
          this.message.error('Can not find Collection with ID ' + this.targetCollectionId + '.');
        });
    }
  }

  public cancel() {
    this.dialogRef.close();
  }
}
