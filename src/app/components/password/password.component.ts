import {Component, Inject, OnInit} from '@angular/core';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {MessageService} from '../../services/message/message.service';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

@Component({
  selector: 'app-password',
  templateUrl: './password.component.html',
  styleUrls: ['./password.component.scss']
})
export class PasswordComponent implements OnInit {

  public password = '';
  public identifierCollection: string;

  constructor(private mongohandlerService: MongohandlerService,
              private catalogueService: CatalogueService,
              private message: MessageService,
              private dialogRef: MatDialogRef<PasswordComponent>,
              @Inject(MAT_DIALOG_DATA) data) {

    this.identifierCollection = data.id;
  }

  ngOnInit() {
  }

  public check() {

    if (this.identifierCollection !== undefined && this.password !== '') {
      this.mongohandlerService.getCompilation(this.identifierCollection, this.password).then(compilation => {

        if (compilation['_id']) {

          console.log('Antwort ist:', compilation, 'und ', compilation['_id']);
          this.catalogueService.addAndLoadCollection(compilation);
          this.dialogRef.close(true);

        } else {
          this.message.error('Password is wrong. ' + this.identifierCollection + '.');
        }

      }, error => {
        this.message.error('Connection to object server refused.');
        this.dialogRef.close();
      });

    }
  }

  public withoutPassword() {
    console.log('canceled');
    this.dialogRef.close();
  }

}
