import {TestBed, inject} from '@angular/core/testing';

import {MessageService} from './message.service';
import {MatSnackBarModule} from '@angular/material';

describe('MessageService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MessageService],
      imports: [MatSnackBarModule]
    });
  });

  it('should be created', inject([MessageService], (service: MessageService) => {
    expect(service).toBeTruthy();
  }));
});
