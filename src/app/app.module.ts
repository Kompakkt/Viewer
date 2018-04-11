import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {CamerasComponent} from './components/cameras/cameras.component';
import {ImportService} from './services/import/import.service';
import { SkyboxComponent } from './components/skybox/skybox.component';
import { UploadModelComponent } from './components/upload-model/upload-model.component';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    CamerasComponent,
    SkyboxComponent,
    UploadModelComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [ImportService],
  bootstrap: [AppComponent]
})
export class AppModule {
}
