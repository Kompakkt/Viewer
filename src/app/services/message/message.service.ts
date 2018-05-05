import { Injectable } from '@angular/core';

import {MatSnackBar} from '@angular/material';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor(public snackBar: MatSnackBar) {}

  public error(message: string) {
    this.snackBar.open(message, 'OK');
  }
}
