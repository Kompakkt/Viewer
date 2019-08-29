import { Component, HostBinding, OnInit } from '@angular/core';

import { OverlayService } from '../../services/overlay/overlay.service';
import {ProcessingService} from "../../services/processing/processing.service";

@Component({
  selector: 'app-sidenav-menu',
  templateUrl: './sidenav-menu.component.html',
  styleUrls: ['./sidenav-menu.component.scss'],
})
export class SidenavMenuComponent implements OnInit {
  @HostBinding('class.is-open')
  public isOpen = false;
  public mode = '';

  public isShowAnnotate = true;
  public isShowSettings = true;
  public isShowMetadata = true;
  public isShowCollectionBrowser = true;
  public isShowBrowser = true;

  constructor(
      public overlayService: OverlayService,
      private processingService: ProcessingService,
  ) { }

  ngOnInit() {

    this.overlayService.sidenav.subscribe(sidenav => {
      this.mode = this.overlayService.actualSidenavMode;
      this.isOpen = sidenav;

      this.processingService.showAnnotate.subscribe(anno => {
        this.isShowAnnotate = anno;
        console.log('SHOWANNO', anno);
      });

      this.processingService.showSettings.subscribe(settings => {
        this.isShowSettings = settings;
      });

      this.processingService.showMetadata.subscribe(meta => {
        this.isShowMetadata = meta;
      });

      this.processingService.showCollectionBrowser.subscribe(coll => {
        this.isShowCollectionBrowser = coll;
      });

      this.processingService.showBrowser.subscribe(browser => {
        this.isShowBrowser = browser;
      });
    });
  }
}
