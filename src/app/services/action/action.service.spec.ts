import {TestBed} from '@angular/core/testing';

import {ActionService} from './action.service';
import {AnnotationService} from '../annotation/annotation.service';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('ActionService', () => {

  beforeEach(() => TestBed.configureTestingModule({
    providers: [ActionService],
    imports: [MatSnackBarModule]
  }));

  it('should be created', () => {
    const service: ActionService = TestBed.get(ActionService);
    expect(service).toBeTruthy();
  });
});
