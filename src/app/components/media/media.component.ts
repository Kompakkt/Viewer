import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs/internal/Observable';
import {Observer} from 'rxjs/internal/types';

import {BabylonService} from '../../services/babylon/babylon.service';
import {LoadModelService} from '../../services/load-model/load-model.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
})
export class MediaComponent implements OnInit {

  public imageSource: string;
  public existingImage: boolean;
  private base64Image: any;

  constructor(
    private loadModelService: LoadModelService,
    private babylonService: BabylonService,
  ) {
  }

  ngOnInit() {
   // this.loadModelService.imagesource.subscribe(imageSource => {
      // this.imageSource = imageSource;
      /*
      if (!imageSource) {
        this.existingImage = false;
      } else {
        this.existingImage = true;
      }
    });*/
  }

 /* getBase64ImageFromURL(url: string) {
    /*
    console.log('Hier: 1');
    return Observable.create((observer: Observer<string>) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      if (!img.complete) {
        img.onload = () => {
          console.log('Hier: 2');
          observer.next(this.getBase64Image(img));
          observer.complete();
        };
        img.onerror = (err) => {
          console.log('Hier: 3');
          observer.error(err);
        };
      } else {
        console.log('Hier: 4');
        observer.next(this.getBase64Image(img));
        observer.complete();
      }
    });*/
 // }

    /*  getBase64Image(img: HTMLImageElement) {
        const canvas: any = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        return dataURL.replace(/^data:image\/(png|jpg);base64,/, '');
      }

      public loaded(evt: any) {*/
/*

    this.getBase64ImageFromURL(this.imageSource)
      .subscribe(base64data => {
        console.log('Hier: ', base64data);
        this.base64Image = 'data:image/jpg;base64,' + base64data;
      });

    console.log(evt, 'Event');
    console.log(evt.path[0].height, 'Höhe');
    console.log(evt.path[0].width, 'Breite');
   // this.babylonService.loadImage(this.imageSource);
  }*/

}
