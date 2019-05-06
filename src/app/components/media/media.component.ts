import { Component, OnInit } from '@angular/core';

import {ProcessingService} from '../../services/processing/processing.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent implements OnInit {

  public videoSrc: string;
  constructor(public processingService: ProcessingService) { }

  ngOnInit() {

    this.processingService.Observables.actualVideoSrc.subscribe(actualVideoSrc => {
      this.videoSrc = actualVideoSrc;
    });
  }

}
