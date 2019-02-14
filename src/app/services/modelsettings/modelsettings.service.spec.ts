import {TestBed} from '@angular/core/testing';

import {ModelsettingsService} from './modelsettings.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('ModelsettingsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [
        MatSnackBarModule,
        HttpClientModule]
    });
  });

  it('should be created', () => {

    const service: ModelsettingsService = TestBed.get(ModelsettingsService);
    expect(service).toBeTruthy();
  });
});
