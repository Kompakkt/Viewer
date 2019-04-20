import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MediaComponent} from './media.component';
import {MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';

describe('MediaComponent', () => {
  let component: MediaComponent;
  let fixture: ComponentFixture<MediaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MediaComponent],
      imports: [
        MatSnackBarModule,
        HttpClientModule,
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
