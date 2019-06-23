import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

import {MessageService} from '../../../services/message/message.service';
import {MongohandlerService} from '../../../services/mongohandler/mongohandler.service';

@Component({
  selector: 'app-dialog-share-annotation',
  templateUrl: './dialog-share-annotation.component.html',
  styleUrls: ['./dialog-share-annotation.component.scss'],
})

export class DialogShareAnnotationComponent implements OnInit {

  public targetCollectionId = '';
  public checkPwdMode = false;
  private passwordCollection = '';
  private modelId = '';
  private response: any = {
    status: false,
    collectionId: '',
    annotationListLength: 1,
  };

  constructor(private mongohandlerService: MongohandlerService,
              private message: MessageService,
              private dialogRef: MatDialogRef<DialogShareAnnotationComponent>,
              @Inject(MAT_DIALOG_DATA) data) {

    this.modelId = data.modelId;
  }

  ngOnInit() {
  }

  public share() {

    if (this.targetCollectionId !== '') {

      this.mongohandlerService.getCompilation(this.targetCollectionId)
        .then(compilation => {
          // collection is available on server
          if (compilation['_id']) {
            // loaded'

            if (compilation.models.filter(model => model && (model._id === this.modelId)).length !== 0) {
              this.response.status = true;
              this.response.collectionId = this.targetCollectionId;
              this.response.annotationListLength = compilation.annotationList ? compilation.annotationList.length : 0;
              this.dialogRef.close(this.response);
            } else {
              this.message.error('The model of this annotation is not part of the target collection.');
            }
          } else if (compilation['status'] === 'ok'
            && compilation['message'] === 'Password protected compilation') {
            // 'password'
            this.checkPwdMode = true;
          } else {
            // collection ist nicht erreichbar
            // missing'
            this.message.error('Can not find Collection with ID ' + this.targetCollectionId + '.');
          }
        },    error => {
          this.message.error('Connection to object server refused.');
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
      this.mongohandlerService.getCompilation(this.targetCollectionId, this.passwordCollection)
        .then(compilation => {
          compilation.annotationList ? compilation.annotationList.length : 1;

          if (compilation['_id']) {
            this.response.status = true;
            this.response.collectionId = this.targetCollectionId;
            this.response.annotationListLength = compilation.annotationList ? compilation.annotationList.length : 1;
            this.dialogRef.close(this.response);
          } else {
            this.message.error('Password is wrong. For Colelction with ID '
              + this.targetCollectionId + '.');
          }
        },    error => {
          this.message.error('Connection to object server refused.');
          this.dialogRef.close(this.response);
        });
    }
  }

}
