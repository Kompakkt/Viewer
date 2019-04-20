import {Component, EventEmitter, OnInit, Output} from '@angular/core';

import {LoadModelService} from '../../services/load-model/load-model.service';

@Component({
  selector: 'app-media-browser',
  templateUrl: './media-browser.component.html',
  styleUrls: ['./media-browser.component.scss'],
})
export class MediaBrowserComponent implements OnInit {

  @Output() addMedia = new EventEmitter();

  public url = '';
  public description = '';

  constructor(public loadModelService: LoadModelService) {
  }

  ngOnInit() {
  }

  add() {
    this.addMedia.emit({
      url: this.url,
      description: this.description,
    });
  }

}
