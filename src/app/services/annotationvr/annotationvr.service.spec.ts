import {TestBed} from '@angular/core/testing';

import {AnnotationvrService} from './annotationvr.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('AnnotationvrService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [MatSnackBarModule, HttpClientModule]
    });
  });

  it('should be created', () => {
    const service: AnnotationvrService = TestBed.get(AnnotationvrService);
    expect(service).toBeTruthy();
  });
});
