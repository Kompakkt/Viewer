import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MediaBrowserComponent} from './media-browser.component';
import {FormsModule} from '@angular/forms';
import {MatFormFieldModule, MatIconModule, MatInputModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

describe('MediaBrowserComponent', () => {
  let component: MediaBrowserComponent;
  let fixture: ComponentFixture<MediaBrowserComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MediaBrowserComponent],
      imports: [
        FormsModule,
        MatFormFieldModule,
        MatIconModule,
        MatSnackBarModule,
        HttpClientModule,
        MatInputModule,
        BrowserAnimationsModule,
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MediaBrowserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
