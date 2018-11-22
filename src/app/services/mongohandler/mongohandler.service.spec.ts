import { TestBed } from '@angular/core/testing';

import { MongohandlerService } from './mongohandler.service';

describe('MongohandlerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MongohandlerService = TestBed.get(MongohandlerService);
    expect(service).toBeTruthy();
  });
});
