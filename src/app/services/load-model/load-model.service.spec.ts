import { TestBed } from '@angular/core/testing';

import { LoadModelService } from './load-model.service';

describe('LoadModelService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LoadModelService = TestBed.get(LoadModelService);
    expect(service).toBeTruthy();
  });
});
