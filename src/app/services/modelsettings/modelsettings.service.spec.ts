import { TestBed } from '@angular/core/testing';

import { ModelsettingsService } from './modelsettings.service';

describe('ModelsettingsService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ModelsettingsService = TestBed.get(ModelsettingsService);
    expect(service).toBeTruthy();
  });
});
