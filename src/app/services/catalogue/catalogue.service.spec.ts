import {TestBed} from '@angular/core/testing';

import {CatalogueService} from './catalogue.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('CatalogueService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [MatSnackBarModule, HttpClientModule]
    });
  });

  it('should be created', () => {
    const service: CatalogueService = TestBed.get(CatalogueService);
    expect(service).toBeTruthy();
  });
});
