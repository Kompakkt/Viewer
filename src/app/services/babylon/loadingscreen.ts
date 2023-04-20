import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LoadingScreenService {
  public opacity$ = new BehaviorSubject<string>('1');
  public loadingText$ = new BehaviorSubject<string>('Loading');

  public isLoading = false;

  public show() {
    this.updateOpacity('1');
  }

  public hide() {
    this.updateOpacity('0');
  }

  public updateOpacity(newOpacity: string): void {
    if (parseFloat(newOpacity) > 0.5) {
      this.isLoading = true;
    } else {
      this.isLoading = false;
    }
    this.opacity$.next(newOpacity);
  }

  public updateLoadingText(newText: string): void {
    this.loadingText$.next(newText);
  }
}
