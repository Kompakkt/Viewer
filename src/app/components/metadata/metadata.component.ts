import {Component, HostBinding, OnInit} from '@angular/core';
import {OverlayService} from '../../services/overlay/overlay.service';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {MetadataService} from '../../services/metadata/metadata.service';

@Component({
  selector: 'app-metadata',
  templateUrl: './metadata.component.html',
  styleUrls: ['./metadata.component.scss']
})
export class MetadataComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  public metadata;
  public showMetadata = false;

  constructor(private overlayService: OverlayService,
              private metadataService: MetadataService,
              private loadModelService: LoadModelService) {
  }


  ngOnInit() {
    this.overlayService.editor.subscribe(async editorIsOpen => {
        this.isOpen = editorIsOpen;
        if (this.isOpen) {
          const metadata_id = this.loadModelService.getCurrentModel().relatedDigitalObject._id;

          if (metadata_id && metadata_id !== '') {
            this.metadata = await this.metadataService.fetchMetadata(metadata_id);
            this.showMetadata = (this.metadata && this.metadata !== '') ? true : false;
          } else {
            this.showMetadata = false;
          }
        }
      }
    );

  }


}

