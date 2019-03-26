import {Injectable} from '@angular/core';
import {MatSnackBar} from '@angular/material';

@Injectable({
  providedIn: 'root',
})
export class MessageService {

  constructor(private snackBar: MatSnackBar) {
  }

  public error(message: string) {
    this.snackBar.open(message, 'OK');
  }

  public info(message: string) {
    const instance = this.snackBar.open(message);
    setTimeout(() => instance.dismiss(), 5000);
  }
}
