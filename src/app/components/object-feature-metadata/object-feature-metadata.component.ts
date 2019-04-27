import {Component, HostBinding, OnInit} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {LoadModelService} from '../../services/load-model/load-model.service';
import {MetadataService} from '../../services/metadata/metadata.service';
import {OverlayService} from '../../services/overlay/overlay.service';

@Component({
  selector: 'app-object-feature-metadata',
  templateUrl: './object-feature-metadata.component.html',
  styleUrls: ['./object-feature-metadata.component.scss'],
})
export class ObjectFeatureMetadataComponent implements OnInit {

  @HostBinding('class.is-open') private isOpen = false;

  public metadata;
  public showMetadata = false;
  private actualMetadata_id: string;
  public isExternal: boolean;
  public service: string;
  public baseURL = 'https://blacklodge.hki.uni-koeln.de/builds/ObjectsRepository/live/#/model-overview?model=';
  public downloadJsonHref: any;

  constructor(private overlayService: OverlayService,
              private metadataService: MetadataService,
              public loadModelService: LoadModelService,
              private sanitizer: DomSanitizer) {
  }

  ngOnInit() {
    this.overlayService.editor.subscribe(async editorIsOpen => {
        this.isOpen = editorIsOpen;
        if (this.isOpen) {

          if (this.actualMetadata_id !== this.loadModelService.getCurrentModel().relatedDigitalObject._id) {
            this.actualMetadata_id = this.loadModelService.getCurrentModel().relatedDigitalObject._id;
            if (this.actualMetadata_id && this.actualMetadata_id !== '') {
              this.metadata = await this.metadataService.fetchMetadata(this.actualMetadata_id);
              this.showMetadata = (this.metadata && this.metadata !== '');
              this.isExternal = this.loadModelService.getCurrentModel().dataSource.isExternal;
              if (this.isExternal && this.loadModelService.getCurrentModel().dataSource.service) {
                this.service = this.loadModelService.getCurrentModel().dataSource.service;
              } else {
                this.service = 'Objects Repository';
              }
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
