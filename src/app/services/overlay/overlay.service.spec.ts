import {TestBed, inject} from '@angular/core/testing';

import {OverlayService} from './overlay.service';

describe('SidenavService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OverlayService]
    });
  });

  it('should be created', inject([OverlayService], (service: OverlayService) => {
    expect(service).toBeTruthy();
  }));
});
