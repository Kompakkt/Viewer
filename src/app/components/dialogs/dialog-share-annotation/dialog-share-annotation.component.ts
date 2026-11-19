import { Component, Inject, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { BackendService } from '../../../services/backend/backend.service';
import { MessageService } from '../../../services/message/message.service';
import { TranslateService } from '../../../services/translate/translate.service';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { FluentPipe } from '../../../pipes/fluent.pipe';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [FluentPipe, InputComponent, ButtonRowComponent, ButtonComponent],
})
export class DialogShareAnnotationComponent {
  public targetCollectionId = '';
  private entityId = '';
  private translate = inject(TranslateService);

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
              this.translate.getTranslation(
                'k_dialog-share-annotation-entity-not-in-collection-error',
              ),
            );

          const result: DialogShareAnnotationResult = {
            collectionId: this.targetCollectionId,
            annotationListLength: Object.keys(compilation.annotations).length ?? 0,
          };

          this.dialogRef.close(result);
        })
        .catch(error => {
          console.error(error);
          this.message.error(
            this.translate.getTranslation('k_dialog-share-annotation-connection-refused-error'),
          );
          this.message.error(
            this.translate.getTranslation('k_dialog-share-annotation-collection-not-found-error', {
              collectionId: this.targetCollectionId,
            }),
          );
        });
    }
  }

  public cancel() {
    this.dialogRef.close();
  }
}
