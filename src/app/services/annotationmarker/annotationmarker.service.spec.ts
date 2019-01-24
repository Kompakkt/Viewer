import {TestBed} from '@angular/core/testing';

import {AnnotationmarkerService} from './annotationmarker.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';

describe('AnnotationmarkerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [MatSnackBarModule]
    });
  });

  it('should be created', () => {
    const service: AnnotationmarkerService = TestBed.get(AnnotationmarkerService);
    expect(service).toBeTruthy();
  });
});
