import { TestBed } from '@angular/core/testing';

import { AnnotationmarkerService } from './annotationmarker.service';

describe('AnnotationmarkerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AnnotationmarkerService = TestBed.get(AnnotationmarkerService);
    expect(service).toBeTruthy();
  });
});
