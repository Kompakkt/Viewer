import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class MessageService {
  #snackbar = inject(MatSnackBar);

  error(message: string) {
    this.#snackbar.open(message, 'OK');
  }

  info(message: string) {
    this.#snackbar.open(message, 'Dismiss', {
      duration: 5000,
    });
  }
}
