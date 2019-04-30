import { TestBed } from '@angular/core/testing';

import { ProcessingService } from './processing.service';

describe('ProcessingService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ProcessingService = TestBed.get(ProcessingService);
    expect(service).toBeTruthy();
  });
});
