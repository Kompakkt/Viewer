import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingscreenhandlerService {
  private OpacitySubject = new BehaviorSubject<string>('1');
  public opacity = this.OpacitySubject.asObservable();
  private TextSubject = new BehaviorSubject<string>('Loading');
  public loadingText = this.TextSubject.asObservable();
  private StyleSubject = new BehaviorSubject<any>({
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%'
  });
  public loadingStyle = this.StyleSubject.asObservable();

  public isLoading = false;
  public backgroundColor = '#111111';
  public logo = 'assets/img/kompakkt-icon.png';

  constructor() {
  }

  public updateOpacity(newOpacity: string): void {
    if (parseFloat(newOpacity) > 0.5) {
      this.isLoading = true;
    } else {
      this.isLoading = false;
    }
    this.OpacitySubject.next(newOpacity);
  }

  public updateLoadingText(newText: string): void {
    this.TextSubject.next(newText);
  }

  public updateLoadingStyle(newStyle: any): void {
    this.StyleSubject.next(newStyle);
  }
}
