import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AnnotationsComponent} from './components/annotations/annotations.component';
import {SceneComponent} from './components/scene/scene.component';
import {MenuComponent} from './components/menu/menu.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {MatButtonModule, MatTooltipModule, MatIconModule, MatMenuModule, MatSnackBarModule, MatSidenavModule} from '@angular/material';
import { EditorComponent } from './components/editor/editor.component';

@NgModule({
  declarations: [
    AppComponent,
    AnnotationsComponent,
    SceneComponent,
    MenuComponent,
    EditorComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSidenavModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule
  ],
  providers: [AnnotationsComponent],
  bootstrap: [AppComponent]
})
export class AppModule {
}
