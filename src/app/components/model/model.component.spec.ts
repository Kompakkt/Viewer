import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {ModelComponent} from './model.component';
import {MatCardModule, MatFormFieldModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule} from '@angular/forms';

describe('ModelComponent', () => {
  let component: ModelComponent;
  let fixture: ComponentFixture<ModelComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ModelComponent],
      imports: [
        MatCardModule,
        HttpClientModule,
        MatSnackBarModule,
        FormsModule,
        MatFormFieldModule
      ]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ModelComponent);
    component = fixture.componentInstance;

    // Mock model for @Input
    component.model = {
      name: '',
      files: [''],
      finished: true,
      online: true
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
