import {EventEmitter, Injectable, Output} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OverlayService {

  constructor() {
  }

  private editorIsOpen = false;
  private collectionsOverviewIsOpen = false;
  private editorSettingIsOpen = false;
  private defaultAnnotationsIsOpen = false;

  @Output() editor: EventEmitter<boolean> = new EventEmitter();
  @Output() collectionsOverview: EventEmitter<boolean> = new EventEmitter();
  @Output() editorSetting: EventEmitter<boolean> = new EventEmitter();
  @Output() defaultAnnotations: EventEmitter<boolean> = new EventEmitter();

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

  public activateSettingsTab(): boolean {

    this.editorIsOpen = !this.editorIsOpen;
    this.editor.emit(this.editorIsOpen);
    this.editorSettingIsOpen = true;
    this.editorSetting.emit(true);

    return this.editorIsOpen;
  }

  public deactivateMeshSettings(): boolean {

    this.editorSettingIsOpen = false;
    this.editorSetting.emit(false);

    this.defaultAnnotationsIsOpen = true;
    this.defaultAnnotations.emit(true);

    return false;
  }

}
