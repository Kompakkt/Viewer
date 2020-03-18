import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MessageService } from '../../../services/message/message.service';
import { MongohandlerService } from '../../../services/mongohandler/mongohandler.service';

import { ICompilation } from '../../../interfaces/interfaces';

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
})
export class DialogShareAnnotationComponent {
  public targetCollectionId = '';
  public checkPwdMode = false;
  private passwordCollection = '';
  private entityId = '';
  private response: any = {
    status: false,
    collectionId: '',
    annotationListLength: 1,
  };

  constructor(
    private mongohandlerService: MongohandlerService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogShareAnnotationComponent>,
    @Inject(MAT_DIALOG_DATA) data,
  ) {
    this.entityId = data.entityId;
  }

  public share() {
    if (this.targetCollectionId !== '') {
      this.mongohandlerService
        .getCompilation(this.targetCollectionId)
        .then(compilation => {
          if (!compilation) {
            // 'password'
            this.checkPwdMode = true;
          } else {
            // collection is available on server
            // loaded'
            compilation = compilation as ICompilation;

            if (
              compilation.entities.filter(
                entity => entity && entity._id === this.entityId,
              ).length !== 0
            ) {
              this.response.status = true;
              this.response.collectionId = this.targetCollectionId;
              this.response.annotationListLength = compilation.annotationList
                ? compilation.annotationList.length
                : 0;
              this.dialogRef.close(this.response);
            } else {
              this.message.error(
                'The entity of this annotation is not part of the target collection.',
              );
            }
          }
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to entity server refused.');
          // 'missing'
          this.message.error(
            'Can not find Collection with ID ' + this.targetCollectionId + '.',
          );
        });
    }
  }

  public cancel() {
    console.log('canceled');
    this.dialogRef.close(this.response);
  }

  public checkPwd() {
    if (this.targetCollectionId !== '') {
      this.mongohandlerService
        .getCompilation(this.targetCollectionId, this.passwordCollection)
        .then(compilation => {
          if (!compilation) {
            this.message.error(
              `Password is wrong for collection with ID ${this.targetCollectionId}`,
            );
          } else {
            compilation = compilation as ICompilation;
            this.response.status = true;
            this.response.collectionId = this.targetCollectionId;
            this.response.annotationListLength = compilation.annotationList
              ? compilation.annotationList.length
              : 1;
            this.dialogRef.close(this.response);
          }
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to entity server refused.');
          this.dialogRef.close(this.response);
        });
    }
  }
}
