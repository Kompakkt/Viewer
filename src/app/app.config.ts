import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptors, withXhr } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { ColorChromeModule } from 'ngx-color/chrome';
import { provideTranslateService, TranslateService } from './services/translate/translate.service';
import { AppComponent } from './app.component';
import { pluginProviders } from './app.plugin';
import { jwtInterceptor } from './interceptors/jwt-interceptor';
import { FluentPipe } from './pipes/fluent.pipe';
import { languageSources } from './app.fluent.sources';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      MatSnackBarModule,
      MatMenuModule,
      MatIconModule,
      MatCardModule,
      DragDropModule,
      ColorChromeModule,
      MatDialogModule,
    ),
    TranslateService,
    FluentPipe,
    provideTranslateService({ defaultLocale: 'en', sources: languageSources }),
    provideRouter([
      { path: '', component: AppComponent },
      { path: '**', redirectTo: '' },
    ]),
    provideAnimations(),
    provideHttpClient(withXhr(), withInterceptors([jwtInterceptor])),
    pluginProviders,
  ],
};
