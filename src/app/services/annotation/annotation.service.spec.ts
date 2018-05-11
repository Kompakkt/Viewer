import { TestBed, inject } from '@angular/core/testing';

import { AnnotationService } from './annotation.service';

describe('AnnotationService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService]
    });
  });

  it('should be created', inject([AnnotationService], (service: AnnotationService) => {
    expect(service).toBeTruthy();
  }));
});
