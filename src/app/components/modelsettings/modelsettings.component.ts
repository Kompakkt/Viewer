import {Component, OnInit} from '@angular/core';
import {CameraService} from '../../services/camera/camera.service';
import {BabylonService} from '../../services/babylon/babylon.service';
import {MongohandlerService} from '../../services/mongohandler/mongohandler.service';
import {CatalogueService} from '../../services/catalogue/catalogue.service';
import {MessageService} from '../../services/message/message.service';
import {AnnotationmarkerService} from '../../services/annotationmarker/annotationmarker.service';
import {ColorEvent} from 'ngx-color';
import {LoadModelService} from '../../services/load-model/load-model.service';
import * as BABYLON from 'babylonjs';


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
  }

  ngOnInit() {

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.activeModel = actualModel;
      this.setSettings();
    });

  }

  /*
   * Light Settings
   */

  // Ambientlights

  setAmbientlightIntensityUp(event: any) {
    this.babylonService.setLightIntensity('ambientlightUp', event.value);
    this.ambientlightUpintensity = event.value;
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


  public async saveActualSettings() {

    console.log('save');

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
          intensity: this.ambientlightUpintensity ? this.ambientlightUpintensity : 1
        }
      ]
    };
    settings.lights.push(this.babylonService.getPointlightData());
    console.log(this.activeModel._id, settings);
    this.activeModel.settings = settings;
    this.mongohandlerService.updateSettings(this.activeModel._id, settings).subscribe(result => {
      console.log(result);
    });
  }


  private async createMissingInitialDefaultScreenshot() {
    return await new Promise<string>((resolve, reject) => this.babylonService.createPreviewScreenshot(400).then(screenshot => {
      this.preview = screenshot;
      this.activeModel.settings.preview = screenshot;
      resolve(screenshot);
    }, error => {
      this.message.error(error);
      reject(error);
    }));
  }

  // TODO Back to default
  backToDefault() {

    this.preview = this.activeModel.settings.preview;

    const camera = this.activeModel.settings.cameraPositionInitial;
    const positionVector = new BABYLON.Vector3(camera.position.x,
      camera.position.y, camera.position.z);
    this.cameraService.moveCameraToTarget(positionVector);

    this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
    this.setEffect = this.activeModel.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);

    const pointLight = this.activeModel.settings.lights.filter(obj => obj.type === 'PointLight')[0];
    this.babylonService.createPointLight('pointlight', pointLight.position);
    this.babylonService.setLightIntensity('pointlight', pointLight.intensity);

    const hemisphericLightUp = this.activeModel.settings.lights.filter(obj => obj.type === 'HemisphericLight' && obj.position.y === 1)[0];
    this.babylonService.setLightIntensity('ambientlightUp', hemisphericLightUp.intensity);
    this.ambientlightUpintensity = hemisphericLightUp.intensity;

    const hemisphericLightDown = this.activeModel.settings.lights.filter(obj => obj.type === 'HemisphericLight' && obj.position.y === -1)[0];
    this.babylonService.setLightIntensity('ambientlightDown', hemisphericLightDown.intensity);
    this.ambientlightDownintensity = hemisphericLightDown.intensity;
  }

  private async setSettings() {

    if (this.activeModel.settings === undefined) {
      const settings = {
        preview: '',
        cameraPositionInitial: undefined,
        background: {
          color: {
            r: 0.2,
            g: 0.2,
            b: 0.2,
            a: 0.9
          },
          effect: true,
        },
        lights: '',
      };

      this.activeModel['settings'] = settings;
    }

    if (this.activeModel.settings.preview !== undefined && this.activeModel.settings.preview !== '') {
      this.preview = this.activeModel.settings.preview;
    } else {
      await this.createMissingInitialDefaultScreenshot();
    }

    if (this.activeModel.settings.cameraPositionInitial === undefined) {
      this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
      this.activeModel.settings.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
    } else {
      // const camera = this.activeModel.settings.cameraPositionInitial.find(e => e['cameraType'] === 'arcRotateCam');
      const camera = this.activeModel.settings.cameraPositionInitial;
      if (camera !== undefined && camera !== '') {
        const positionVector = new BABYLON.Vector3(camera.position.x,
          camera.position.y, camera.position.z);
        this.cameraService.moveCameraToTarget(positionVector);
      } else {
        this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
        this.activeModel.settings.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
      }
    }

    if (this.activeModel.settings.background.color !== undefined && this.activeModel.settings.background.color !== '') {
      this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
    } else {
      const color = {
        r: 0.2,
        g: 0.2,
        b: 0.2,
        a: 0.9
      };
      this.babylonService.setClearColor(color);
      // this.activeModel.settings.background.color = color;
    }
    if (this.activeModel.settings.background.effect !== undefined && this.activeModel.settings.background.effect !== '') {
      this.setEffect = this.activeModel.settings.background.effect;
      this.babylonService.setBackgroundImage(this.setEffect);
    } else {
      this.activeModel.settings.background.effect = false;
      this.setEffect = false;
      this.babylonService.setBackgroundImage(false);
    }


    if (this.activeModel.settings.lights !== '' && this.activeModel.settings.lights !== undefined) {


      const pointLight = this.activeModel.settings.lights.filter(obj => obj.type === 'PointLight')[0];

      if (pointLight !== undefined) {
        this.babylonService.createPointLight('pointlight', pointLight.position);
        if (pointLight.intensity !== undefined) {
          this.babylonService.setLightIntensity('pointlight', pointLight.intensity);
          console.log('Die Intensität ist: ', pointLight.intensity);
        } else {
          this.babylonService.setLightIntensity('pointlight', 1);
          this.activeModel.settings.lights.push(this.babylonService.getPointlightData());
          console.log('Die Intensität ist: nicht geladen');
        }
      } else {
        this.babylonService.createPointLight('pointlight', {x: 1, y: 10, z: 1});
        this.babylonService.setLightIntensity('pointlight', 1);
        this.activeModel.settings.lights.push(this.babylonService.getPointlightData());
      }

      // const hemisphericLightUp = this.activeModel.settings.lights.find(e => e['type'] === 'HemisphericLight' && e['position.y'] === 1);
      const hemisphericLightUp = this.activeModel.settings.lights.filter(obj => obj.type === 'HemisphericLight' && obj.position.y === 1)[0];


      if (hemisphericLightUp !== undefined && hemisphericLightUp.intensity !== undefined) {
        this.babylonService.createAmbientlightUp('ambientlightUp', hemisphericLightUp.position);
        this.babylonService.setLightIntensity('ambientlightUp', hemisphericLightUp.intensity);
        this.ambientlightUpintensity = hemisphericLightUp.intensity;
      } else {
        this.babylonService.createAmbientlightUp('ambientlightUp', {x: 0, y: 1, z: 0});
        this.babylonService.setLightIntensity('ambientlightUp', 1);
        this.ambientlightUpintensity = 1;
        this.activeModel.settings.lights.push(
          {
            type: 'HemisphericLight',
            position: {
              x: 0,
              y: 1,
              z: 0
            },
            intensity: 1
          }
        );
      }

      const hemisphericLightDown = this.activeModel.settings.lights.filter(
        obj => obj.type === 'HemisphericLight' && obj.position.y === -1)[0];
      if (hemisphericLightDown !== undefined && hemisphericLightDown.intensity !== undefined) {
        this.babylonService.createAmbientlightDown('ambientlightDown', hemisphericLightDown.position);
        this.babylonService.setLightIntensity('ambientlightDown', hemisphericLightDown.intensity);
        this.ambientlightDownintensity = hemisphericLightDown.intensity;
      } else {
        this.babylonService.createAmbientlightDown('ambientlightDown', {x: 0, y: -1, z: 0});
        this.babylonService.setLightIntensity('ambientlightUp', 1);
        this.ambientlightUpintensity = 1;
        this.activeModel.settings.lights.push(
          {
            type: 'HemisphericLight',
            position: {
              x: 0,
              y: -1,
              z: 0
            },
            intensity: 1
          }
        );
      }

    } else {

      this.babylonService.createPointLight('pointlight', {x: 1, y: 10, z: 1});
      this.babylonService.setLightIntensity('pointlight', 1);

      this.babylonService.createAmbientlightUp('ambientlightUp', {x: 0, y: 1, z: 0});
      this.babylonService.setLightIntensity('ambientlightUp', 1);
      this.ambientlightUpintensity = 1;

      this.babylonService.createAmbientlightDown('ambientlightDown', {x: 0, y: -1, z: 0});
      this.babylonService.setLightIntensity('ambientlightDown', 1);
      this.ambientlightDownintensity = 1;


      const lights = [
        {
          type: 'HemisphericLight',
          position: {
            x: 0,
            y: -1,
            z: 0
          },
          intensity: 1
        },
        {
          type: 'HemisphericLight',
          position: {
            x: 0,
            y: 1,
            z: 0
          },
          intensity: 1
        }
      ];

      lights.push(this.babylonService.getPointlightData());
      this.activeModel.settings.add(lights);
      console.log('So siehts aus: ', this.activeModel.settings);


    }


  }

}
