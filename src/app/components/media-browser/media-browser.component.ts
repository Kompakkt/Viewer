import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
})
export class MediaBrowserComponent implements OnInit {
  @Output() addMedia = new EventEmitter();

  public url = '';
  public entities: any;
  public description = '';

  public addExternalImage = false;
  public addCompilationEntity = false;

  constructor(public processingService: ProcessingService) {}

  ngOnInit() {
    this.processingService.Observables.actualCompilation.subscribe(
      actualCompilation => {
        this.entities = actualCompilation;
      },
    );
  }

  private hideBrowser() {
    this.addExternalImage = this.addCompilationEntity = false;
  }

  addImage(address, text) {
    this.hideBrowser();
    this.addMedia.emit({
      mediaType: 'externalImage',
      url: address,
      description: text,
    });
  }

  addEntity(index) {
    this.hideBrowser();
    this.addMedia.emit(this.entities.entities[index]);
  }
}
