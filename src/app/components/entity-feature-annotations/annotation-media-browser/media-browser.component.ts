import { Component, inject, output } from '@angular/core';
import { ButtonComponent, ButtonRowComponent, InputComponent } from '@kompakkt/komponents';
import { IEntity } from '@kompakkt/common';
import { environment } from 'src/environment';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { ProcessingService } from '../../../services/processing/processing.service';

type BrowsedMedia = IEntity | { mediaType: string; url: string; description: string };

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
  imports: [TranslatePipe, InputComponent, ButtonComponent, ButtonRowComponent],
})
export class MediaBrowserComponent {
  processing = inject(ProcessingService);
  addMedia = output<BrowsedMedia>();

  addExternalImage = false;
  addCompilationEntity = false;

  server_url = environment.server_url;

  private hideBrowser() {
    this.addExternalImage = false;
    this.addCompilationEntity = false;
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
    const entities = this.processing.compilationEntities();
    this.addMedia.emit(entities[index]);
  }
}
