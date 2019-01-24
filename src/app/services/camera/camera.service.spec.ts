import {TestBed, inject} from '@angular/core/testing';

import {CameraService} from './camera.service';
import {MatSnackBarModule} from '@angular/material';

describe('CameraService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CameraService],
      imports: [MatSnackBarModule]
    });
  });

  it('should be created', inject([CameraService], (service: CameraService) => {
    expect(service).toBeTruthy();
  }));
});
