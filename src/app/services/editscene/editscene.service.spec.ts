import {TestBed, inject} from '@angular/core/testing';

import {EditsceneService} from './editscene.service';

describe('EditsceneService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EditsceneService]
    });
  });

  it('should be created', inject([EditsceneService], (service: EditsceneService) => {
    expect(service).toBeTruthy();
  }));
});
