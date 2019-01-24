import {TestBed} from '@angular/core/testing';

import {LoadModelService} from './load-model.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('LoadModelService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [MatSnackBarModule, HttpClientModule]
    });
  });

  it('should be created', () => {
    const service: LoadModelService = TestBed.get(LoadModelService);

    expect(service).toBeTruthy();
  });
});
