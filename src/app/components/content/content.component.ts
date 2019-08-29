import {
  Component,
  OnInit,
} from '@angular/core';

import { ProcessingService } from '../../services/processing/processing.service';

@Component({
  selector: 'app-content',
  templateUrl: './content.component.html',
  styleUrls: ['./content.component.scss'],
})
export class ContentComponent implements OnInit {
  public isCollectionLoaded = false;

  constructor(
    public processingService: ProcessingService,
  ) {}

  ngOnInit() {
    this.isCollectionLoaded = this.processingService.isCollectionLoaded;
    this.processingService.collectionLoaded.subscribe(isCollectionLoaded => {
      this.isCollectionLoaded = isCollectionLoaded;
    });
  }
}
