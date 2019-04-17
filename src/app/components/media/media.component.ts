import {Component, OnInit} from '@angular/core';
import {LoadModelService} from '../../services/load-model/load-model.service';
import {BabylonService} from '../../services/babylon/babylon.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent implements OnInit {

  public imageSource: string;
  public existingImage: boolean;

  constructor(
    private loadModelService: LoadModelService,
    private babylonService: BabylonService,
  ) {
  }

  ngOnInit() {
    this.loadModelService.imagesource.subscribe(imageSource => {
      this.imageSource = imageSource;
      if (!imageSource){
        this.existingImage = false;
      } else {
        this.existingImage = true;
      }
    });
  }

  public loaded(evt: any) {
    console.log(evt, 'Event');
    console.log(evt.path[0].height, 'Höhe');
    console.log(evt.path[0].width, 'Breite');
    this.babylonService.loadImage(this.imageSource, evt.path[0].width, evt.path[0].height);
  }

}
