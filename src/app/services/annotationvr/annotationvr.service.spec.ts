import { TestBed } from '@angular/core/testing';

import { AnnotationvrService } from './annotationvr.service';

describe('AnnotationvrService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: AnnotationvrService = TestBed.get(AnnotationvrService);
    expect(service).toBeTruthy();
  });
});
