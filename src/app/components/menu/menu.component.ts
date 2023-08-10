import { Component, OnInit } from '@angular/core';
import fscreen from 'fscreen';
import { firstValueFrom, map } from 'rxjs';
import { BabylonService } from '../../services/babylon/babylon.service';
import { MessageService } from '../../services/message/message.service';
import { ProcessingService, QualitySetting } from '../../services/processing/processing.service';
import { UserdataService } from '../../services/userdata/userdata.service';
import { TranslateService } from './../../services/translate/translate.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent implements OnInit {
  public fullscreen = !!fscreen.fullscreenElement;
  public fullscreenCapable = fscreen.fullscreenEnabled;
  translateItems: string[] = [];

  constructor(private translate: TranslateService, 
    public processing: ProcessingService,
    public babylon: BabylonService,
    public userdata: UserdataService,
    private message: MessageService,
  ) {
    this.translate.use(window.navigator.language.split("-")[0]);
    this.translateStrings();
  }

  async translateStrings () {
    let translateSet = ["Exit Fullscreen","Enter Fullscreen"];
    this.translateItems = await this.translate.loadFromFile(translateSet);
  }

  get entity$() {
    return this.processing.entity$;
  }

  get qualities$() {
    return this.entity$.pipe(
      map(entity => {
        if (!entity) return undefined;
        return {
          low: entity.processed.low !== entity.processed.medium,
          medium: entity.processed.medium !== entity.processed.low,
          high: entity.processed.high !== entity.processed.medium,
        };
      }),
    );
  }

  ngOnInit() {
    fscreen.addEventListener(
      'fullscreenchange',
      () => (this.fullscreen = !!fscreen.fullscreenElement),
    );
  }

  public async updateEntityQuality(nextQuality: QualitySetting) {
    const currentQuality = this.processing.quality$.getValue();
    const entity = await firstValueFrom(this.entity$);
    if (nextQuality === currentQuality) return;
    if (!entity?.processed?.[nextQuality]) return;

    this.processing.updateEntityQuality(nextQuality);
    this.processing.loadEntity(entity);
  }

  toggleFullscreen() {
    // BabylonJS' this.engine.switchFullscreen(false); creates a fullscreen without our menu.
    // To display the menu, we have to switch to fullscreen on our own.
    if (this.fullscreen) {
      fscreen.exitFullscreen();
    } else {
      fscreen.requestFullscreen(document.body);
    }
  }

  openLoginExplanation() {
    this.message.info('You are logged in, that is required here.');
  }
}
