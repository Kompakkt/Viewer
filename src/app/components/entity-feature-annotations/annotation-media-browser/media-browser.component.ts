import { AsyncPipe } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatCard, MatCardFooter, MatCardImage } from '@angular/material/card';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { filter, firstValueFrom, map } from 'rxjs';
import { IEntity, isCompilation, isEntity } from 'src/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ProcessingService } from '../../../services/processing/processing.service';

type BrowsedMedia = IEntity | { mediaType: string; url: string; description: string };

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
  standalone: true,
  imports: [
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatFormField,
    MatInput,
    MatLabel,
    MatCard,
    MatCardImage,
    MatCardFooter,
    AsyncPipe,
    TranslatePipe,
  ],
})
export class MediaBrowserComponent {
  @Output() addMedia = new EventEmitter<BrowsedMedia>();

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
    this.addExternalImage = false;
    this.addCompilationEntity = false;
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
