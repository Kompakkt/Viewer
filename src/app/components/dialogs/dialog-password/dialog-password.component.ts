import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

import {MessageService} from '../../../services/message/message.service';
import {MongohandlerService} from '../../../services/mongohandler/mongohandler.service';
import {ProcessingService} from '../../../services/processing/processing.service';

@Component({
  selector: 'app-password',
  templateUrl: './dialog-password.component.html',
  styleUrls: ['./dialog-password.component.scss'],
})
export class DialogPasswordComponent implements OnInit {

  public password = '';
  public identifierCollection: string;

  constructor(private mongohandlerService: MongohandlerService,
              private processingService: ProcessingService,
              private message: MessageService,
              private dialogRef: MatDialogRef<DialogPasswordComponent>,
              @Inject(MAT_DIALOG_DATA) data) {

    this.identifierCollection = data.id;
  }

  ngOnInit() {
  }

  public check() {

    if (this.identifierCollection && this.password !== '') {
      this.mongohandlerService.getCompilation(this.identifierCollection, this.password)
        .then(compilation => {

        if (compilation['_id']) {
          this.processingService.fetchAndLoad(undefined, compilation._id, undefined);

          this.dialogRef.close(true);
        } else {
          this.message.error('Password is wrong.' + this.identifierCollection + '.');
        }
      })
      .catch(error => {
        console.error(error);
        this.message.error('Connection to entity server refused.');
        this.dialogRef.close();
      });

    }
  }

  public withoutPassword() {
    console.log('canceled');
    this.dialogRef.close();
  }

}
