import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
} from '@angular/core';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { ColorChromeModule } from 'ngx-color/chrome';

import { TranslatePipe } from './pipes/translate.pipe';
import { TranslateService } from './services/translate/translate.service';
import { pluginProviders } from './app.plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      BrowserModule,
      MatSnackBarModule,
      MatMenuModule,
      MatIconModule,
      MatCardModule,
      FormsModule,
      ReactiveFormsModule,
      DragDropModule,
      ColorChromeModule,
      MatDialogModule,
    ),
    TranslateService,
    TranslatePipe,
    provideAppInitializer(() => {
      const initializerFn = (
        (service: TranslateService) => () =>
          service.requestLanguage()
      )(inject(TranslateService));
      return initializerFn();
    }),
    provideRouter([]),
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    pluginProviders,
  ],
};
