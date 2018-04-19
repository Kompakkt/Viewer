import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {CamerasComponent} from './components/cameras/cameras.component';
import {ImportService} from './services/import/import.service';
import { SkyboxComponent } from './components/skybox/skybox.component';
import { UploadModelComponent } from './components/upload-model/upload-model.component';
import { LightComponent } from './components/light/light.component';
import { MenuComponent } from './menu/menu.component';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    CamerasComponent,
    SkyboxComponent,
    UploadModelComponent,
    LightComponent,
    MenuComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [
    ImportService,
    SkyboxComponent,
    LightComponent,
    CamerasComponent,
    UploadModelComponent
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
