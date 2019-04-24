import { TestBed } from '@angular/core/testing';

import { UserdataService } from './userdata.service';

describe('UserdataService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: UserdataService = TestBed.get(UserdataService);
    expect(service).toBeTruthy();
  });
});
