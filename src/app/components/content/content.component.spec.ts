import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ContentComponent} from './content.component';
import {
  MatCardModule, MatCheckboxModule,
  MatDialogModule,
  MatIconModule,
  MatOptionModule, MatProgressSpinnerModule,
  MatRadioModule,
  MatSelectModule,
  MatSnackBarModule
} from '@angular/material';
import {FormsModule} from '@angular/forms';
import {HttpClientModule} from '@angular/common/http';
import {MediaTypePipe} from '../../pipes/media-type.pipe';

describe('CollectionsOverviewComponent', () => {
  let component: ContentComponent;
  let fixture: ComponentFixture<ContentComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        ContentComponent,
        MediaTypePipe,
      ],
      imports: [
        MatDialogModule,
        MatRadioModule,
        MatOptionModule,
        MatSelectModule,
        FormsModule,
        MatIconModule,
        MatCardModule,
        HttpClientModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
