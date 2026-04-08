import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BackendService } from '../../../services/backend/backend.service';
import { MessageService } from '../../../services/message/message.service';

import { FormsModule } from '@angular/forms';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { ICompilation } from '@kompakkt/common';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
  imports: [FormsModule, TranslatePipe, InputComponent, ButtonRowComponent, ButtonComponent],
})
export class DialogShareAnnotationComponent {
  public targetCollectionId = '';
  private entityId = '';
  private response: {
    status: boolean;
    collectionId: string;
    annotationListLength: number;
  } = {
    status: false,
    collectionId: '',
    annotationListLength: 1,
  };

  constructor(
    private backend: BackendService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogShareAnnotationComponent>,
    @Inject(MAT_DIALOG_DATA) data: { entityId: string },
  ) {
    this.entityId = data.entityId;
  }

  public share() {
    if (this.targetCollectionId !== '') {
      this.backend
        .getCompilation(this.targetCollectionId)
        .then(compilation => {
          if (compilation) {
            compilation = compilation as ICompilation;

            if (!compilation.entities[this.entityId])
              return this.message.error(
                'The entity of this annotation is not part of the target collection.',
              );

            this.response = {
              status: true,
              collectionId: this.targetCollectionId,
              annotationListLength: Object.keys(compilation.annotations).length ?? 0,
            };

            this.dialogRef.close(this.response);
          }
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
    console.log('canceled');
    this.dialogRef.close(this.response);
  }
}
