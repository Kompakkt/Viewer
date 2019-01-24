import {TestBed} from '@angular/core/testing';

import {MetadataService} from './metadata.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('MetadataService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [MatSnackBarModule, HttpClientModule]
    });
  });

  it('should be created', () => {
    const service: MetadataService = TestBed.get(MetadataService);
    expect(service).toBeTruthy();
  });
});
