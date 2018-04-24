import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {ImportService} from './services/import/import.service';
import {SkyboxComponent} from './components/skybox/skybox.component';
import {UploadModelComponent} from './components/upload-model/upload-model.component';
import {MenuComponent} from './menu/menu.component';
import {AnnotationsComponent} from './components/annotations/annotations.component';
import {CameraService} from './services/camera/camera.service';
import {BabylonService} from './services/engine/babylon.service';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    SkyboxComponent,
    UploadModelComponent,
    MenuComponent,
    AnnotationsComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    ImportService,
    SkyboxComponent,
    UploadModelComponent,
    AnnotationsComponent,
    CameraService,
    BabylonService
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
