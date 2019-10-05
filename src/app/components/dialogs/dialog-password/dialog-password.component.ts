import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';

import { ICompilation } from '../../../interfaces/interfaces';
import { MessageService } from '../../../services/message/message.service';
import { MongohandlerService } from '../../../services/mongohandler/mongohandler.service';

@Component({
  selector: 'app-password',
  templateUrl: './dialog-password.component.html',
  styleUrls: ['./dialog-password.component.scss'],
})
export class DialogPasswordComponent implements OnInit {
  public password = '';
  public identifierCollection: string;

  private compilation: ICompilation | undefined;

  constructor(
    private mongohandlerService: MongohandlerService,
    private message: MessageService,
    private dialogRef: MatDialogRef<DialogPasswordComponent>,
    @Inject(MAT_DIALOG_DATA) data,
  ) {
    this.identifierCollection = data.id;
  }

  ngOnInit() {}

  public check() {
    this.dialogRef.disableClose = true;
    if (this.identifierCollection && this.password !== '') {
      this.mongohandlerService
        .getCompilation(this.identifierCollection, this.password)
        .then(compilation => {
          if (compilation['_id'] && compilation.password === this.password) {
            this.compilation = compilation;
            this.dialogRef.close({ result: true, data: this.compilation });
          } else {
            this.message.error('Password is wrong.');
          }
        })
        .catch(error => {
          console.error(error);
          this.message.error('Connection to server refused.');
          this.dialogRef.close();
        });
    }
  }
}
