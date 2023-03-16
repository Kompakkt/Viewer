import { Component, EventEmitter, Output } from '@angular/core';
import { filter, firstValueFrom, map } from 'rxjs';
import { isCompilation, isEntity } from 'src/common';
import { environment } from 'src/environments/environment';
import { ProcessingService } from '../../../services/processing/processing.service';

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
})
export class MediaBrowserComponent {
  @Output() addMedia = new EventEmitter();

  public url = '';
  public description = '';

  public addExternalImage = false;
  public addCompilationEntity = false;

  public server_url = environment.server_url;

  constructor(public processing: ProcessingService) {}

  get compilation$() {
    return this.processing.compilation$;
  }

  get entities$() {
    return this.compilation$.pipe(
      filter(isCompilation),
      map(({ entities }) => Object.values(entities)),
      map(entities => entities.filter(isEntity)),
    );
  }

  private hideBrowser() {
    this.addExternalImage = this.addCompilationEntity = false;
  }

  public addImage(url: string, description: string) {
    this.hideBrowser();
    this.addMedia.emit({
      mediaType: 'externalImage',
      url,
      description,
    });
  }

  public async addEntity(index: number) {
    this.hideBrowser();
    const entities = await firstValueFrom(this.entities$);
    this.addMedia.emit(entities[index]);
  }
}
