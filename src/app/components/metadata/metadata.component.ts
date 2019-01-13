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

  private metadata = '';
  private showMetadata = false;

  constructor(private overlayService: OverlayService,
              private metadataService: MetadataService,
              private loadModelService: LoadModelService) {
  }


  ngOnInit() {

    this.overlayService.editor.subscribe(editorIsOpen => {
        this.isOpen = editorIsOpen;
        if (this.isOpen) {

          const metadata_id = this.loadModelService.Observables.actualModel.source['value'].relatedDigitalObject._id;
          console.log('Ich wurde geöffnet und suche nach: ' + metadata_id);

          if (metadata_id !== '' && metadata_id !== undefined) {
            // erst TODO
            this.metadata = this.metadataService.fetchMetadata(metadata_id);
            // dann
            if (this.metadata !== '' && this.metadata !== undefined) {
              this.showMetadata = true;
              console.log('ich weiß ich soll zeigen: ' + this.showMetadata);
            } else {
              console.log('ich weiß ich soll zeigen: ' + this.showMetadata);
              this.showMetadata = false;
            }

          } else {
            console.log('ich weiß ich soll zeigen: ' + this.showMetadata);
            this.showMetadata = false;
          }
        }
      }
    );

  }


}

