import {EventEmitter, Injectable, Output} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {

  constructor() {
  }

  private isOpen = false;

  @Output() change: EventEmitter<boolean> = new EventEmitter();

  public toggle(): void {

    this.isOpen = !this.isOpen;
    this.change.emit(this.isOpen);
  }
}
