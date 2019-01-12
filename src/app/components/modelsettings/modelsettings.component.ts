import {Component, Input, OnInit} from '@angular/core';
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
  private isChecked = false;


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
    this.loadModelService.Observables.actualModel.subscribe((newModel) => {
      this.activeModel = newModel;
    });
  }

  private pitch(event: any) {
    this.babylonService.setLightIntensity(event.value);
  }

  private pitchLightX(event: any) {
    console.log(event.value);
    this.babylonService.setLightPosX(event.value);
  }

  private pitchLightY(event: any) {
    console.log(event.value);
    this.babylonService.setLightPosY(event.value);
  }

  private pitchLightZ(event: any) {
    console.log(event.value);
    this.babylonService.setLightPosZ(event.value);
  }

  private handleChangeBackground() {
    this.isChecked = (this.isChecked === true) ? false : true;
    console.log('Checked value changed.' + this.isChecked);
    this.babylonService.setBackgroundImage(this.isChecked);
  }

  private async setInitialPerspective() {

    /*
    console.log('die Kamerapos ist : ', this.cameraService.getActualCameraPosInitialView());
    if (this.activeModel !== null) {
      this.mongohandlerService.updateCameraPos(this.activeModel._id, this.cameraService.getActualCameraPosInitialView());
    }

    await this.annotationmarkerService.hideAllMarker(false);

    this.babylonService.createPreviewScreenshot(220).then(screenshot => {

      console.log('screenshot erstellt');
      if (this.activeModel !== null) {

        this.mongohandlerService.updateScreenshot(this.activeModel._id, screenshot).subscribe(result => {

          // TODO: Find out why picture isn't refreshed once the server sends the result
          this.catalogueService.Observables.models.source['value']
            .filter(model => model._id === this.activeModel._id)
            .map(model => model.preview = result.value.preview);
        }, error => {
          this.message.error(error);
        });
      }
    });

    await this.annotationmarkerService.hideAllMarker(true);
*/
  }


  handleChange($event: ColorEvent) {
    console.log($event.color);
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

    this.babylonService.setClearColorHex($event.color.rgb.r, $event.color.rgb.g, $event.color.rgb.b, $event.color.rgb.a);
  }

}
