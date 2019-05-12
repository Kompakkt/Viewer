import {Component, EventEmitter, OnInit, Output} from '@angular/core';

import {ProcessingService} from '../../services/processing/processing.service';

@Component({
             selector: 'app-media-browser',
             templateUrl: './media-browser.component.html',
             styleUrls: ['./media-browser.component.scss'],
           })
export class MediaBrowserComponent implements OnInit {

  @Output() addMedia = new EventEmitter();

  public url = '';
  public objects: any;
  public description = '';

  public addExternalImage = false;
  public addCollectionObject = false;

  constructor(public processingService: ProcessingService) {
  }

  ngOnInit() {
    this.processingService.Observables.actualCollection.subscribe(actualCollection => {
      this.objects = actualCollection;
    });
  }

  private hideBrowser() {
    this.addExternalImage = this.addCollectionObject = false;
  }

  addImage(address, text) {

    this.hideBrowser();
    this.addMedia.emit({mediaType: 'externalImage', url: address, description: text});
  }

  addObject(index) {

    this.hideBrowser();
    this.addMedia.emit(this.objects.models[index]);
  }

}
