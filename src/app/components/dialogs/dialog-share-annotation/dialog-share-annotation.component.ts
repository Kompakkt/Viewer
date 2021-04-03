import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MessageService } from '../../../services/message/message.service';
import { BackendService } from '../../../services/backend/backend.service';

import { ICompilation } from '~common/interfaces';

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
})
export class DialogShareAnnotationComponent {
  public targetCollectionId = '';
  public checkPwdMode = false;
  public passwordCollection = '';
  private entityId = '';
  private response: any = {
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
          if (!compilation) {
            // 'password'
            this.checkPwdMode = true;
          } else {
            // collection is available on server
            // loaded'
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

  public checkPwd() {
    if (this.targetCollectionId !== '') {
      this.backend
        .getCompilation(this.targetCollectionId, this.passwordCollection)
        .then(compilation => {
          if (!compilation)
            return this.message.error(
              `Password is wrong for collection with ID ${this.targetCollectionId}`,
            );
          compilation = compilation as ICompilation;
          this.response = {
            status: true,
            collectionId: this.targetCollectionId,
            annotationListLength: Object.keys(compilation.annotations).length ?? 1,
          };
          this.dialogRef.close(this.response);
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to entity server refused.');
          this.dialogRef.close(this.response);
        });
    }
  }
}
