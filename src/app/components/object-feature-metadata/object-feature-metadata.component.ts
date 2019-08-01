import {Component, HostBinding, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {MetadataService} from '../../services/metadata/metadata.service';
import {OverlayService} from '../../services/overlay/overlay.service';
import {ProcessingService} from '../../services/processing/processing.service';

@Component({
  selector: 'app-entity-feature-metadata',
  templateUrl: './object-feature-metadata.component.html',
  styleUrls: ['./object-feature-metadata.component.scss'],
})
export class EntityFeatureMetadataComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  public metadata;
  public showMetadata = false;
  private actualMetadata_id: string | undefined;
  public isExternal = false;
  public service = 'Entities Repository';
  public downloadJsonHref: any;
  public isDefaultEntityLoaded: boolean | undefined;
  // TODO better to set somewhere global
  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/EntitiesRepository/live/#/entity-overview?entity=';

  constructor(private overlayService: OverlayService,
              private metadataService: MetadataService,
              public processingService: ProcessingService,
              private sanitizer: DomSanitizer) {
  }

  ngOnInit() {
    this.overlayService.editor.subscribe(async editorIsOpen => {
        this.isOpen = editorIsOpen;
        const currentEntity = this.processingService.getCurrentEntity();
        if (this.isOpen && currentEntity && currentEntity.relatedDigitalEntity) {
          if (this.actualMetadata_id !== currentEntity.relatedDigitalEntity._id) {
            this.actualMetadata_id = currentEntity.relatedDigitalEntity._id;
            if (this.actualMetadata_id && this.actualMetadata_id !== '') {
              this.metadata = await this.metadataService.fetchMetadata(this.actualMetadata_id);
              this.showMetadata = (this.metadata && this.metadata !== '');
              this.isExternal = currentEntity.dataSource.isExternal;
              this.service = this.isExternal && currentEntity.dataSource.service ?
                currentEntity.dataSource.service : 'Entities Repository';
            } else {
              this.showMetadata = false;
            }
          }
          this.showMetadata = (this.metadata && this.metadata !== '');
        }
      },
    );

  }

  public generateDownloadJsonUri(value) {
    const product = JSON.stringify(value, undefined, ' ');
    const URI = this.sanitizer
      .bypassSecurityTrustUrl(`data:text/json;charset=UTF-8,${encodeURIComponent(product)}`);

    this.downloadJsonHref = URI;
  }

}
