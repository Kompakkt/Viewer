import {TestBed, inject} from '@angular/core/testing';

import {SkyboxService} from './skybox.service';
import {MatSnackBarModule} from '@angular/material';

describe('SkyboxService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SkyboxService],
      imports: [MatSnackBarModule]
    });
  });

  it('should be created', inject([SkyboxService], (service: SkyboxService) => {
    expect(service).toBeTruthy();
  }));
});
