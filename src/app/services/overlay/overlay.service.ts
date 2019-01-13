import {EventEmitter, Injectable, Output} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OverlayService {

  constructor() {
  }

  private editorIsOpen = false;
  private collectionsOverviewIsOpen = false;

  @Output() editor: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionsOverview: EventEmitter<boolean> = new EventEmitter();

  public toggleEditor(): boolean {

    this.editorIsOpen = !this.editorIsOpen;
    this.editor.emit(this.editorIsOpen);
    return this.editorIsOpen;
  }

  public toggleCollectionsOverview(): boolean {

    this.collectionsOverviewIsOpen = !this.collectionsOverviewIsOpen;
    this.collectionsOverview.emit(this.collectionsOverviewIsOpen);
    return this.collectionsOverviewIsOpen;
  }
}
