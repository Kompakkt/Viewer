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

  public showMediaBrowser = false;

  constructor(public processingService: ProcessingService) {
  }

  ngOnInit() {
    this.processingService.Observables.actualCollection.subscribe(actualCollection => {
      this.objects = actualCollection;
      console.log(this.objects);
    });
  }

  addObject(adress, text) {

    this.addMedia.emit({
      url: adress,
      description: text,
    });
  }

}
