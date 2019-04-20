import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {CollectionsOverviewComponent} from './collections-overview.component';
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
import {ModelComponent} from '../model/model.component';
import {HttpClientModule} from '@angular/common/http';
import {MediaTypePipe} from '../../pipes/media-type.pipe';

describe('CollectionsOverviewComponent', () => {
  let component: CollectionsOverviewComponent;
  let fixture: ComponentFixture<CollectionsOverviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        CollectionsOverviewComponent,
        ModelComponent,
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
    fixture = TestBed.createComponent(CollectionsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
