import {TestBed} from '@angular/core/testing';

import {MongohandlerService} from './mongohandler.service';
import {AnnotationService} from '../annotation/annotation.service';
import {HttpClientModule} from '@angular/common/http';

describe('MongohandlerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnnotationService],
      imports: [HttpClientModule]
    });
  });

  it('should be created', () => {
    const service: MongohandlerService = TestBed.get(MongohandlerService);
    expect(service).toBeTruthy();
  });
});
