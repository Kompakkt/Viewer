import {TestBed, inject} from '@angular/core/testing';

import {BabylonService} from './babylon.service';
import {MatSnackBarModule} from '@angular/material';

describe('BabylonService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BabylonService],
      imports: [MatSnackBarModule]
    });
  });

  it('should be created', inject([BabylonService], (service: BabylonService) => {
    expect(service).toBeTruthy();
  }));
});
