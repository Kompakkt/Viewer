import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { ProcessingService } from '../../../services/processing/processing.service';

import { isCompilation, isEntity, ICompilation } from 'src/common';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
})
export class MediaBrowserComponent implements OnInit {
  @Output() addMedia = new EventEmitter();

  public url = '';
  public compilation: ICompilation | undefined;
  public description = '';

  public addExternalImage = false;
  public addCompilationEntity = false;

  public isEntity = isEntity;
  public server_url = environment.server_url;

  constructor(public processing: ProcessingService) {}

  ngOnInit() {
    this.processing.compilation$.subscribe(compilation => {
      if (isCompilation(compilation)) this.compilation = compilation;
    });
  }

  get currentEntities() {
    if (!isCompilation(this.compilation)) return [];
    return Object.values(this.compilation.entities);
  }

  private hideBrowser() {
    this.addExternalImage = this.addCompilationEntity = false;
  }

  addImage(url: string, description: string) {
    this.hideBrowser();
    this.addMedia.emit({
      mediaType: 'externalImage',
      url,
      description,
    });
  }

  addEntity(index: number) {
    this.hideBrowser();
    this.addMedia.emit(this.currentEntities[index]);
  }
}
