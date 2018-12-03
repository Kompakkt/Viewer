import {EventEmitter, Injectable, Output} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidenavService {

  constructor() {
  }

  private editorIsOpen = false;
  private collectionsOverviewIsOpen = false;

  @Output() editor: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionsOverview: EventEmitter<boolean> = new EventEmitter();

  public toggleEditor(): void {

    this.editorIsOpen = !this.editorIsOpen;
    this.editor.emit(this.editorIsOpen);
  }

  public closeEditor(): void {
    this.editorIsOpen = false;
    this.editor.emit(this.editorIsOpen);
  }

  public toggleCollectionsOverview(): void {

    this.collectionsOverviewIsOpen = !this.collectionsOverviewIsOpen;
    this.collectionsOverview.emit(this.collectionsOverviewIsOpen);
  }
}
