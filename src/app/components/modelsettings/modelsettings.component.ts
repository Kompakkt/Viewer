import {Component, OnInit} from '@angular/core';
import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {MessageService} from '../../services/message/message.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {ColorEvent} from 'ngx-color';
import {LoadModelService} from '../../services/load-model/load-model.service';


@Component({
  selector: 'app-modelsettings',
  templateUrl: './modelsettings.component.html',
  styleUrls: ['./modelsettings.component.scss']
})

export class ModelsettingsComponent implements OnInit {

  private activeModel;
  private preview: string;
  private setEffect = false;

  private cameraPositionInitial: {
    cameraType: string;
    position: {
      x: number;
      y: number;
      z: number;
    };
  };

  private ambientlightUpintensity: number;
  private ambientlightDownintensity: number;


  constructor(private cameraService: CameraService,
              private babylonService: BabylonService,
              private mongohandlerService: MongohandlerService,
              private catalogueService: CatalogueService,
              private message: MessageService,
              private annotationmarkerService: AnnotationmarkerService,
              private loadModelService: LoadModelService
  ) {
    this.loadModelService.Observables.actualModel.subscribe(newModel => this.activeModel = newModel);
  }

  ngOnInit() {
  }

  /*
   * Light Settings
   */

  // Ambientlights

  setAmbientlightIntensityUp(event: any) {
    this.babylonService.setLightIntensity('ambientlightUp', event.value);
    this.ambientlightUpintensity = event.value;
    console.log(event.value);
  }

  setAmbientlightIntensityDown(event: any) {
    this.babylonService.setLightIntensity('ambientlightDown', event.value);
    this.ambientlightDownintensity = event.value;
  }

  // Pointlight

  setPointlightIntensity(event: any) {
    this.babylonService.setLightIntensity('pointlight', event.value);
  }

  pointlightPosX(event: any) {
    this.babylonService.setLightPosition('x', event.value);
  }

  pointlightPosY(event: any) {
    this.babylonService.setLightPosition('y', event.value);
  }

  pointlightPosZ(event: any) {
    this.babylonService.setLightPosition('z', event.value);
  }


  /*
* Initial Perspective & Preview Settings
*/

  public async setInitialView() {
    this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
    return await new Promise<string>((resolve, reject) => this.babylonService.createPreviewScreenshot(400).then(screenshot => {
      this.preview = screenshot;
      resolve(screenshot);
    }, error => {
      this.message.error(error);
      reject(error);
    }));
  }


  /*
* Background Settings
*/

  handleChangeColor($event: ColorEvent) {
    // color = {
    //   hex: '#333',
    //   rgb: {
    //     r: 51,
    //     g: 51,
    //     b: 51,
    //     a: 1,
    //   },
    //   hsl: {
    //     h: 0,
    //     s: 0,
    //     l: .20,
    //     a: 1,
    //   },
    // }
    this.babylonService.setBackgroundColor($event.color.rgb);
  }

  handleChangeEffekt() {
    this.setEffect = (this.setEffect === true) ? false : true;
    this.babylonService.setBackgroundImage(this.setEffect);
  }

  /*
   * Save & Load Settings
   */

  // TODO Initial Load

  // TODO Back to Default

  // TODO Save

  public async saveActualSettings() {
    if (!this.cameraPositionInitial && !this.preview) {
      await this.setInitialView();
    }
    const settings = {
        preview: this.preview,
        cameraPositionInitial: this.cameraPositionInitial,
        background: {
          color: this.babylonService.getColor(),
          effect: this.setEffect
        },
        lights: [
          {
            type: 'HemisphericLight',
            position: {
              x: 0,
              y: -1,
              z: 0
            },
            intensity: (this.ambientlightDownintensity) ? this.ambientlightDownintensity : 1
          },
          {
            type: 'HemisphericLight',
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            intensity: (this.ambientlightUpintensity) ? this.ambientlightUpintensity : 1
          }
        ]
      };
    console.log(this.activeModel._id, settings);
    this.mongohandlerService.updateSettings(this.activeModel._id, settings).subscribe(result => {
      console.log(result);
    });
  }
}
