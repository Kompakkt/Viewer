import { TestBed } from '@angular/core/testing';

import { LoadingscreenhandlerService } from './loadingscreenhandler.service';

describe('LoadingscreenhandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: LoadingscreenhandlerService = TestBed.get(LoadingscreenhandlerService);
    expect(service).toBeTruthy();
  });
});
