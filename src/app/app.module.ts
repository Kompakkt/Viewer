import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {MenuComponent} from './components/menu/menu.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule, MatTooltipModule, MatIconModule, MatMenuModule, MatSnackBarModule} from '@angular/material';
import {EditorComponent} from './components/editor/editor.component';
import {AnnotationsComponent} from './components/annotations/annotations.component';

@NgModule({
  declarations: [
    AppComponent,
    SceneComponent,
    MenuComponent,
    EditorComponent,
    AnnotationsComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
}
