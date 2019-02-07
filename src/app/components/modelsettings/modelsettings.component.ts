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
  private isDefault: boolean;
  private isModelOwner: boolean;

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
              private loadModelService: LoadModelService,
  ) {
  }

  ngOnInit() {

    this.loadModelService.Observables.actualModel.subscribe(actualModel => {
      this.activeModel = actualModel;
      this.setSettings();
    });

    this.loadModelService.defaultLoad.subscribe(isDefaultLoad => {
      this.isDefault = isDefaultLoad;
    });

    this.loadModelService.modelOwner.subscribe(isModelOwner => {
      this.isModelOwner = isModelOwner;
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
    this.activeModel.settings = settings;
    this.mongohandlerService.updateSettings(this.activeModel._id, settings).subscribe(result => {
      console.log(result);
    });
  }


  private async createMissingInitialDefaultScreenshot() {
    await new Promise<string>((resolve, reject) => this.babylonService.createPreviewScreenshot(400).then(screenshot => {
      this.preview = screenshot;
      this.activeModel.settings.preview = screenshot;
      resolve(screenshot);
    }, error => {
      this.message.error(error);
      reject(error);
    }));
  }

  backToDefault() {

    this.preview = this.activeModel.settings.preview;

    let camera;
    if (this.activeModel.settings.cameraPositionInitial.length > 1) {
      camera = this.activeModel.settings.cameraPositionInitial.filter(obj => obj.cameraType === 'arcRotateCam')[0];
    } else {
      camera = this.activeModel.settings.cameraPositionInitial;
    }
    if (camera && camera.position) {
      const positionVector = new BABYLON.Vector3(camera.position.x,
        camera.position.y, camera.position.z);
      this.cameraService.moveCameraToTarget(positionVector);
    }

    this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
    this.setEffect = this.activeModel.settings.background.effect;
    this.babylonService.setBackgroundImage(this.setEffect);

    const pointLight = this.activeModel.settings.lights.filter(obj => obj.type === 'PointLight')[0];
    this.babylonService.createPointLight('pointlight', pointLight.position);
    this.babylonService.setLightIntensity('pointlight', pointLight.intensity);

    const hemisphericLightUp = this.activeModel.settings.lights.filter(obj => obj.type === 'HemisphericLight' && obj.position.y === 1)[0];
    this.babylonService.setLightIntensity('ambientlightUp', hemisphericLightUp.intensity);
    this.ambientlightUpintensity = hemisphericLightUp.intensity;

    const hemisphericLightDown = this.activeModel.settings.lights.filter(
      obj => obj.type === 'HemisphericLight' && obj.position.y === -1)[0];
    this.babylonService.setLightIntensity('ambientlightDown', hemisphericLightDown.intensity);
    this.ambientlightDownintensity = hemisphericLightDown.intensity;
  }

  private async setSettings() {

    if (this.isDefault) {
      this.activeModel['settings'] = this.getDefaultLoadSettings();

      this.babylonService.createAmbientlightUp('ambientlightUp', {x: 0, y: 1, z: 0});
      this.babylonService.setLightIntensity('ambientlightUp', 1);
      this.ambientlightUpintensity = 1;

      this.babylonService.createAmbientlightDown('ambientlightDown', {x: 0, y: -1, z: 0});
      this.babylonService.setLightIntensity('ambientlightDown', 1);
      this.ambientlightDownintensity = 1;

      this.backToDefault();
    } else {

      if (this.activeModel.settings === undefined) {
        const settings = {
          preview: '',
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
        const cameraSettings = [];
        cameraSettings.push(this.cameraService.getActualCameraPosInitialView());
        this.activeModel.settings['cameraPositionInitial'] = cameraSettings;
      } else {
        let camera;
        if (this.activeModel.settings.cameraPositionInitial.length > 1) {
          camera = this.activeModel.settings.cameraPositionInitial.filter(obj => obj.cameraType === 'arcRotateCam')[0];
        } else {
          camera = this.activeModel.settings.cameraPositionInitial;
        }
        if (camera !== undefined) {
          const positionVector = new BABYLON.Vector3(camera.position.x,
            camera.position.y, camera.position.z);
          this.cameraService.moveCameraToTarget(positionVector);
        } else {
          this.cameraPositionInitial = this.cameraService.getActualCameraPosInitialView();
          this.activeModel.settings.cameraPositionInitial.push(this.cameraService.getActualCameraPosInitialView());
        }
      }

      if (this.activeModel.settings.background === undefined) {
        const background = {
          color: {
            r: 51,
            g: 51,
            b: 51,
            a: 229.5
          },
          effect: false
        };
        this.activeModel.settings['background'] = background;
        this.babylonService.setBackgroundColor(background.color);
        this.setEffect = background.effect;
        this.babylonService.setBackgroundImage(background.effect);
      } else {
        this.babylonService.setBackgroundColor(this.activeModel.settings.background.color);
        this.setEffect = this.activeModel.settings.background.effect;
        this.babylonService.setBackgroundImage(this.setEffect);
      }

      if (this.activeModel.settings.lights === undefined) {

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
          },
          {
            type: 'PointLight',
            position: {
              x: 1,
              y: 10,
              z: 1
            },
            intensity: 1
          }
        ];

        this.activeModel.settings['lights'] = lights;

        this.babylonService.createPointLight('pointlight', {x: 1, y: 10, z: 1});
        this.babylonService.setLightIntensity('pointlight', 1);

        this.babylonService.createAmbientlightUp('ambientlightUp', {x: 0, y: 1, z: 0});
        this.babylonService.setLightIntensity('ambientlightUp', 1);
        this.ambientlightUpintensity = 1;

        this.babylonService.createAmbientlightDown('ambientlightDown', {x: 0, y: -1, z: 0});
        this.babylonService.setLightIntensity('ambientlightDown', 1);
        this.ambientlightDownintensity = 1;
      } else {

        const pointLight = this.activeModel.settings.lights.filter(obj => obj.type === 'PointLight')[0];
        this.babylonService.createPointLight('pointlight', pointLight.position);
        this.babylonService.setLightIntensity('pointlight', pointLight.intensity);

        const hemisphericLightUp = this.activeModel.settings.lights.filter(obj => obj.type === 'HemisphericLight' && obj.position.y === 1)[0];
        this.babylonService.createAmbientlightUp('ambientlightUp', hemisphericLightUp.position);
        this.babylonService.setLightIntensity('ambientlightUp', hemisphericLightUp.intensity);
        this.ambientlightUpintensity = hemisphericLightUp.intensity;

        const hemisphericLightDown = this.activeModel.settings.lights.filter(
          obj => obj.type === 'HemisphericLight' && obj.position.y === -1)[0];
        this.babylonService.createAmbientlightDown('ambientlightDown', hemisphericLightDown.position);
        this.babylonService.setLightIntensity('ambientlightDown', hemisphericLightDown.intensity);
        this.ambientlightDownintensity = hemisphericLightDown.intensity;
      }
      this.backToDefault();
    }
  }

  private getDefaultLoadSettings(): any {

    return {
      preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABrEAAAILCAYAAABPUre8AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTQwIDc5LjE2MDQ1MSwgMjAxNy8wNS8wNi0wMTowODoyMSAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIChNYWNpbnRvc2gpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjI5NkQxREYzRDQ5NjExRThCQTE2OTA2RkNGNjJGQjJDIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjI5NkQxREY0RDQ5NjExRThCQTE2OTA2RkNGNjJGQjJDIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6Mjk2RDFERjFENDk2MTFFOEJBMTY5MDZGQ0Y2MkZCMkMiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6Mjk2RDFERjJENDk2MTFFOEJBMTY5MDZGQ0Y2MkZCMkMiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6XJKqZAAB/q0lEQVR42uzdT3MkV7Uo+k0fH8P1bew2DgII4uFyBHdiBqhHjAhXByNGVg8YvQHV+gJWfwKpP4HaX0ASgzdi0M3ojAjJwYhRywM8uY5w4RcEnCBsy6avn/Hh4FersopWq/WnJOXO2pn5+0WUug12SVqZuSv3XrnW/tpXX32VAAAAAAAAoCTXhAAAAAAAAIDSPDf/y9e+9jXRgDbZHg+P/NPRv780ea0c+7dvnPC/VdYGX6vx5zn6cxxOXgdHvs++gwYAAAAAwGmOdw98TkigMNvjSDZF0mkwex1NSs3/vxINJ6+NM36v+d+OJrfiz0+P/G+HaW1w4CQAAAAAAEASC5ahqlqaV0e9mqpkVckJqjrF7zic/X14Qmzi65OkVkrvTl7j2esgrQ0OnUAAAAAAAN0niQU5VcmqeaIq/hzMXpztaKJr9VhM5wmueRXXfpLcAgAAAADoHEksqMP2eJCqJFW8fpyeJKyo3zzBNZz988bsGMyTW++kJ1VbWhMCAAAAALSUJBZc1PZ43gZwOHm9kfrTBrB0x5Nb89aE+6lKbr07/fvaYCxUAAAAAADlk8SC82yP5xVWkbAaJhVWbTNMTye2omJrPz1Jau0LEQAAAABAeSSx4LgqaTVMT5JWqqy6JY7n6uy1caRa650kqQUAAAAAUAxJLKj2s4qEhqRVfw1nL0ktAAAAAIBCSGLRP9WeVsPJ682kPSAnG6YnSa15+8FIaj20pxYAAAAAQDMkseiHJ9VW88QVLOpo+8Gtybk0TpHMiqTW2uCh8AAAAAAA5CGJRXdVe1v9MlXJh4GAUJM4l9anrydVWr9JVZXWofAAAAAAANRDEotu2R7Pq63iT3tbkdvRKq2dyfkXlVmR0NrXdhAAAAAA4GoksWg/iSvKMU9oxXl5MPn6q8lrV4UWAAAAAMDFSWLRTk9aBY6SxBVlWpm9to5UaGk5CAAAAACwIEks2mN7PEhV0iqSVwMBoUWOtxz8VVobPBQWAAAAAIDTSWJRtu3xfM+ht1JV1QJtVyW0tsdRkbWbqoTWgbAAAAAAADxNEosybY+Hqaq4ss8VXRXn9fr0Zf8sAAAAAIBnSGJRjqrqapSqqquBgNAjR/fP2k1Vdda+sAAAAAAAfSaJxfI9qboaCQZMr4PR5LoYT/58O6nOAgAAAAB66poQsDTb41iofzT5216SwILjBikqs1L6YHKd7ExeAyEBAAAAAPpEJRbNqhbiR6lqGWivKzjfvM1mJH33U1RnrQ0eCgsAAAAA0HWSWDRjexz7/UTiaiQYcGnD6atqNXhv8nqo1SAAAAAA0FXaCZJX7He1PY52gdE2cCQgUIvB5LWTqlaDm5OXqkYAAAAAoHMkscjj6f2uhgICWUTyamPy+sS+WQAAAABA10hiUa8qefVBqqpEVgQEGjNKVWWWZBYAAAAA0AmSWNTj6eTVQEBgaUZJMgsAAAAA6ABJLK5G8gpKNUqSWQAAAABAi0licTmSV9AWoySZBQAAAAC0kCQWFyN5BW01SpJZAAAAAECLSGKxmO3xcPJ6lCSvoO1G6Uky64ZwAAAAAAClksTibFXyam/yt3itCAh0xihVyaxNySwAAAAAoESSWJws2o1FpUaVvBoKCHRSJK82UpXMGgkHAAAAAFASSSyeFhUZUZkRi9pVpQbQfZHM2pnudxfVlwAAAAAABZDE4omqEiOSVxuCAb00SFF9GS1EoxoTAAAAAGCJJLE4uu9VtA+0Nw4wTFWLwS37ZQEAAAAAyyKJ1WdV60D7XgGnWU/2ywIAAAAAlkQSq6+2x9XitH2vgLPN98uKFoMrwgEAAAAANOU5IeiZahE6qq8sRgMXMZy8Hk3GkPuTP++ltcGhkAAAAAAAOanE6ouqdeBWikVoCSzg8tZTlcxaFQoAAAAAICdJrD7YHg9TlbxaFwygBoPJ68FkbInXQDgAAAAAgBwksbqsqr56MPnbXqoWnQHqFNVYj2Z77AEAAAAA1EoSq6uqVl8fpGqRGSCXG5PX1mTM2VOVBQAAAADUSRKra55UX8XrhoAADRkmVVkAAAAAQI0ksbpE9RWwXKqyAAAAAIDaSGJ1georoCzDpCoLAAAAALgiSay22x4PUywWq74CynK0KktyHQAAAAC4MEmsNtseb02+7k1eA8EACjVM0ea0ancKAAAAALCw54SghbbHK5OvO5PXimAALRCVWA8mY9f9yZ/30trgUEgAAAAAgPOoxGqbao+ZqL6SwALaphq/qkQ8AAAAAMCZJLHaIvaU2R4/SLHHTFXVANBGkcB6NEvIAwAAAACcShKrDaqqhUeTlz1lgK7YmibmI0EPAAAAAHACSazSVdUKkcAaCAbQMaupqsrSXhAAAAAAeIYkVqmq9oE7qWofCNBVg6S9IAAAAABwAkmsElVVCXuT10gwgJ7YmibutRcEAAAAAGYksUqzPY72WpHA0l4L6JvRdPzTXhAAAAAASJJYZdkeR+vAB5OXSgSgr6pK1CqhDwAAAAD0mCRWCar9r6L6yp4wAFUi/8FkXNwUCgAAAADoL0msZXuy/9VQMACesmGfLAAAAADoL0msZbL/FcB5RqlqLzgQCgAAAADoF0msZdkej5L9rwAWEYn+R7PKVQAAAACgJySxliHaY6W0IxAAC4uE/6PZAwAAAAAAQA9IYjUp9nXZHkf7wJFgAFxK7JG1KQwAAAAA0H2SWE2JBFa1/9VQMACuZGNW0QoAAAAAdJgkVhOqfVw+SNW+LgBc3Wgytj6aPSAAAAAAAHSQJFZu2+NhqiqwLLQC1GtlOr5KZAEAAABAJ0li5bQ9HiUJLICcqkrXquIVAAAAAOgQSaxcqgSWPVsA8qv2HJTIAgAAAIBOkcTKYXu8lSSwAJo0T2SNhAIAAAAAukESq27b40herQsEQOMikbUjkQUAAAAA3SCJVacqgTUSCIClksgCAAAAgA6QxKqLBBZASSSyAAAAAKDlJLGuant8Y/LaSxJYAKXZmT1gAAAAAAC0kCTWVUQCK6VIYA0FA6BII4ksAAAAAGgnSazLepLAWhEMgKJJZAEAAABAC0liXYYEFkDbSGQBAAAAQMtIYl2UBBZAW0lkAQAAAECLSGJdhAQWQNtJZAEAAABAS0hiLUoCC6ArJLIAAAAAoAUksRb3IElgwVleEgJaRCILAAAAAAonibWIaqFzKBB09Pyu69yW5KVtIpG1KQwAAAAAUCZJrPNUCayRQNBhb9b0PpJYtNHGZJw3xgMAAABAgSSxziKBRT+s1nCtxHVyQyhpqR2JLAAAAAAojyTWabbHW0kCi34Y1NBSbUMYaTmJLAAAAAAozNe++uqr6i9f+5pozFULmTsCQY8cTl630trg4BLXSyR814WQjrh5qesAAAAAALiyec5qTiXWcRJY9FO0AtybnP8rl7heJLDokotfBwAAAABAFiqxjtoeD1MsYEJ/RUXW3bQ22D3nWomkl5abdPk6uKUiCwAAAACadbwSSxJrrnryPhJYN5wmkMaT19uT10FaG+zPrpG4NuI6eTNVySvXCl0WCaxIZB0KBQAAAAA0QxLrJNXi/AfJojwAT0hkAQAAAECD7Il1XJXAUoEFwHFRebglDAAAAACwHJJYKT1I1UIlABw3StvjHWEAAAAAgOb1O4lVLUwOnQYAnCESWSNhAAAAAIBm9XdPrGpB0tP1ACwq9sfaFwYAAAAAyOP4nlj9TGJtj1dT1UYQABZ1mKpE1oFQAAAAAED9JLG2x7H/1d7kdcPpAMAFjSevm2ltcCgUAAAAAFCv40msfu2JtT2OxFW0EJTAAuAyBkklLwAAAAA04lrPft9YeFxx2AG4gmHaHttTEQAAAAAy608Sa3u8lWLhEQCubjT5XBkJAwAAAADk0489sbbHq0n7JwDqF/tjHQgDAAAAAFzd8T2xup/E2h5H+8C9ZB8sAOo3TlUi61AoAAAAAOBqjiexut1OcHsciavYt0QCC4AcBkmlLwAAAABk0fU9sWIfrBWHGYCMhml7vCkMAAAAAFCv7rYT3B6vpyqJBQBNuJ3WBg+FAQAAAAAupx97YlX7YD1yuAFoUOyLFftjjYUCAAAAAC6u+3tiVftg2Z8EgKb5/AEAAACAGnVxT6ydyWvg0AKwBCtpe6yVLQAAAADUoFvtBO2DBUAZbqW1wb4wAAAAAMDiursnVrUP1l6q2jkBwDLF/livpbXBoVAAAAAAwGK6vCdWtBGUwAKgBPbHAgAAAIAr6kYSq9p/ZMXhBKAgw1mbWwAAAADgEtrfTnB7PExVG0EAKNHNtDY4EAYAAAAAOFu32gluj6Nd047DCkDBfE4BAAAAwCW0vZ1gLAwOHEYACrYya3sLAAAAAFxAe9sJbo9XJ18fOIQAtMSttDbYFwYAAAAAONnxdoLtTGJVbQQ/mLxuOKQAtMQ4VftjHQoFAAAAADyrK3tiRRtBCSwA2mQweW0IAwAAAAAspn2VWNoIAtBu2goCAAAAwAna3U5QG0EA2m+ctBUEAAAAgGccT2I917KfXxtBaNDwu9946p8PPv4yHX75T4GBqxmkqq3gXaEAAAAAgNO1pxJrezycfN1zyCCv0Q+vpzdf/R9p9QcvnPj/7//li/Sr//1/0u77jwULriaqsQ6EAQAAAAAq7WwnWLURfJSqp9eBDCJ5tXHzpTS4vliBZiSz7v7+k2l1FnApB2ltcFMYAAAAAKByPIl1rSU/d7RdGjh8UL+ouPrgF99POz99ZeEEVohWg4/e/F7a+snL6cbz1wQSLm4lbY83hQEAAAAATlZ+Jdb2eCVVVVhAjSIJFZVXx/e9uozx439Mq7Iefvi5wMLFHKaqreBYKAAAAADouzZWYu04bFCfSFrt/fw701cdCawQFVwPfvbt6XtepJoLSDd8zgEAAADAycquxNoer0++bjlMcHV1Vl6d5fDLf6a33/tb2nx0KOiwuNtpbfBQGAAAAADos+OVWOUmsbbH8XT6B6l6Sh24pKaSV8dFi8E7v/so7f/lCwcBFrhkUtVWUPYXAAAAgN5qUzvBqMCSwIJLytE28CKirWB872gzeOP5aw4InHPJTF7rwgAAAAAAT5RZibU9Hk6+7jk8cHHLqrw6S7QYvPfo03T/vc8cIDjba2ltMBYGAAAAAPqoLZVYGw4VXMyyK6/OEpVYWz95OT1683tp5VvPO1hwuh0hAAAAAIBKeZVY2+NRsogHC4u2fTs/faW4xNVZoiIrKrOiQgt4xu20NngoDAAAAAD0zfFKrLKSWNvj2APrg2QvLDhXJK+ibeDoh9db+fNHAuvu7z9Ju+8/djDhaeO0NnhNGAAAAADom9LbCcam9hJYcIZ55dUHv/h+axNYIVoMxu8R7Q/jdwKeXOZpe7wpDAAAAAD0XTmVWNvjQaqqsIATtL3y6jz3Dj5N9//wmRaDUDmcvF5La4NDoQAAAACgL0quxNpweOBZXam8OncAWHkpPXrze63a2wsyiqrkLWEAAAAAoM/KqMTaHg8nX/ccDnii65VXZ3n44efT/bLGj//hRKDvohprLAwAAAAA9EGplViqsGCmL5VXZ1n9wQvTqqz11190QtB3O0IAAAAAQF8tvxJLFRZM9bny6iwHH385rcra/8sXgkFf3Uprg31hAAAAAKDrSqzEsucHvXbj+Wtp8+aNaeWRBNazVr71fNr7+Xem1WkRK+gh1coAAAAA9NJyK7G2x6OkVRI9FQmZ9R+9mN56/ZuSMws6/PKf06qs3fcfCwZ9czutDR4KAwAAAABddrwSa9lJrA8mXwcOC30ieXV10VowklnRahB6YpzWBq8JAwAAAABdVk4SSxUWPdOW5NX48T/Sww8/T+/8+e/Tyqe5N1/9H2n1By9M9+4qxb2DT9P9P3z21M8JHXYnrQ12hQEAAACAriopiaUKi15oU/Lq3qNPz23Vt/76i2nj5kvF/C7xc0dVViTeoONUYwEAAADQaWUksVRh0QNdS14d/922fvJyGv3wejG/R7QYvPO7j6a/D3SYaiwAAAAAOquUJJYqLDqry8mr44bf/Uba+ekrxbQYjLaCb7/3t7T56NCJSFepxgIAAACgs5afxFKFRYdt3rzRi+RV6b93/I5RlRXVWdBBqrEAAAAA6KQSkliqsOicaKsX+0SVUpF0khzJq6Pid4+qrKjOKkX8rrFfVlRoQYeoxgIAAACgk5abxFKFRcdIXj1r9QcvTPfLKqnFYPz+99/7zAlLl6jGAgAAAKBzlp3EUoVFJ7QheTXfH+r+Hz5rvBJpvi/YxspLxcTj4OMvpy0G40/oANVYAAAAAHTO8pJYqrDoAMmri1n51vPTqqySWgxGRVZUZmkxSAeoxgIAAACgU5aZxHo0+briENBGkldXj18ks6JCq5RYRVXWww8/d3LTZvtpbXBLGAAAAADoiuUksbbHw8nXPeGnbSSv6hMJrEhkRUxLsf+XL6bJrNg3DFrqVlob7AsDAAAAAF2wrCRWJLCGwk9bSF7lE60FI5kVrQZLce/g09bFEWZUYwEAAADQGc0nsbbH0ULwkdDTBpFg2fnpK5JXDVh//cVporCUFoNRjRVVWVGdBS3zWlobjIUBAAAAgLZbRhJrZ/J1JPSULJJXkVCJP0vVleTVUZEsjKqs1R+8UMzPFPtk3f39J1oM0ia7aW1wRxgAAAAAaLtmk1jb48Hk6wfCTqkkr8o5DiVVwEWc7z36NN1/7zMXCW2hGgsAAACA1juexMrdx2sk5JQokiZ7P//O9FVqAmuaSDn4NL326z+lzUeHnd6vKVr4xe8Zv28JosVhVIg9evN7RSc4wectAAAAAF2WuxLrk8nXG8JMKVRelS+qsaIqq6RjFBVZUZnVx+NBaxymtcHLwgAAAABAmzXXTnB7PJp83RFySlBiYuQku+8/niZL7MeUpvtkxTGLqqgSRAIr9sqKYwSFupPWBrvCAAAAAEBbNZnEejT5uiLkLNvKt56ftg0sJRlyEsmrk8Uxi8q59ddfLOZnitaHkcw6+PhLB4jSHKS1wU1hAAAAAKCtmklibY+Hk697ws2ylZ7Akrxa/DjGHlUlVdLF/l19bflI0W6ltcG+MAAAAADQRseTWLlW9n8p1JTgwc++XWQCK5JXr/36T+nO7z6SwFpAVD3d+o//nFZAlZI02lh5KT1683vTtodQEJ+/AAAAAHRG/ZVY2+Mbk6+fCC3LNvrh9emeSiVReXV1kZSMqqw4vqV4+OHn0wSb40ohXk5rg0NhAAAAAKBtmqjEGgkzJXjrR98s5mdReVWfqMSKOEZlVimxjGqsqMravHnDAaIEPocBAAAA6IQclVgfTL4OhJZlimqdT/7v/2vpP4fKq/wicfTW698spm1kHOtIsu3/5QsHh6Wdhmlt8JowAAAAANA2xyux6k1ibY+Hk697wsyyDb/7jbT38+8s7ftLXjVrcP25aYvBkvaninOgpD286J1baW2wLwwAAAAAtEnudoI2lKfXtA1cjoj17d/+dfoqJe6xZ9cHv/h+Wn/9RQeIZfB5DAAAAEDr1VeJtT2OzWCilaBNYVi6piuxVF6VI9oKrv/oxbSx8lIxP1O0FoyqrIOPv3SAaNLLaW1wKAwAAAAAtEXOSqzVJIFFIZpKJkVy4tZ//KfKq4JE+77NR4fTirhS9qWKpOqjN783bXlYyt5d9MJICAAAAABoszpXU98STkoRCaWcSaV58ipepSRKePYcmCcYS9mXKloLRovBkvbuotO0FAQAAACg1eppJ7g9HqSqlSAUY/PmjdpbykXCKtoGSly1S1Q/bdx8qaj9qeIcUsFHA26mtcGBMAAAAADQBrnaCY6EltLc/8NntVXgqLxqtzgPYk+qOH6l7EsVLQajKiuSrZCRaiwAAAAAWquuSqyowhoIJ6WJRMHez79z6f9e5VU3RUVWVGaVsj9VVGNFVZbzjBynV1obvCYMAAAAALTB8Uqsqyextscrk6+PhJZSjX54Pe389JUL/TeSV90XCaw4L0ran+rhh58XtYcXnXE7rQ0eCgMAAAAApcvRTlCrIoq2+/7jdPM3f14oIaVtYH9Eouj2b/86Pdal7EsVCbVoMVjS3l10wptCAAAAAEAb1VGJ9cnkq01daIWVbz2ffvm//uf0z6Nin6Tf/PH/k7jqsdibamPlpWJ+njgnYx8v5yQ1OExrg5eFAQAAAIDS1dtOcHu8Ovn6QFiBLhhcf27aYjD2UivF/fc+m7a21GKQK9JSEAAAAIDi1d1OUIsioDOirWC0F4w2g6W0GIzWgtFiMPZ2A5/XAAAAAPTJVZNYq0IIdM3DDz+f7qMWVVAluPH8tWmF2N7PvzOtFgOf1wAAAAD0weXbCWolCPRA7J+29ZOXi2oxeO/g03T/D59pMchFaSkIAAAAQNHq2xNre7wz+ToSUk4S1SKrP3gh/fiVf/9X5UgsuL/z579Pq1xKadUGi4p2fpHMiqqoEsQ1dPf3n0yvJ1jQblob3BEGAAAAAEpVZxLrg8nXgZByVCSsou3ZeVUru+8/ni7AqyShTSKBFYmskvaniiRWXEsSwyzgMK0NXhYGAAAAAEpVTxJre7wy+fpIODkqFvYjgbWoSGDd+o//TAcffyl4tEokaSOZFa0GSxDX0tvv/S1tPjp0cDiPloIAAAAAFKuuJNbW5Ou6cDIXrQMf/Ozbl/pv7/zuo2llFrTN5s0b6a3Xv1lMi8FICEdV1v5fvnBwOI2WgsBZ9/g3Jl9Xjvwvw0U/glJUe1bGk3FmLJgAAABcRl1JLK0E+ZdYwP/gF9+/0kK+9oK0VbTQjKqsSOSWwvXEGWJx+TVhgB7bHg9m9/HDyeulVCWtBpnu7fdnf74zHX+qMWjfQQAAAOA0V09iVRPfD4SSuWghWMceQVFFcvu3f7W3D60ULQbjWoikVgkigXXv0afp/nufOTgcdzOtDQ6EAXrgSWXVcPJ6Y/b3GwX8ZAez17spEl3GJODJuDVK/X1gdv+pcXJtoFc4AD7T6aWv7ry6efSfL5PEijaCW0JJqKMK66hYeI9ElnZotPV6WP/Ri2lj5aVyZsKTaymqsuw9xxH30tpgUxi44mRkJ+N3uDM5R3cF+tLHZzVVCathero1YMlioXY/VRVbD3vTjrCaV+VKKu5q69iJc6TuxHP57T63x3tp8VamfRBj49Gkv+u6b5/p9rOlPedrfF7tZbz/jLHwlgT/0uZoF99f22c6V/DVnVefSlZdJonlBORfrrIX1lli0V0FCW0V1VhRlRXVWaWI6ykqs7QYJFVP9t4UBi45OVqZTU5zLrzbt+1ix2QQt2SpSlytduS3GqdIZqX0q85WaVXX0qOM3yEWeG6pcnOOHFP+gyzWG4yPHB8DPIBGW87ZSKCM3Nd08r7ycnM0n+lcwdWSWFVW/RNhZG7z5o1sVScPP/w83fndRxbdaa1osxn7ZdVVqXjlGe/jf0wTxHFt0XuveZKXS0xCbswmR4NM3yGeML8l0AsdizgGkbD6ZWpPtdWlP75StWD7dufGrfxPzEa8bnpi2Xh7hCRW98bHXyWVl10dBx4d+YzXDpzSz9fcXbtu2Vf1zHuG2PYn10OG0SXhts90mnY8iXXRlVUnHo2JKq+9n38nrXzrecGglXbff5xe+/WfiqkqjAqxqJyM66qUvbtYGp/nXMaDlC+BFQszt4X4nAlqJD2qRa0PZgsFKz34zeOcW5/+zvG7VzG40YnfrGqbuZs5dg9cPK20k+whwWLX+MZsfNyZPeBANz7zN499xu8ICgWfr8OUN4F1RwLrTDm7ZBxM4w8FuGgS600ho0mRwIoF90hoQRtFJWFUP938zZ+L2Zcq2hw+evN7rqt+83nORSensXgyzDVUzianqkVOjv3KLP7RDSH+XOlxNFZmMejOgm3VmiXn0/XDSZzsZ9yua34zdac1KM0ZJcms7nzuV8nJpz//qrEBSjxfcz4ws2uv3HPnaLnmBjE3u22ORilUYlG8aMUW1SPRlg3aKhJYkciKhFYJLTLn11W0BKWXfJ5zkcnRKOXrb59mkyMtcp6N+3DWguNR5vi38vYwPVmw3Zudo212a7ZQkMv6JEaSIm257p9dvIaLmI+Nm52pWu2f06quNmYJAyjlM+vG7HzNNdbs2yt3qXO0W1rVUpJrF7g4BklLA445+Ki5ypL111+cVmWVsr8QXEa0FowWg9FqsASxp52KrF66YRLMgvd/88qXXLQHOWlCuj2OdoF6yC9mOD1HI2ZtTWZVT7jm3g9ux7hf/LUfi4DaP1LbbX6KhyAksNs2Dmyms6sqtBWkJDmrgLQaX/4czUOGFOUi2QCTaJ7RdEXJvA2afbJo+3Vz53cfpVv/8Z9p/Pgfy7/z/OkrksP9ZFGD8yZHsaC6l/E7aA/ydLznySt74VzOILU5mVUtFOR82vjGLD4qM8r1IOV7mp3+josPJtf9A9d+K+4DTmojeJy2gpRyvm5mnE9qNX527AeZ52j3zdEo0UVWLe2fQRl34tefm1ZkjX54XTBotf2/fDGtyrp38OlSWwxGAks1Vi+9IQScI+cmwdqDPJmIDiWv6r1VTG1NZlULBvczfofcT+1y+XFgM3lolHxiofmRasziLbp/4Vv2PWPJn1kxpuRsfavV+Omxn1dt55qjPZzE/q5AUyKVWLRSLLpH9Ui8oO02Hx1Oq7KW6Y3vfd2B6B+f65w1QdIeJH+M53texWvgpKtdxHRntmdWe8a7auFgP+N3WPUUf3FjQe7FQJiPiY86sIdgV8eB9Qvcm8/3IYJlnKtajS/XVuY5mocMKdZiSaxqkFJ+zjOW3QotqrGivaBWaLTdwcdfLnWfrKhwpJeTkKEgcMJ5MUr5NgnWHiSeoKyShPa8asZwGuuIeXvaaUWSd5zx/Tfsk1PMeDBIFqNp1s7sM4iyxoGLJrKHs8QXNHsPW31m5bqf0mr87PivZ56j3dbCkZItuvJvgs2JStjPJ/bH+uAX37dPFq33x8f/LQg0zec7xydHuZ+uvNXr9iDV5PODjBNQTjeaxr4Ni37VAsLt2YJCLjtaixXBPlgsZzyUyCrJZZMCG9oKsoRzNde9w0Otxs+cQ8S8fSvjd4g52ligKdmiSSz7ZlC0qMSKiqz1118UDFrrx9/6d0GgaT7fOTo5GqS8mwTf6W0CK5IF2+NHs8mnBesl3jJOj0HVYnBQ9E9aXSt3MseiTdVpXRwXcrYEgvNEIuuBMWDp48BF2giePI5Dc59Zuaq4tbE7f472wByNvlOJRads/eTl6T5Z2gvSNsPvfiOt/uAFgaDxU08ImE2Ocm8SfL+37UGq/YcigWWxuqyx71HxVVlrg4eTr/cyfoc4J7ecDksZF2IhUCswlm3VGLDUcWCQrr4fnraCNHGujjJ+ZmljZ44GC3lugQvGflic/Ynz5T+LShrFPlnRWvD2b/9aRLtDOHf2+IMXpslXWNKN8dDmuaS8mwRHe5C7Pby25q0Z25S8OkhPWti9c4H/bl7VOZi92mBelRU/e7n7tK0NNic/449Tvqefoxrj3cn3uW8YbHxsgCKmz5Nz8rCXn9PLV9feQtFW8KFWYGT8zNLGrptztF1jP23y3AL/jqdGOdPBx19Oq0hKEkmsaC8Yiaz9v3zhIFGkwfXnpsmrEq4fCd9eG05e+8LQ68lpzk2C+9kepIppyU+3H8xe787+HNe6gFA9XT6YjS+vzv4cFBqL1VQ9yX674IT+nVn8cs3LIpl34IGGRsaGefsvD4lSkvVZMntXKBq9TxjW9G7zceWWwJLhMytnFZA2dmfHfzPzHE0Ci1ZZJIllvwxaKarD9n7+nXTv4NO0+UhlMmWdm+s/ejFtrLxUzM/0x8f/7cD0l8/5fk+OhilfsqV/7UGeLFCvFvaTxUT1NykS1k0kKqqE2DgdTZBXsRnOxpyIz6Ckj+YU+8Ftj+9NK59KE9fQ9vhOqvasy7WQFHvj3PQ0dHb2waJUO7NktgXl/PcK8fm3UfO7Dqct3yQiqfveIN/9mjZ2Z48TqxnGiaNztFtaONI2X/vqq6+qv3zta6ddOHr4c6ZIFJVWiXXcww8/T3d+99G09SEsU7QOjL3bogqrJJK9vRYtZF4Whl5OjmJSGvd5uRbFb/ZqMay89oGxn9I8cTUu9PyLCfovC5trRNzKbC9YJZ33Mn6HuF4tauQ7fqO0/DaCZSZqu3esbxwZ1+K6fWn2z6Vv1TCefXYbA/KeH3spz760cdxec/yo6TyNhy5y7YMV7S9vC/KZc4pcDy7NE1gHDf4ufa4+r/O+fXfy+lWfgvfVnVf3j/7zcxe4+YKTR8AWJIYicTD4+XPTRFa0P4SmldQ6EI65Mb259ORt3yZH2oPUG89IxpTQImw8eb09WxwYFx2z6ue7P31VCa1RqhJag2XfNk5/hqh8Ku0cjiq67XG0fslVPTnf96J/LUDzjxG59xShrGs1Fgn3Z/+0f8K5EK+oSh2msqpSB7PPMovL+caCOtsIPntP7/hRz3ka92S5Elj9bDV+sTlazjnF3Ubvb/u+xrBd63Tsj71r/X3nq6f+8doCExk407sf/1crfs7YJyuqxiKhBU3avHkjffCL7xedwDr8uyrFnvN53z85W1r1qz1ItSCVMyG4iJjQROvGeAL7futawsXPG9Uh8fNXCxvLnqBVT8BWlU+lxSoSfzmvr9Fs8Yr6xgj7YHH0Gj6YfkauDe7MxryXZ+NeXNclVNCszh7MIM9YsOH4Ufh5mvOhi/61Gr+4nF0d7mnhSJudl8QaChFdEnsRPfjZt6ft3CC3SFpF8qqkva9Oo0Kx934sBL2anG6mfJsERwXQ3R7Fcictt7piP1UtQeL1sBMxrRZ3b6Vqg/r9Zd42piqRNSowSnGN5XyydWe2iEVd8fSwCKePeYf/SmpFK7gyEvk7s4QL9Y8FNxw/Cr6vre598p2nt+y9ee4cLVcSelc7YdruvCSWRS06af31F6dVWZHUgrpF68BIlsY5VtreV3CKoRD0ZnKUc5PgfrUHqRJYoyV99/30JHm138n4xu9VRjJrZ7aoUFJsDmdxyfkk855F0FrGiajUVBXB4td2GYn8uPa1v6z//mu1weO3I+hc6rNfq/GuztHuCjJtpxKL3ooqmUdvfm/aZhDqEq0D47zStpKW8YR4PyZHcZxzLWr0pz1ILOxvjx+l5SSwYhLa7eTVcU8ns5a1+LExS1qWFJd5IiuX+dPYXG3MlQigrWPfSEVmjfcNzSeVtBXkouepNnbdnaPd0sKRLrh2xkU0SPp2s4D9P3/R2p89qmSiWmb0w+sOJFdytHWgCj9aevM8FIROH9+ce7LMJ0fjnsRxLzWf+I0YxxOsN3u3oe9ctaB7M1XVfss410YFJrJyVz+uFPc7t2useCAQ1Dj23VvCd5eErcey9sTTVpBFP7NGKd/DWdrYLXa/kHOOJoFFJ5y10joQHvogEg47P31l+oKL6krrwP2/fOFg4mnbbsv5dOXdXrQHWV4CKxYuX/ME60wVh2Ut6JaYyIp47Gb+nUdOvEuNuebT1Hmtb87GviY/b4cecrryvUOTbQSP0xaSRc7RnFVA2tid70HG+4W7WjjSJdfOvGGBHolqrGgDp4qGRWkdSMfYB7O7k9PNlG8BpU/tQWKS2WQCaz/FgmUsXHqC8mnVvjGbqVrQ3W/6lrHARFZUY+VcpNjRVqyYMZd+j31VS9mUHjb4Xd8S+EuPBSXsTTWSiOScczRX62BVQOfHP5LMua7Pux6Ao2vOWq23mEXvxP5Y0RIuWsPBabQOpKMGQtDJyVHOTYL70x6kSloMG/puh7OJ5y1PT54j4lPtGXN3FremjGaJipJEHMYZ3/+BtlQLjRXDjGMuzJP4t1PeCsyjVmdbTXBxy2oj+OzPYfzmZHtJG7tl3S+MJl/XM87R7gsyXXPW6qun7VjIwcdfdur3iaREtIZbf/1FB5dnzo1oO9n21oFwiqEQdG5ypD1IPXGMGI6auq2aTfpNPC+iitet1GybrY2i2uxVC0WxsJ1rwWiQ7PF03lhhHyyavObvNPg5PBLwC48Hy2wjeNL4LbnOSfe3Wo0vb46Wq9XnwezzATrHnlhc2eGX/8zyvg8//DzdO/h0+ucybP3k5WnCQqUNIZKaUX0VbSe7pmuJaK58Q003jqVNguuJYzwhOWrou92fxPSmSf8lVVVZN6dxbM7ObKGynBjkXdQezlrfcLJcYy6cds3fb2jM+6VgX/gebKewn2pdW0Eaur+9p43d0uZo41Q91AWddO2Ui8qHG0t153cfpdu//WvafHQ4/fPmb/6cxo//0fjPEQkLVTf9Fq0DY9+rSGp2NaGZKxFNKw2EoDNybRLcpwRWTO6bWLCvKmjWBja+rkMVx5wVSceVtV9UtXCUc1F7vagKtHLGi82kopnljXm72e8PPeh0sc+FMhPa2goyX+/NdX/bn1bjZc7RbmvhSJddO/UmBZZk9/3H09dRUSkSiaz9v3zR+M8T+2RFEmP1By84OD1ytHVgnAPQExYoujE5zb1J8EEPYpizzcdTtzipSgo+dOLWqIpnU+0FqydqS1oYrBa19zN+hy0L2k+NFzn3HoRFrvk7DYx3qrEWHw9WC/3pBsaq3p+fg5Sv7W1/Wo1fPv4599i9o5sDXSeJRT2fVjW2I/vV//4/J/7vUS1y6z/+c9pisGmR0Hjws2+nzZseXOqDElsHxjW2jCQuvfNjIWj95GiU8m0S3I/2IHnbfByf7N8y4cykimtTiaxBKm8vpNsZf/fyEnfLGy/i2O+44Cjkms/5BP5QiBe6fyi95aq2gv0+P7UaX+4cbZTp3e96II4+OC2J9YbQcKFPrAbbkc1bDC6jBdrGykvTZJZ9srqpxNaB0UYzkrdRiRh/vvbrP9W+h9UyWnVSrIEQtHpylLN6qE/tQR40cC3szva/MtnPKeJb7ZO128RtxKylXDm/ezyVm29Re5DKS9wta7y4kX28gPOv+fHsms9lReL6/OWCDPcPOR5G0Fawn7ZSnq4bEliLzdFyPfCyO9sfETpPJRat9PDDz6eL+nUv5i8i2gpqMdctJbYOjCRtVB1G0upoBdY8qVVnEvePj//bScCc9lDtnRzlfLqyP+1BmtnXZnfW+ommVPHebeA7bRT1hHtVjZbzXCsrcdf8eJFrQfCoO8YLLnDNx5P4OZ/GXxXkU8eDGPvrroSvkgP1H9NByle1T5nnZxzvUaZ3v6urwLlztL1M737gHoE+kcSiOItWwMwX84/vn9WESHREwqOkdnNcThzD0loHzpO0UXV44mzmy39O/x3IdKMtkdVOuaqHxqkvT1dWC1C594qQwFqW5hJZpe2PFYuf9zJ+h43ZHjB9+6yM3znnInBVSdeHFq7ULedDJ9pOnzwexJi/k+VYVvdfd1P9VbUb7vl7c37G/W2uTg13fU6dKxJYOe4Lqzka9Mi1UwY4uNjoWWM7spVXFq+EicX8O7/7aPpq2rx6J1rP0T7zRGQcw5JaB0arzHidd02pniLn8CYErZuc5tokOBZMbvckgZVrAeooCaxlayaR1cS5dNHfezPz773Tq8XQvG2B5iwMctnrfZzxepf0OFmONoL7/xoDqmOa42EE+/n14/MqV+tfbewWm6PlauF4WwtH+ubaKRMvuJBlL6hHNVZUrixjb5/111+cJkPsk9UOcZwi8Rh7X8UeWKWI1oFxDi+jwurw7/90YnDUUAhaNTkapXztQe70qD1ITDIHOW9VJLAK0Uwia7XA6qR4kj/X9Vwl7vqwx8qThHfO3/W+BBZXnVq4R2xsTIiY5GgjeOfYZ1ckC/Zr/j4rvW4J6/PqKrSxW+4c7bYWjvTRtRM/yKCFYn+sSAIc3T+oKZEMiaSIfbLKNm8dGInHUsT5GvteRevAOve5uui1A0e8KgStmRzlrAa4O2tD1oc4RrIhZ8Jh30S/MNXx2M/8XXYKaytYPbVbf0uqo3PIPjzVn3sfrIeTY3XXRcoVr/dxypW03h4PBPhfschVeXtvdgyPy3Evoa1gd+WqAopzUxu75c3R4iHDfUGmj05KYlm8orUiCRD7ZEVVS9MG15+bJrLsk1WeklsHxvl6mQrCV6//mwNLtuFMCFoxOcq5SXB/2oPkbyMYi4i3nbBFup3yVSaFEtsKjjOfj6udfqo/71PV8/FCwpu6/Mp9Yna52gjeP2MM11aQRT6vNlOeB7S0sTs/9oPMc7RdQaavrrkpoZZPshrbkb3x3a9f+T2iqiUSBMuobIlESbxYvi63DoykKWTiPqAdcm0S3Lf2IBspX1swE/2S5a9MCqvF7TdcPb17N+s1VV4rxaurnqreyjmdMl5Qs/1M76tqpxoTYmzP30bw2TF8M9X/AIa2gt06N1dn97c53NHG7szYx5ziQaa5hc4O9J4kFrUosR1ZJAgiUbCMny2qsSJxYp+s5Vn9wQtFtg6Mc3KZrQNhAe4Dyp8gaQ9STxyHqf4FqKNundIOiFJUxyf3Ob9T4O8dT/nvZv2du9RyrJl9sG4bL6j5Os+5B17f78NyVdq+veA4oK0gp52bWo0vV66Wwzo7QJLEouOiTVu0a9t9/3Hj3zta2EUSpaQKoD6ICqVoHfjgZ98uJokYCas7v/toei6WmPBdxj5ytGICRJnHZpTytLPqYxVAzqqKu55UbYnqOOWsTBoU+YR79TRvzkXuB0XtCXY1uR4cmLO/Bdlu84UgixxtBA9mVVaLfm7laPusrWC75wg5H7joT6vxy8d/PeMc7Y5KbTiexLJJJx00TyDEq2mRRImESknVQF0Vsd68eaO4xOH99z5Lr/36T7UnUlX5kfuSEoIiJ0e5Nwk+6FEsY6KZa1H6oYl+y1THK+fTxW8VmtCJKrRciyK52+81OVbkbI9ofwtyGmd4zx/3/F5smPJUcV+0uupehuO7MhvzaKdcD1wcaGO30LiQ657ntgfjoHJ8FXQgJFxGna3RciUgIokQrdyiOqtpsS9T7JMl8ZBHtA6M9o0bKy8V8zPNWwfe/f0nWVoHRqUfZKQSq7zJUdyj5dokuF/tQapkQq69AsYpT5sf8ruT8iz4hjjnykvoVE/15mynOGr1gmj+fbAsDJLbHzONZ32WY0y4d+FF6mr8ztVWcODSad3nVZyXOR64GKc+tRq//BztQbZ7U5Xa8C+SWNQzAyuwRdppP2ckFpbRPi32yYqqLMmH+hxtHRh/L0HprQNhQSqxypoc5dwkuI/tQdYznuPafbRVvgXBf90KFrkwWC2c5vy9t2ZPKLd13M1lnCwMQtvGhc1U/4Nei7cRfHb83k/172+Ya78v8p2Xo5SnOrCPrcZLm6PtCjI8IYlF70SSIRIM9w4+bfx7RwIrki5ROcQV7qwLbR0Y1X45WgfmJNHGKV4VgqLk2iR4v3dVAFUS4a1M737P05ItVx2/exm/w0ahv/duyrO/ytyDFj7Zv5NxbmxhENp3/7CSaQy/6n3Y3VR/W9ihtoKtOi+1sTNHg17Q24ze2nx0mG7/9q9ZWr2dJRIwUTkUSRgursTWgZEIisRoVGA1cT7V2Zay6fOf1hgIQTGT01ybBB9MJ6f9EwtQOT6Ax5d+kpqyVMdxnOndR8Umc9YGsRC6n+vWJVWJrHbc/FbVFjn3wbpjYZAW62vyNUd10r0rjwXaCvZ5jpCzCkgbu8XuFczRoEHHV0LfEBJK0FTLvYcffj5tL7iMapRIwkQyyz5Ziym1dWDsedV0i0otKWmALHsZk6NhyvN05WHqY9u7ajFmlOndPS3ZLTmP50bBv3csmoxz3b6kEvcFO3nczXmM7vVqD0K66N0e3o9tpvqrLWKsracCthpT6h5XtBUsXySwBhneVxu788eE1Uz3Cv2co8GCrJ5TmzoX8ZtM7Iwf/2NaRbOMFnDzqiJJibNF1VrEqcTWgfff+8wBootWhGDpk6NByrcfS1/bg+RamN71tGrH5Nln5F+3f8VWJFWLJpHIyrV4Mprt3VHquJt7H6xdFZvQuvuxfG0E612o1lawX+fl1vT41E8bu8XGhFwJ3lsqteF09sSCVFXURCu4eDVtXmE0+uF1B+L4XfN3vzHd9yqq1kqpWJsnPZtqHdjE7wMUNznSHiRPTEc5biFStXBE9+RYEEyz67rcRcFq8STnOb0zWwAqUa5xN+SOK5zkJSGoYcyq3/3a78XWBuOUZ09HbQXLu6cdZbqP0MZusfnETsY5mgQWnEESC46I6ppoDdf0wn4kaHZ++kra+snLDkKqEnvRNjCSeyW1Drx38Om0+qrJ1oGnnS91+ePj/3bCcdpNunuC5cm1SXCf24PkShq8reVHR1XH9e1M7/7Lwn/3GCfuZfwOe8VVo1Xtwoa5biNT9XS1sYKm5biX6M8ia742gnnG17VBtCfcr3vqmdrQCrY/52Su1rza2C1mJ9O4el8LRzifdoKUebe9xPZ6sT9W03scza2//uI0cdPnfbLmrQOj1WIp5nunbT4q455u5RXtJ2nEQAiWMjndTHkqhvreHiRH0mCc6trPglLdT3n2iBoU3VYvVG3vcu3dFIuiewWNu7n2tpiTwKJL93L9OJfb00bw2fev3+psnGS55+T8szPHQyC3VQEtNEfLcR08nMRepTYs4NqxD2m4tEj+1Daz/fpykzhRdRMt46LypmnzFnp92yer5NaBt3/7V233gCYmR7kWUvvdHqSK6yDDO9+zMN1x1fHNVZH0ZgsicCflq7pYmVybOwWMDzE27GSNoYVBlifHZ19fzucc40L+PTTztRXcKXY/x/7IlcC6Y2/Xpc7R7EEGCzq6UuwDiSv59MuvOvc7ReVNJDCa3vsokjhRjdSHfbK0Dlzy7/r3fyY4hYdbmp0c5dokWHuQXFVY2n70Q3WcxxneebX4tq3VuHEn5au8GBVQkZZzHyztgVjmfcUwyz1FH+4n8rQRbG4PzaqStu5k442UN+HP2edkrjZ2uz6nljpHu+2BOFicdoJwjnkruTorzRYV+2TFq6tKbB0YSauSWgfmtozzmtbwcEtzk6OcmwT3uz1IFdscrT/uOXF7JdfxLr89UzV+5Kzk3FlaR5Dtca79B6dTCO2BWLJhjqlDD+4bBpOvb2V456YfKNJWsDvn5ChpNb7MeUSuh11uzSongQUdTWINhINSvHr934r6eeZt5Xbff9z4945qrEj0lFKlVMuM6rvfmP5OpbUOjKq7OM6ltw5847tfN0hAt+R6ulJ7kDxJgkNPrfZMdbxzLD7+siW/f4wjORMyDxpvU1UtxK5nenftgShBjpal7/Tknqzu8SiS2g8b/S2qBxDuZ4mPtoJNflblqgLqd6vxi9yf5Fkr12oYLkESi9qM/1bfwn+JCZtoMXfndx9NX02L/bEi6RPJnzaLhFVUlkXrwJL2/IrWgVF9FVV3wL+8KgSNTE43U55Ei/YglRyLeG8Lay/lOO4rrdmXeG1wfzqu5BHz0AcNjru5FgWnU4akhSvLv7cYpDwPxxx0PG6R2B5mGROWNM1N9bfD1VawufMxYr2X6XNKG7vz47+V8lS0ajUMl6SdILUpvXqlLlGNFQmPpn/fSABF8mf99RdbGbf4uT/4xfeL2ucrWgfGvlfROrDpfc+gBQZCkH1ylGuT4Ifag6ScrQRNPPvpfqb3bVNrpqjGyrWIPZwtGDUxLuRq3xpue7qaAuQaV/Y7fM8wyHRPtryk9pN9Des/v7QVbMJe0sZuWePBKOWp1tZqGK5AEgsuIfYRikRWJEGatvWTl6fVTKW04TvPvHVg/Nyl/MyRsGpL68DclnEOAyl3exAJrEqOBZZ9E/+eqhYDdzO885sti0G0H8q1ILs+WzjKeiud8u2DpYUrpcixp9N+xys3utFG8Nlxez/TZ5e2gnnnCTlbjXvQ4vw5Wo6HaszR4IqOrij/WDgoRRsSNJEIiSRItKJrWlQzldaS76RjWGLrwPvvfTatvmpz68C2t5UEk6NsmwRrD/K0HMmBXwlrr+U4/iuzCoB2qJK4tzJ+h61sLRarBNko08+thSul3GPEOZ5jTPlNh2OWq41gKRUXd1P9Dx/EPeyGCy7b+Zjjs0obu+XO0W6Zo8HVXDv2IQSXVmdFS8nJmeOiFV1U9TTdji5iFAmi1R+8UFxMSm0dGNVzd3//idaBsPjklDxybRKsPcjThhne86Gw9lj1RPu4JedqzjjkfJq4WkCq+wn/fE9WhwMtXClIrsRCNz//8rURvFfMPVm+toJRPTt0ydV6Pg4zfVZpY7e8OZoEFtREO0Fq0+e2bFHVEwmSaDPYpKh2evCzb6fNm2WsNUdircTWgXd+99G0aq7p4wMttyIEWSanuTYJ1h7k2UWAHG2BTEDJsZD7ZuuiUD3NvZvp3QepWkiqazzIuQ/WOOWtTIOLnOubKc9DMl1upZtjbIh43S/qt6zaGj7MEj9tBeu6fuv97HtCG7vF4r+TaY521xwN6iGJBXXNYB//Y5oo2X3/cePfe2PlpWkya1mJo/i+kbiKBFaJrQOXcUzaQFIPGp8cjVKeTYK1B3lWjknob4SVlKel4LCVkaiqjw6yXcPVgnwdcu0tooUrJd1jxDmeqwrrVx2NWa42gqUmDHK0FRwkbQXrOBe1Gl/+HG2U4Z3vmaNBfSSxKFYb9sV65g5hVvUTr6ZFW8FlJJGiZWC0DowWgqWI5ExXWwfWuR+WtorQ6OQoVysr7UFO9kaG99wXVmZP047rvu3Ntg9UfrdSnhaLYWMSl9Urjr2xSL2a6edTAUsp9xjzBfAsU9xOLsL2oY3gs59f4+nPVz9tBa8u5gg57gO0Gl9sjraT4Z1jr8xNAYb62BOLeu9wa1wUb9O+WM98Wr3/eJpEabrF4uD6c9N9sprYi2q+J9fOT18pqnVgJK6W0doR4IzJUa6nK7UHOd2w9lhbBOCJ/Ry3Vq2MRPV09+1U/9P9czuXTvDl3Qfr3qw9F5Rwj7GX8rQRDG93NHL9aCP47Jh9P9NnmLaCl7+G42GLUYZ39qDF4uNn3SLuHjKEml1r/cSJokgcPB2LSKbs/+WLRr9vJJQisRTt/XK9/7x1YJ1VQVcVicNoHRgtBAEKk2uTYO1BTp6Q5rin3RdYjngnw3u+0dpoVItkuRZrqv2sLro4mrcyxdPVlPJ5N1+AzbWWE/cY9zsYt1HKtT9pO+T4OeM+V1vBi5+LcR7meNhCq/HF7KU8LRxvmaNB/bQThIyiMij2ybp38Gnj3zva+0Wiqc4qqVJbB0aMo4Wj9ngX03SlIPR0cpprk2DtQU6XI972w+Ko/Qzv2e4HCqvFslyL3Zdp9RP//iDHrWfydDVl3F/EdZEzgRXe7txCbJX4y5E0uNea+zJtBUu6hnM8bKHV+OJztLrHTwksyEgSCxqw+egw3f7tXxtPskTLv0g6XbU1Y+mtA5uudlumOtts/vHxf7s4Oe/m3kT0avEbJe1BluHVDO8p3jxRLQCO6/6I70BcYtFsP9O7r07G1M0Fx97NlGcfLItTlHJ/Eed37gRWN6uw8rQRPGhddWb18x5kii/nX8M3sp2LWo0vc4521xwN8pHEoljD732jU7/Pww8/X8peTZF0ioqsy+yTVWrrwIhlX1sH3vi6YRtaMjnKtUnwPe1BzlX3ot6BRWtOsJ9h3Bh2IC63U76k78Zs8f68GOZqaSWBxbLvLW5MXlFFlGOfzZPuN7pWhRXjR44Ed1uTBnnaCi76wEG/qQIyRwMuyGootXrnL38XhDNE+7ZofRf7NzV+l/TTVy5USbX6gxemyauSWgfO47eMqjaAC8qxSGIflsUMa34/T1Rykj9meM9B66NSLZ7FwmiuRbTYH+vkOOXdB0sFLMtVVQ58kKJlW37x8Mb9jsVvXvlSt3utHRuqnztHW8GNTPuTmiecTgLLHA06TxILGhbJl9i/KV5Nm+9ptXnzRhpcf+7EfycqrqJ14IOfffvUf2cZMYt9xaL6qk+tA7PH9e8SgdAi9mFZRLVIVbd3BZYT7Gd4z0EnIlMtjOaqTKgSVSdf67mqU+57upolfq6NJq9IXu2k/NVXc12839BG8LTxrf72uPN40xxt7JY5R1sbaOEIDXhOCGA5ohorWgs2nSyKSqyNlZemr6hsitdc7LdUyp5Xc9E6MPa+Ovpz9tmPv/Xv9d1tNdzaErg0T1cuLseTvxYFaOq8+HFnorM2eJi2x/GE/0am6/zBdFycq9pXDXPcis72+oLmVEna0eT1Vmo+uR1J2/2OxTNXG8H2jw1xb7k9jgX4vdrH6RiXVac0QRu75Rk/dS8CZKUSi2K98d2vd/53jCRC7JO1rOqiSJ5F5dX8VVIC62jrQAmsJ0pLMgLZSWBd8KOt9nfs2mIedZ0XOa7JGx2L0WaKJFAew1l7tXmbtRzJspwVZfC0ar+rqLqKBO0nk9dWaj6Blau93HLjmqcqqDvJvur3yNE+UlvB/LSxW+4c7bY5GjRHJRa12v/zF9MKHy7wyfflP6fJmmjxJ3aVaB14/w+f2fcKQHuQixpkmKDCqbe+qd7qny4u9t2ZXZc5frfYH+uXKU8FVrW3l8UpcqmSK3HuvjH7c9nXf1fP+VxtGNcnx3DdibxQ/G8KQxZajS/7/sYcDRoliQWF2Hx0mA4++jLt/PSV3lbbREVa7BWm8gpgSnuQi6v7aRCTU5p0o3O/UdWq6vbkb48y/X7DTD/5bYtT1KJKVkWCajB7vXHk7yXp3kMz+doIsjhtBfPQqWH54+VDYYBmSWJBQWL/p4PfVPtkxf5UfRFJq9j3Kn5/zpkF1HheLKuNJbAQ7UEuOUxmWCSA08SC77DWd4wF764tSq0NxrNE1l5LfuI72ogu2fZ4kMpL8pzl6M/76uzvN1J7qiu799BMvjaCXFy0FXzowYBa700lsJY7R7svDNA8SSyK1ackzlHzvaC2fvJyGv3weud/X60DL8aeWNAL2oOU410h4Ayf5rgFTlWbwm6JpND2OMa1rcJ/0l0VsEUYpTz7nHHyOb/Zwd8rxpobDm9Rx+OWMNRCq/FlztHWBvbKhCWxGkq9I/rHX9b2Xn1erI+ETrTVi1dXRRXQa7/+07SNogQWwJOPgOTpSqCLqieXd0ueylicomd2O3nOb4+HqUqEUo6hPcRqodX48oyTRCwslSQWtZKMqHlW8f7jdPM3f+7UHlHzBF1Um9n7CuDpITJJYF2VdoI0yZPQF1UtmJcYt3GyOEXPppodTWBpI1iujVmrUC5/zW4Kw9LmaLfN0WC5JLGgcFHdFomsLuxfdP+9z6bVV5Gc4+IG15+r9bwCinNHe5Arq7t1kOPBWSxmXM6twmJncYq+2e1w1WG0oRw4xMXeo0kwXvZ+VKWwORr0nCQWRatz0b7NonopKpciCdRGkYCLRNzd33+iWq+Q68FxgOJEf/uHwgC9N+z8b1gli0qqerK/CH1yr7OL4VUbQS3rSv+M01bwosZJpbA5GiCJRYZP2BpbxEliHfv0/P0n6fZv/9qaBMTR1oEqfwBO9XC2VwxAP1RJoxIW0u0vQl8cpqqaYLOTv502gm2ireDFqBQ2RwOSJBYZ2Oco86foh5+3IikULQO1DoT2D+lC0IiV2eILQH9UyaPdZd6u2l+Enoik8a2OJ2y1EWwPCceLGQrB0gzM0aAcR5NYMvvQllnIx19OE1klJojmP1tUYGlZV/MdVI2ViZLNLGRtMBaEhiZIKT0QBqCHnzNRjbW/jFvWFC2CoPuiiuBWp1tmaiPYRtoKLm5rdo7TvBVzNCjHtWM38lAU7QRPN2/VFy0GS/l54meJva9iDywyXA/frO96+OPj/xZQKG8yvyUMQA/dTs1W/h4m7ZnovrimInl1t9PnujaCbbahymVhD7RgNEeDvtNOkPrvluvcE+ubkljnuf/eZ9PE0TKrnuatA+NnAeDS1ieTpJEwAL1SLbBHIquphfZbKo3psLiO7k1eNyfn+X4Pfl9tBNtLAvJisXog6WeOBn0miUXtVHg0L1r4RRKp6QoorQMBahctQ1aEoahFA2jSfi9/66rVWRPt/e50uq0afbebquTVZi8qDbUR7ILVyXFcFYaFrEznCZijQU9JYkFHRBIpEkpNVEPF97p38KnWgQ179fq/CQJ0XyRN9jxpWdSCAZxmKAQ1WhvspqqCJJf7s+8BXTKeXTcvT/eY60uVoTaCXbLjvndhI3uJLXWOphoOlkgSi6K99PzXBOGCYl+q27/9a7bKqIcffj5NXm0+so1A0+rcI27/z5KPnMtFvtxJ0p4wXG54EwJosaggmdxuZhkbYm8g6IaoJryfqqqr13pTefW0WMgfOBU6c98rIbm4LdVrSxNjzgNhgOW4duxGCK7s8O/1JU9WvvW8gF5CJJqiKiva/dUl9jqL94wEWZ37ngHFcl+wXCuTCaoJPdBHd2r+DIr3ui2stPh+bD9V1VZxHkfS6uY0KdvX1phVS68Np0anaCt4MTta2y3NcBJ7bR1hCY4+1v+pcFDLXXaNiROudhwi6bT1k5fT6IfXL/0+UdH19nt/U3kF0LxoGfKO9ldL9YYQ0PD54QGCqCjZHkciKypSr9q2J25g7/SwSoUn4jP0Vy28DvYdulN5yKerx3V7vG+8XsiNWbxuiddSrE9i/645GjTrOSGA7ooE1J3ffZTe/ei/psmsi4r9ruK/V3lVhjrbCQKtmtAf9PZp64uLOA2FgdayGDWPw8EskXXVtj23jZ+990cJoQ7ZHm8m+1V21bytoMrZxayI11JtmaNBs6yIUvZdzPO2bavD/fc+myakHvzs2wslQiJpFXtrRVtCylFnEkvFJAuwkFqOvckk6TWL2wupu7OAhTKaPD9c40etDR5Oxr7Yx+qybXvuSl5Ah+RrIxj7i/1GgC/slym6BtSraisY4z+Lxmtztp8kzYqk64NJ/G+ao0Ezjq6I7id9hSltZcCeWLWJpMXN3/w5rf/oxfTLH/7PExMi8e+8/Ye/TZNXUcVFdzm+LOBdIShqkhRttW4KxbnGGWIPTZ0fnuY9bm1wP22Pf5wuvlC6O/1vgS7J0UbwYLq/GBcXVShV9fug5nfe0lbwQjZmFUESf82Lcz8qxm8JBeSnzIXaRcUPZYrERext9dqv/zR9xZ5Z89fL/8//O01y7b7/WIIDoDwrkwmqPSDON679HbfHQ2GlofPCgt3JYoH5Igm+WMy7I2zQqTF3M+WpjjZWXFaVZMoRv0HygP1F7cwqFWnecBL7LWGA/CSxoKeiZWAkHOcviauyaa0JrZNjMXo0mSSNhPbsj7cM72lRgKbOCxWwJ6kWSm8vOK7GGOCJaOiSfG0E79nP5srj836q2jHWbb3jDxHVPU+o9hPbHusgsJw52ro5GuR3dFXUhzdAoepsrRkJTFjAvhBcaVIfE/rdDO/sScuz4z7O8K6vCiwNnRdjYT3z2j4vOVUlu7Sggq7J1UZwU2hrcS/T51eXkzK3Uv3JlJVM10oX52gPM52v5miQ0bUjF7KbfYo0/O43BAFqJIkFjbloC6xF7XnS8kz7dd+KCCkNnRdjYT1DVTFx58wxV1UFdIs2gm0Ym7UVvNznWY692FZn1wznX//maNAy+lORhX2xADCpn07qczxpeWM6SeI045rfb8WElKdU50P9i6pVWybOjtFuOrnK9d7s/wO6M9bmaiN4X8I7y+eXtoIX/zy7l+GdNyYxW3VSnjtHW7RNsTkaFOJ4EsvECaBA9sRiSZNR6pkk5WkZsj3WMuRkOfYVGgormc8HC6qLj6vxBPXukf9lV1sw6KQc9znjlCdxgLaCl/k820zajy8r9uOUZw9NczTIxKooQAusvFLfnliHX/5TQKHZSVKuliGjySRpXYCfkSMZ8Iawkvl8kMS62Lgaiaz5vhZ3BQQ6prq/ydNG0FYaucblw0zj8SB1ta1gJUf78Uj6PdBJYKE5Wo5WmDFHGwkw1Ot4EmssJJRm5VvPCwLU6N2P/0sQOI/7gfonSbuZJvZbnW2zcvlY72d4VzEm9/nwrrBe+FqPPbBuW5CGjtkeD1K+NoL7Apx1XI4HCx5meOcutxWcd22oe/4V19EDJ+VCc7Qc1Zmq4aBmx5NYfxQS6nDw8Ze1vdeNrysYBGjYWAiyTJKiamA3wzs/mC348MR+ze+3IsZMVefBSgvOWYC2ilZcdVeQxL2tNoLNiMqWHA8XbHV4jpBrj6bh5L5lyyl5bvw3M83R9lTDQX2OZwc8xUYtPv3yK0GAGr30/NcEAboxSYqJvZYh+b2T4T1tkk2u8+Bw1tIGoN+qNoLDDO+sjWBz97qHKU+LtnigaLPDccvV2m5da7uF5GrruCe0UI/jSSyTJ4ACaatJw94RgqxytAyJyhBPWj6xn+E9fymsZDoP9oUV6D1tBLsjX1vBjU63aKvilqv9uNZ2Z8d+3tax7mR3JF93BBiuTp82ivfjb/27IECN9v/8hSDA8idJOVqGjGZPMJNnsUpLwb7L10rQgwMA2gh2Ta62gt1OCORpP65rw+JztByJrJFqOLi6aw1M+Omh8d/+Ud+n7fNyrQANcz+Qf5IU1e+3M7zzVmc3vr64HE8AvyWsvfZWi85VgPbQRrCL97raCl4+dncyzMcGKRJZLDJHy3He7qiGg6uRHSCL8eN/CAIAnD1J2s80SXqgYmgqR3XLSFh7LcfxP5iMBWOhBXpLG8Eu3+tqK3h5t1P9W74MJ3HTfnyx8zZHW8c9czS4vJOSWD7kAQoz/O43BIEmb9zdCzQX692kZUguORZNbmgH0lPVcc9xTRlvgb7TRrDbtBW83BzhMFPs1t3LLhR/bR2hMCclsZRaU5TB9ecEAWp08PGXggBlTZJytAyJp1O3eh7Xcar/Cdaw4aTtpVzH/VdCC/RWvjaCd7URLOZ+TFvBy8cuZ/txre3M0aBVTkpivSssXNXhl/+s7b0ksaDc65NO2heCpcjRMmQ0WxzqsxwJgoF9x3qmOt6DDO88ni1QAfRxbI1xNccDAg9n7cAoRb62gm91vj1bnvbjKoLM0aB1rp04mYIrUukB0FqeWl3OBPVwNkmqO/7xpOVqjyObaxFLNVa/qMICqF9UI9S9iJ6r6oery9EaL86fnc5Hrmo/fr/mdx2k2KOJReZoOc7dLQ/FwcVIYgEUzn5YNExF9vImSXEPdivDO+/0tmVIFdMciayhiWdPVMc517HeFWCgp2NrPGCT4yGbO9oIFntPFsclxz5lw15UtawN7ma4p42WjDtOznNjn6ut44POVxJCjU5KYmlpQXG0FIR6jB//QxA49zQRgqVPknK0DNnpccuQ32R6X9VY/ZDrOO/PkqwA/VLdj+RYONdGsPz73PspT+vyjZ4kA2KOkKO13cjJee65u5+0dYSlunbChempFWphXywojyQWi5wmQrD0SdJuqr9lSFRi7fQ4njnub4cm/R1XHd9hpnfXShDoq7gf0Uawv7QVvPw9ba724/3t2lDGHG1LcOF810753/eFhquyLxZAK2/O3QOUcRyiZchuze+6OpmgbvY0om9nel/VWN2W6/gezhZCAPpFG0GqKmRtBa8Wv1up/kTWnoqghedodVd8jnpx7sIVnZbEGgsNQBmG37MnFo0x+S9LTJLqbhmyMVtA6pvdTO876HFisNuq4zrI9O5vCzDQw3FVG0Eq2gpeNX4Hs3lCneL63HNyLiRHW8ct++3C2U5LYv1RaCjJjeevCQLUoM42n3SSfTHLmqBGUjHHk5b9axlSPbW6m+nd37Ipc8dUx/OtjN9hV5CBHtJGkKO0FbzavW3cS9Rd0bYyuQfacWouNEfL0dbxgTkFnE47QVph5ZXnBQFq8O7H/yUInEUSq8xJUt2JrGqC37+WIfcyvW9/Fkz6I8dC69zuLKkK0B/aCPLsPe445WsrOOpJDDdT/Q/GjOz5uvD5m2OO9kBbRzjZaUksi1hc2Tt/+bsgALSLSuwyJ0k5WoZEJdZOz+I4TvkqYIY9bdPYPdVxHGb8DvcEGejZuKqNIKfdm+VqK7jVo0RAjvbj/evaYI4Gxbt2yoUYmWRPswAU4Mff+ndBoCkeYil3krSbYZK02sP9nHImEHa0AGm56vjlXDhQhQX0kTaCnEVbwavNEeZdG+q+v9hTEbTwHK3u+cWqPXfhWWdtNGQhC6AA9oSjwZvwfUEo+vjE06q7Nb/rRq8qiKoEwv1cw3Xy5GTb5WwjGFRhAf2Sr43gPW0EO3VvluPzcbU397h59miK+6E9J+hC8d80R4P8JLFohTe++3VBgBrs//kLQeA0YyFoxSTpTtIy5KrupXwdB4aenGyp7fF6yttGUBUW0LdxNdfDHfuzB3vozv1trraC/dkDtmptV3d14sokfh7QWoy2jpDZWUmsd4WHqzj46EtBAGjRsC0ErVF3y5B+bSJcPa2asyImnpwcOk1bpDpeWxm/Q5xzdwUa6JmNpI0gi8vxOdmvKvlqj7i64ziaPejD+fOLHHO0HW0doaISi3yz9S//KQgFGlx/Lq2//mLa+/l3nnpt3rwx/f8oz8q3nhcEmuDhlXZNkupuGTJIkcjqTwzvp7zVhw9MOFuiOk65z/23tb0Ceja2Didfcyx831PV2tl7s4OkrWBd97i7Nb/rlge0ljZHi0os1XCQzkpiVR8gQEdEgmrnp6+kD37x/bT1k5fT8LvfeOq1sfLS9P+Lf8ceTGVxPGjIvhC0bqJ/u+Z3jVZ4Wz2KYs4nuat9BCSyylYdn72Udx+s8WyvBIA+ja3aCHKZ+9v4vMyxFtmvapaq/Xjdc7t4QGvgJF1ojlb3HGNVu3I4uxIrJQtaFCKSLFwtfo/e/F4a/fD6uf9u/DuRzFL9000HH2vzyemnhxC0bpK0n2GStD6ZJI16FL/djN8hnpzccqIWbWt2nHLS9grom2gjOKj5PbUR7I8cx7lfbQUrt2ue3/Wr/fjV5hg52jpu9KqiEE5wXhLLghaXZrG8DJHAinaBF6nmiX83/huJrO7R5pNTjLW6au0kaTflaRnSl02EY4KZ89wf9ay6rT2q4zLK/F0ezpKlAH0ZW4dJG0Gudm+bs63gsEdxnCd+625t5752sfjnaOu406M5GjzjvFXtd4SIy7JYvnyRjHrws29f+r+N1oIsl0QiDfHQSrsnSTFBfVjnx0fqy5OWTyb4OfWnuq0tquORe5NyVQNA38ZWbQSp6/5sM2krWEccc7Qfjwe01p2kC8/R9mueo+2ohqOvVGJBh8XeV1fZTykSKOuvvyiQS2Q/LBrioZX2u1PzfdsgRSKrHxPMSAA+zPxddiSyClEdh51GrkkVrkC/aCNI3fe2dRvMztP+yNN+fKtXVW1XU3dbx5XUv9aYMHXtnMFunPK2WIHFR2oVKRcSyY/VH7xw5fd560ffFMyOGD/+hyBwGg+ttH+CejibJNV53zbsUSu8ututnEQia9maS2A9nCVHAfoyvg6TNoLUe2+bq63geu8SMFX78bqrGaNrw8CJutAcre55xqp25fTRIo/47wsTl1XnormKlIuJpF8dMRtcf04C0fVI92+ufdZ34ziOJ19vZZjoj3oywbzdwHeSyFqW5hJYcR2qGgD6NL5qI0iu+7PNpK1gXbGMfWC1H19O7HO0ddSunN5ZZIVbiyEuP4u3aL40w+99o7b3ksRankgiQmb7QtC5SVKOliErPYhdXAv3GvhOEllNay6BFW5rIwj0TI42gil5IIB858Eg9a2t4JNY1t3aTkXQ4vMMczS4gkWSWFoMQc8NvimRIvZ0mM/57k2SdlO9yZj+PGlZPfG738B32tEGpCHb483UXALr7iyRDNCXMXaYtBEk772ZtoL1xTIesomuDXU+bDOaxHHdibrwHK3O6lLVcPTKtQUusn1hogSqgeBqDr/8pyBwEhXX3ZwkbU6+7tb4joPJa68n0at7b7HTxOLJjolnRhHf5p603tX2CuihHA9kHMzuY+Dofe04wzv3sa1gjkTWVu8SgpePf91tHWOO9kBg6YNFN8zZFyouo85F8xtftycWXMW7H/+XIOAzvl9iklRvy5AqKdCXyX0TRimSgzbGrlcsSG2PH83i24SD2fUG0KexdjNV7cTqpo0gTZ0Xcf/Vvyqiqrqt7vuWB1rbXehcrnOONtThgT5YNCvgKW0uxaI5XM2r1/9NEMjpwN4tnZ6g5moZMurJ5L6pRbSY8D+axHXVSVuD6kngD1KehdWTxPVlHyygb2NtjLE5Kl3vacvKKfdm+6neVmxzG71MvuRpP67DwOJztLo7P6zbc5euU4lFa1jMp48G1+2JRVYWCfoxSao7kbXTi8l+/X3rz5v4P5g+RWnyf3lVVcDeLJ5NuWXfFqCHclRmayPIeSLpMm7J+dyGe9243nZrfMeV3sby4rEfpzxtHVXD0VnXFry49oWKZVv9wQuCAFAvldb9mCTlqCra60Wypepbv9vgd1yfxdYE9CKiHeP2OJJXGw1/5zsqBoAejrmbSRtBlnNfdpjpPFmZndd9jGndre1WexvLy83R6mzrOH8ozgNxdNJFNhnaFy4u6vDvNe6J9fy1NPrhdUGFS9r/8xeCwHEPhaA3k6SHGSZJez2a3Dd5HzxvL7hpErqA7fH6NF6xH0Cz7syq9QD6NOZqI8iy78vinkxbwXpFRdC45lhqk73Y+bz7/7N3NztynFeagD/WGJ6G4bapbjRsowF3EJiVe+HiyquGq9Arr0wuej1VeQNmXYGKV8DSDSTT616wtPLKYBpeacXyRpsxoLCAhmQYsmiPRvBoBGvi5Jepomj+RFZFZPw9DxBJ6odVyZNRmRHxxjlfanasY5EiyIIR2ibEcrc2W7v442eNfr0HP3pjFWbBVBgnSJtv0dZwmdxJUpzwLxr8inHX6lRGhtxNux+/GRcJn6zXeOJ5caEpd1/FQta7DvsWAixgoowRpA+MFWz2HKGNNZoemixQu/6nDZ+jHaxGlMPIbJMGuFubzkWA9fgn3xFkMRlCLFq0VIJJniQ1PTLkaBKLCF+uLbbrIKtIebzgo9XIPNKqOy2fmHfRfRUW658jgKm9/54mYwTpz3GZsYLN1rTp8eNxg9FDUwVqO2n4POPeJM7RmJT6SUB+Q3PHNp3b/4evC7IArk+H9XQ1HcZM407L7oKsECNZ3luFN1O9GJDDq9NVHfLaYV0QYAHTZIwg/TsuWyZjBZuuaTQvNHmcs5+m2t129fOMssGv+kA3HGOybQqwVDL6QJAF22t6vCeD5zN92idJcYLa5M1JjycRrnQbZIUIb96b3HpZ+U7S6LyKC6hd/b0FWMCUGSNIHxkr2Pyx7iI1O9ruzmS72652ntHkWMebkzlHYxK2TQDeVjK2sfzwL619bUEWY9f0vv30s78qKl++PVsPa/InSRfrk6TG3rJWJ0nTOcE8TN0FwVHrCHPGHWblzqsYVxmdV3Exqejw2QiwgOlqb4zgieLSwDFZW2MF7024rscNH+dGd9sdO2ztc7Smxzo+VljGQCcWrWvzwrkgizGL/Rta4qYUNmNYmh0ZMi8fTqR2T6stgqxFh8/i+TCrGEVtvzo2sOvwKpwJsIDJyp8tbYwRPFsfh0ATx7NtjRUsJlzZuNnN+PFu9ukY69hkyD+dczRGbW/LH6QydTc+hYE6f//TVr++IIuxEmLRIhcN2BzbLVKzQczRpBYRzuFG13eSPxtmxQWCg0HWMi5s5BPsj1O3YwOfdVy9xjoFgClr48JnmfIYOGhK7E9NT5m4maY9VrDp8eO5nkbb1a3/mXM0+KqrXPVfKhvb+Pn/+j+tfw9BFmP0s3/9++bOFD/5XEG5vHBgAW2+epIUJ6jnDX7F4QYpVz/JbHJ+/fVOUPPs+wi0+r+Yc9zhHON68sjAJ+vn3wd5ZGQOeQGmKY9Ta+Pz/NhYaxo+FmtrrODBxMcKXqQ8QrspcVz6yA671TnasuFzNN1wDNZVrvj/XNnYRqyL1ebaWF9+Gq6DLBiDo//xzVR882uNfT0hFs++LSsBLxAnSU2Gm48mNYIlj/04TP2ZWBC1j4suT9aB1sPVWgR9uPs1As4csEVoFeHVg9T9yMBn5Qs2xlwBU2aMIMM8Fjtv4StPe6xg82s05eNA6mp6rONj3XAM1fYhVn4Dc9cMWzl55+OdfJ8Ish7+2z8qOIMW+/GDH72hELTFeli86PjuaWq2myhOjh5N6iTp8m7V8549syLlDqe48/XjVXiUQ62j1jvm8ojAo3VoFSfNX6S8uHQEbH28E3SRcoClWxWYuoep+bGuZTJGkHY1Of7u2WPaaa8nlDvTm1x37J7RdludozU91vGxwjJEV73N/zz1Z9wHA3Dxx8/S8a8/2knAFB0sq6OX6vvB0BiNyQ4OhM8VgZfsG2V1QhkhzJOm3tJS7rI5nlANcxiYR8/09S7T/fWWj+XnZTyWz2y/W/9/yy2+5sH612+vv3aR+tVd9Trxup0YHwiQjBFk2Mdh8zKOO5seWZfHCuYR0lOt7cm6I+1OQ18xbnC6cONQrdpfNH6OFje05XGFMBhXvUrqLm62tvjtJzsLliLI0pHF0MR+21aA9fSzvyowQYDF60+Smg2djia5lkC+yHE75VBoCIqUL1gepTw+KrbHW2ybP7O58FkM6NXajA9ceAMAJs8YQYZ/DGasYHuaHD8+vakN/TtHO1JYhmTvij88LoJxJYIseMHR29f3VvtqbG11YP3mj/9PoQluQqHOcd4iNTvu50HrY+v6e7IZQdaZnaq37lev0213AQN8yRhBxsBYwXaObaOmhw3WtkjNd82N/RytyfOKh6vR3zAQ17laKsjiSgRZcGkzPnAzBhNa5rObuidJpymvD9SUR5O8ezVO9mP8Sj7hL+1YvZEDxryfAxCMEWRMx1/tjLOOsYJ31LbRIOtgtXYqdet/0vA5/WPdcAzFdUIsd3NzZYIsuBwfGEEW7MC5CwhsKU6SjAxp5oRzmXRl9cFm7SvdVwDPMkaQ8R17tTVW8OHkL/rnY6iTBr/iPaPtttL0WEdBFoOgE4vOCLKYsgc/eqPV8YHPu/joM0XHzSdse4La9J2WMa7iwaTredmVJUDp4NCz2m5NelF2gJczRpAxMlawvePaRWp+/LjRds7R4KX2rvlDI8jiWgRZTE3xza+lJz/9Xrr3g2/t9PsuP/yL4rNUAnpwknS0Hlc05ZouV51A+Q5W3ZG7ee87rGpunBXAi7Q3RvDE+y49OI5tY6zgncmPFcz1PU3NjR+f9tQG52jwWtdtAXBXN9cmyGIq7nz/G6sAa9fjA+Nn7Olnf/UCTFtcNC+VgSueJF00fAEg7rQ8UNdVR9CtlO9idZGveWXK4dWhUVYAL5EvGLcxRvB8Pc4Nuj7eMlaw3fo2OdquSBFksc05WpNjHZ2j0WvXDbEclNAIQRZjF+MDH/37P+1sfOBGhFf3n/zJC8DPlYAGLgA0eZL0yMiQtBkxeJryelkLO1ojyhSh66y4JbwCeK02xgi21f0CV9VG97uxgpcO18dfTTiozhHUtf65RJw/NDnW8dF6jUTonb1r/rAYKUhjBFmMUVfjA788Wn/n41R+8rkXAp/VNHGSFJ1Di0ZP/N3Buqltub6TNTqzos46s7ZXpsvwaqEcAK+Rx6G1MRLN+Fb6d5zVzvpsxgrm+sbP+93U7Gi7Iztu7fqfJmMdmYAmWgLc3U1jBFmMSVfjA788e6x+luJnisk7dyGBBk+SmhwZEp1Y7rT8an0jzIq7hTdjBktFea1lymMDhVcAdeULlG18BhsjSF+Psc5SO2sEuykr17fp8eMPTW3o9BztgaLSN3sN/KDEAYqLYzRGkMUYdDU+MMQIwbu//IMAiw3rV9K0wwZPkuIO1lMl/Zvj6zxmMIKZfEHABcEXHDKmGMNozSuAqzBGkCk6Tu2MFXTBPx+/njf8HvBYQLj1OVrZ0NeKbrh7SkqfNHV11Yk1jRJkMVRdjw+8+ONn6fbbH6Tz9z/1YrC5mOAzmqZPUJ82fBHgTaNYXlnvRbXFiBajBnN4Gp1qb6zuOM13/QKwDWMEme4xVZnaGSsYF/wPFDht1mhaNPTVIsB6rKhbnaM1Odbxgf2aPmkqxDJSkMZFkBXr+eyCIIsmdD0+8OzdP68CLGtg8QyjBGnrJOlifZLUFCNDXl/zPGpwVryxrv1UAupNcBXjAm+vxgF5XwO4GmMEcTxlrGD7NT5usMb7VV2NH9/uHK3JbrhYH6tQWPpgr6EfknhzKpWzV8r1h8ZmG+TJflyU39VINEEW19GH8YG7Cn0ZFKMEafMkadngSdJNJ/9b1f583Z31RrocNzimYCf2reeDK+caANdnjCC0M1awSDFdgI04Tm2qYz463Y6UdIvzhGbP0R45R6MPmrzaqhure/EhfH99wn9rvUbAZtvctbsc3NHFrz8SZNFbxgfSY6U7YtnBSdIiNTcyJDqx3Gm5Xf2ffjlu8PJY76zBiwa7e7/K+1EO5vKxq+AKoEnGCMLm+CmOL9oYK3jP+LVnjlGbDQtNbej2HM26b3SuyRBroZydiguVt9aLgJcveRM7X10UaOeuk1YJsugj4wMZwOcC7OIk6bjB/e1OdYJ6qqhXfi3O1yMHb6fcpbUJtZY9e6bL9fO6my5vvjpeP38XQgHaYYwgXB4ztTdWkE2N46aqwwa/4mMdQVufozW1j0c33D1FpUs3vvjii/ybGzeu/9XmZSy4d6CsO3ey/gDe5rXaT3mBxEF9AES4FCHTLkRoFuHZUJ3evpne3P92I1/r/sWf0ukT15SeFeMDu+q+ivGBsW/qvuI1buliAF5w/FekfEflD9fHgfstHg/GiXMcQPwm5e6wcn1BA9j+PLsJP1/fnQ0AQLvHbwcNfrVyatd3NpnVxtca/voxUvDAXrozsfPevdLFgPgz8zLWGhjUXSKbUGkXQdbmeww5yKJ5MT4w1r7qqvsqxgfG+le6r3iNpQALeOHxXw6Tzl9wkvVsmHWVYGv5zPdZKjY0+rN7qAgAAIM6fnNO1KCvNfziLKoT4AdpYN09A5UX6rvOyJX8ev00tTMXuzWCLLoS4wOjG/Dm1/c6+f7RHXjyzserTix4DetUQo89f1dZTzx7U9T1TriOv/AiAwAA0Ig2rsQulLV1J+sFvJuY73Z/iAWwRha7FuMDowOriwBrMz4wNgEWdXYZo4IAAAAAGIM2rsa+paytKavt9tbrX73K5ViZwRFksQsxPvDJT7/X2fpXMT7w8Be/39m+zigslAAAAACAMWg+xMprcCyVtnExPvB2S4thD3aBbUEWbYrxgRFgdbX+VezbEWBFkAVbcDMJAAAAAKPQ1lwsa3E0q8nxgS/yuyEXR5BFG4wPvJay2qJjNBYhf6N677qx+jX/89n6v9OO5fpmEgAAAAAYvK+18lVjLY55+aD63U0lvpay2u621H31rG8PvVBxsT9EyNS2zffYfE/GJcYHRnjVVfdVdF3FvjXQ7qsI2u+/cORpDuGX6+2k+oy4V/36ps+JxrmJBAAAAIDRaLPFwDij62lzfODz9sdQMB1ZXJfxgdcSIdVh7TX78v93K0Xolf8s11eubiIBAAAAgJFoM8RaKO+VtT0+8NK8jC6Ig7EUTpDFVXU5PnCz7w54fGA43Dp0j/e4WXGaIrD3mdEEXVgAAAAAjEp7V2vzmhwLJd5K1Ox27U6GZtwZWxEFWWwjQqvHP/lOuveDb3XzQ//J5+n22x/sbJ9tyf1rdY3G58WsOE45zFraK6/sTAkAAAAAGJO2Ww7cFV7fLscHPuvNMRZTkEUdB9/9u/Tef/zz6tdOfujf/3QVYA10fOCzFo18lXj/mxWHKbq6Urqwh275GuyiexcAAAAAdqjdEGtWLJO76uvY3fjAZ83LB9VjMdaiCrJ4ldPbN1cdWF2NDzx55+N095d/GPL4wI3luvO22c+OWRFdWdGdVdpba7EOJQAAAACjs4urt7qxXi46DXY9PjCbl0fV472xF1iQxfM24wPf3P92J99/Mz7w7N0/j6Wkv2rtK8+KRcojBu9Xmy6jl1t20MULAAAAAK1rP8TKFyFLpf4bUZfDTi48zssIrx5OpdCCLDaMD2xFu+9h0aE6K06r391K1nx6mftKAAAAAMAY7WqOljFHl6Kb4DjNiuMOxgferLZH1e8eTK3ogiyMD2z1Pa19Ocw6STnMOrdHf6lcj+4FAAAAgNHZ1dXcRTIKKkTHwuG6O2235uV+9fik2u5MtfiCrGkyPrB1xU6/W6y/FWsIxnupNReDLiwAAAAARms3IVbuOJp6N9YidTs+MAKsYuo7vCBrWroeH7j88C9jHB/4vB928l2j+2hWRJAVgVY50V287OSmCAAAAADYkV3O1Yq1TKbYjWV8YM8Isqah6/GB9y/+lA5/8fsxjg983kGn331WnFdbjBg8meBnjFG9AAAAAIza7q7u5gBnauuYGB/YU4Ks8ep6fGCEVhFenT6ZTJ6yX73fHHT+LGZF3CgRYVaM15tC8ePvuPATDwAAAMCY7bpFYUprdyyS8YG9Jsganz6MD7z1n/+1+nVi+tHtGTdLzIrT6ne30/gDnrd23t0LAAAAADu22xBrVpRp/BcWjQ8cEEHWeBgf2KnoxnrYm2cTnzXxHpzDrOVIP2fO/NQDAAAAMHZdXO0dczeW8YEDJMgaNuMDe+NoFWRFmN4X0Qk7Kw5X78v5/XksdGEBAAAAMAm7D7HG240VfyfjAwdKkDVMxgf2ztHqvWheHvXqWc2KZbVFV1Z0Z5UDr7EuLAAAAAAmY6+j7zumbizjA0dCkDUsxgf2VlFt0ZEVYdZBr55ZdMnOilvrz6ChdjLpwgIAAABgMrq5+juebqwuxwceJOMDG7frICs2ttOH8YF3f/kH4wNfL0acPq7eqx6vx532x6w4rR4jzBpaR5MuLAAAAAAmZa/D7z30bqxF6m584GmKi8PGB7Yigqzz9z/dyfeKbixBVn1djw+8+ONn6fbbH+xs/xjLy5byiMHozurPe1Z0M82Kk5TDrMVAaqkLCwAAAIBJ6S7EGm43VlxAvNvh+MAIr96067YrgqwILHZBkFVP1+MDz9798yrAKj/53ItxNUcph1mnq/eyvojPong/j5sSUlr2/LNHFxYAAAAAk7LX8fePu+CHdFd5dF3dTrPifOffOY8PfC/lrgZaFiPjYr0jQVb3+jI+8OSdj70YDbycKYfw71XvaUe9emazYlltEWTdrbayh7U70YUFAAAAwNR0G2LlC3JvDaRWZ9Xzvb3uINuty/GBN+2yuyPI6p7xgaMV72UxXvC9dUDfH3GTwqyIEYPRndWX0KjsZO1FAAAAAOjYXg+eQ4xH6vPd5ZvxgSc7/87GB3b/4guyOmN84CQUKQL6eJ+bl/u9emY5NIow634PPqPu21UAAAAAmKLuQ6x+d2MZH4gga8eMD5ykeJ+L9bKiO6vozbOKz6dZcbr6HOhuDccLXVgAAAAATNVeL55FvkhY9qw2xgfyJUHWbuz/w9fTk59+z/jA6TpKOcw6XXWi9kV8DsyKGC8YnVnLHX/3E7sFAAAAAFO116Pn0pdxScYH8uIdQ5DVqns/+NYqwCq++bVOvv/it5+sXl/jAzt3c/0eGOtlHfXqmeUw67D6XWwXO/iOy+r7Le0SAAAAAExVf0KsPC7pouNnYXwgryTIal6MD3z07/+UHvzojc5e0+Nff7Ta4vf0Z9eIH4HqvTHCrDu9emYRLEWnbkrRnVW2+J2O7QYAAAAATNlez55Pl2OTjA+kFkFWczbjA+98/xudfP94DeO1jC4sequotkerLtUc9vdH3HwxK2LEYHQSP23hM6n08gMAAAAwZf0KsfLYpF13QRkfyPY7jSDr2voyPnBXryHXdpAi7J+X0Z1V9Oyz6zTl9bLOGvxcuu8lBwAAAGDq9nr4nHYZJhkfyJUJsq7G+ECu6Sjl9bJOVzcC9MWseLq+GSLCrMU1v9r91dcDAAAAgInrX4iVxyft4g504wO5NkHWdowPpEHRwRph1r3efYbNiljL6rDallf4CvHnz7y8AAAAANDPTqwQF/DKlr52l+MDC+MDx0eQVY/xgbQgbgR4UL2vRph1p1fPLMbjzorD1efNdp9nx15WAAAAAMj6GWLlMUptdGN1OT4wLrA+ScYHjpIg6+W6Hh8YjA8cvaLaHq1uEsijWvv0eXZebTFiMMKp140IPF+vDQkAAAAApP52YsWFv0W62iiml7nf4fjABykusBofOGp9C7J+/N3/3nlNuh4fWH7yebr99gfGB07HQYpRrfPy4arztX+fabdSvkHjRWFW/LsTLyEAAAAAXNrr+fNr4oJeXBg8TLPidOfPPo8PjO6re3a1aehLkBX/7uC7f9dpLboeH3j+/qerAMv4wEk6Snm9rNNq68/NA9FlnD+Lblfb4rn/+lYnN1kAAAAAQI/d+OKLL/Jvbtzo5zPMXUxXDYGWKa9/9bSD5x3jAx8m3VeTFCP0Hv/kO6tOpF1YfviX9KsP/+/q99GB1XSAdf/iT+n0ydPaf/cI17rqvgon73yczt79sx2RkMfTzoqzHn6+FV9+TkSnMDAZm+NvAAAA4NWGEGJFCBTdTMWWf/J+J91X+TlfJ3hjJHYdZLWpbogVf9dY/6qr7qsYH3j3l3/QfcULd4/158JCKYCuCbEAAACgnr3eP8PcRbXNWEHjA+mFXY8W7JrxgfRckaLraV7GmlkHygEAAAAA/bc3iGc5K86rx/Ma/+ey2m5V//9y588xjw+MAGvfbsXGWIKsf/nmf3vpf4uOs+i+evCjNzp7fjE+MDqwot7wGgfVFkHWo/U4PwAAAACgp/o/TnAjX2yMkOhla0wZH0hvjWG04Iu6nIwPZATO1p8fT5UC2BXjBAEAAKCe4YRYYV5GUPTguX8bFx7vdtR9VVSPj5LuK2oYepAVXU4RGC0//Mvqn2N8YJfdV/E8dF/R1O5dbW91diMEMDlCLAAAAKhnWCFWiPVM8jiosEw5wHrawfOI8YEP08s7w+BvjKEjqw/uX/wpnT7ROEPjypS7shZKAbRJiAUAAAD1DDHEiq6nGCtofCCDJMi6uue7waAly/VnzFIpgDYIsQAAAKCe4YVYIcb4zYqyk+9rfCANEGRtz/hAOnBebSedfN4AoybEAgAAgHqGGWJ1wfhAGibIqs/4QDp2lnJnlp0QaIQQCwAAAOoRYr3OvIzQ6s1kfCAtEGS9mvGB9Gl3rLa3UgRawizgmoRYAAAAUI8Q61Xy+lvRfWV8IK0RZL2Y8YH0VJlyV9ZCKYCrEmIBAABAPUKsl5mXR9Xjg2R8IDsgyPqqs3f/nE7e+Vgh6LOLlNfLWioFsC0hFgAAANQjxHpeHh8Y4dWRYrBLEWS99x//vPp1qqLr6vjXH6Xz9z+1QzAUy2o7TrOiVAqgLiEWAAAA1CPEepbxgXQsOrGiI2uKQdbFHz9bjQ8sP/ncjsAQLVLuzLJeFvBaQiwAAACoR4i1YXwgPTHFIMv4QEYiAqy3YpcWZgGvIsQCAACAeoRYxgfSQ1MJsowPZKTKlLuyzpUCeBEhFgAAANSzN+m/fR4f+DgJsOiZGK13+Ivfr0KeMf8db7/9gQCLMSpS7soCAAAAAK5huiFWHh8YAZb1r+ilMQdZMT4wAizrXzFS99OsWCoDAAAAAFzP9MYJGh/IwIxptKDxgUzAMs2KQ2UAXsU4QQAAAKhnWp1YxgcyQGPpyNr8PQRYjFiMELyrDAAAAADQjOmEWMYHMmBDD7IWv/1k9fzj7wEjdjfNCmthAQAAAEBDxj9O0PhARmRoowUjdDt55+NViAUjd5JmxZkyAHUYJwgAAAD1TKET62ESYDESQ+rI2jxXARYTcC7AAgAAAIDmTSHEup/yOiUwCkMIsowPZEo/ktV2rAwAAAAA0LzxjxMMeT2sh15uxqSPowWND2Ri4gaJwzQrLpQC2IZxggAAAFDPNEKsMC9jXax7XnLGpE9BVnRdHf/6I91XTMndNCvOlQHYlhALAAAA6plOiBXm5ePq8cDLzpj0IciKzqvowBrCWl3QkPtpVpwqA3AVQiwAAACoZ29if9+71VZ62RmTrtfIivAqOrAEWEzIuQALAAAAANo3rRBrVsT6JRFkPfXSMyZdBFnlJ5+n229/kM7e/bMXgEn9uFXbsTIAAAAAQPumNU5wY17eqR4fefkZm12NFjx//1PdV0xR3ABxO82KUimA6zBOEAAAAOrZm+TfelacV48nXn7GZhcdWTE+8O4v/yDAYooOBVgAAAAAsDvT7MTamJcPq8cjuwFj00ZHVowPjPAqgjKYoOM0KxbKADRBJxYAAADUM+0QK8zLJ9Xjvl2BsWkyyDI+kIm7n2bFqTIATRFiAQAAQD17SpAOq+1CGRibpkYLGh/IxC0EWAAAAADQDZ1YYV4W1WN0ZN20SzA2V+3IitAqQjDjA5mwZZoVh8oANE0nFgAAANSjEyvMijLljqynisHYbDqyYk2rbf7Mrf/8LwEWk/7Rqba7ygAAAAAA3dGJ9ax5ead6fKQQjFF0Yt3712+ln/3g71/alRXdV2+9+7/T6RN5LpNWVtvtNCv8IACt0IkFAAAA9Qixnjcvj6rHhwrBmN35/jfS/j9+/Sv/7uKjz9Lyw79Y+4qpi+DqMM0KayUCrRFiAQAAQD1CrBeZl/eqxwcKATApAixgJ4RYAAAAUI8Q62XmZXRjHSkEwGTcFmABuyDEAgAAgHr2lOAlZsVx9bhQCIBJOBZgAQAAAEC/CLFeRZAFMAURYHmvBwAAAICeMU6wjnn5qHq8oxAAoyPAAnbOOEEAAACoRydWPdGRZcwUwNje2wVYAAAAANBbQqw6ZsXT6vEwCbIAxkKABQAAAAA9J8SqS5AFMBYCLAAAAAAYACHWNgRZAEN3JsACAAAAgGEQYm1LkAUwVCfVe/iJMgAAAADAMNz44osv8m9u3FCNbczLm9Xj42rbVwyA3jNCEOiNzfE3AAAA8Go6sa5KRxbAUAiwAAAAAGCAhFjXIcgC6DsBFgAAAAAMlBDrui6DrHPFAOgVARYAAAAADJg1sZo0Lx9Wj0cKAdA5ARbQW9bEAgAAgHp0YjVpVhxXjwuFAOhMdMfeFWABAAAAwPDpxGqDjiyALuTxrrPCOoVAr+nEAgAAgHp0YrUhd2QdKwTAzgiwAAAAAGBkhFhtyaOsBFkA7Yvg6pYACwAAAADGRYjVphxk3U25QwCA5kVwFR1Y3mcBAAAAYGSEWG2bFecpLrAKsgCatkgCLAAAAAAYrRubhaVv3LihGm2al0X1+Kja9hUD4NrO0qw4UQZgiDbH3wAAAMCrCbF2aV7eTDnIOlAMgCs7Xo9rBRgkIRYAAADUI8Tqwrx8WD0eKQTAVmJs4N00K5ZKAQyZEAsAAADqsSZWF2bFcfVoDBZAfWXK618tlQIAAAAApkEnVpfm5Z3qMbqybioGwEstU+7AeqoUwBjoxAIAAIB6hFhdm5f7Ka+TVSgGwN9YrLtXAUZDiAUAAAD1GCfYtVlxUT3eTrnTAIBLxwIsAAAAAJgunVh9Mi8fVI/3FAKYuBgbeLgO+QFGRycWAAAA1KMTq09mxUmKzoN8ARdgiiK4uiXAAgAAAAB0YvVRXifrYbXtKwYwIWfrMB9g1HRiAQAAQD1CrL6alzdTDrLuKAYwctF9GutfnSsFMAVCLAAAAKhHiNV38zLWyHqgEMBIxdjAY+MDgSkRYgEAAEA91sTqu1lxVj3errZSMYCRife3QwEWAAAAAPAiOrGGwnhBYDyMDwQmTScWAAAA1CPEGpo8XvDNarupGMAARdfV3TQrSqUApkqIBQAAAPUIsYZoXu6n3JW1rxjAgNxPs+JUGYCpE2IBAABAPdbEGqK8fsxhyuvJAPRdmfLaV6dKAQAAAADUpRNr6OblQfX4KBkvCPTTotpO0qx4qhQAmU4sAAAAqEeINQbzMgKsGC94RzGAnojQ6jjNinOlAPgqIRYAAADUI8Qak3kZIVaEWbqygC5FcHWs+wrgxYRYAAAAUI8Qa2x0ZQHd0X0FUIMQCwAAAOoRYo2Vrixgt3RfAdQkxAIAAIB6hFhjpisLaJ/uK4AtCbEAAACgHiHWFOSurAfVVigG0KBFtZ3ovgLYjhALAAAA6hFiTUXuynqz2u4pBnBNZcrdV0ulANieEAsAAADqEWJNzbzcT3nE4L5iAFuKjqu30qw4VQqAqxNiAQAAQD1CrKmal9GRFZ1ZNxUDqGGZcvdVqRQA1yPEAgAAgHqEWFOWRwzGWllHigG8RJnyulfnSgHQDCEWAAAA1CPEIsKsg5TDLCMGgY08OjClszQrnioHQHOEWAAAAFCPEItL8/Io5TDLiEGYtkW13Tc6EKAdQiwAAACoR4jFV+URg5v1soBpWaYcXi2VAqA9QiwAAACoR4jFi83LIuUg60gxYPTKlMOrhVIAtE+IBQAAAPUIsXi1vF5WhFkHigGjk9e9mhWnSgGwO0IsAAAAqEeIRT05zIr1svYVAwYvh1cpnaVZ8VQ5AHZLiAUAAAD1CLHYzrw8Srkzq1AMGKRFyqMDS6UA6IYQCwAAAOoRYnE1wiwYmkUSXgH0ghALAAAA6hFicT3CLOi7RRJeAfSKEAsAAADqEWLRDGEW9M0iCa8AekmIBQAAAPUIsWiWMAu6tkjCK4BeE2IBAABAPUIs2pHDrJ9V275iQOueVttbKQIs4RVA7wmxAAAAoB4hFu2alwcpd2YdKAY0bhNenaVZ8VQ5AIZBiAUAAAD1CLHYjXkZHVnRmXWkGHBtZcojAxdKATA8QiwAAACoR4jFbs3LIuUgKwKtmwoCWzlP0Xk1K5ZKATBcQiwAAACoR4hFd6ybBXXEmMBFyuFVqRwAwyfEAgAAgHqEWHQvr5v1P5NRg/Csi5TXuzq33hXAuAixAAAAoB4hFv0xL2O84FHK3VmFgjBBEVZtRgZeKAfAOAmxAAAAoB4hFv102Z11J1k7i/HTdQUwIUIsAAAAqEeIRb/l7qwIsqydxdhs1rr6ua4rgGkRYgEAAEA9QiyGY14WKY8bjA6tQkEYqEW1vZ1mxblSAEyTEAsAAADqEWIxTPMyurIizDpKxg3SfxFYvZ2MCwQgCbEAAACgLiEWwzcvY9zgT5P1s+gX61wB8EJCLAAAAKhHiMW4XAZaB8nIQXZv03G1TLOiVA4AXkSIBQAAAPUIsRivy5GDEWwVCkILosNqmYwKBGALQiwAAACoR4jFNMzLIuUw68frX+GqypQ7rn6VZsW5cgCwLSEWAAAA1CPEYnrmZaybdZAuA61CUXiNHFrlbqtSOQC4DiEWAAAA1CPEgtyldZAu19K6qSiTd5Eu17ZaKgcATRJiAQAAQD1CLHheXkvrIOVOrfhVqDV+EVotU+62WlrbCoA2CbEAAACgHiEWvM5lp1aEWvvrjeGKgCpCq01gtVQSAHZJiAUAAAD1CLFgW3lNrU231g/Xvy8UpreWKYdWv1n9OisulASALgmxAAAAoB4hFjThb4OtIunY6sIyCawA6DkhFgAAANQjxII2zcuDlAOt2H78zO+5nmW1ldX2uy9/PytKZQFgCIRYAAAAUI8QC7owLzcjCOPXb6fLkYSF4nxpuf411q7arGMlrAJg8IRYAAAAUI8QC/pmXhYph1mbEYXhx+tfN/9t6CKQerrefrP+d8vV46xY2gkAGDMhFgAAANQjxIKhyt1cN9f/VKSvhlv/kl4cdh009N03nVHPi3/3p+f++en697qoACAJsQAAAKCuG06iAQAAAAAA6Js9JQAAAAAAAKBv/r8AAwB97ABdp3PhDgAAAABJRU5ErkJggg==',
      cameraPositionInitial: {
        cameraType: 'arcRotateCam',
        position: {
          x: 2.7065021761026817,
          y: 1.3419080619941322,
          z: 90.44884111420268
        }
      },
      background: {
        color: {
          r: 0,
          g: 158,
          b: 224,
          a: 1
        },
        effect: true
      },
      lights: [
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
        },
        {
          type: 'PointLight',
          position: {
            x: -9,
            y: 8,
            z: 7
          },
          intensity: 1
        }
      ],
    };
  }
}
