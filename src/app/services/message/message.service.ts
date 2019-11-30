import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class MessageService {
  constructor(private snackBar: MatSnackBar) {}

  public error(message: string) {
    this.snackBar.open(message, 'OK');
  }

  public info(message: string) {
    this.snackBar.open(message, 'Dismiss', {
      duration: 5000,
    });
  }
}
