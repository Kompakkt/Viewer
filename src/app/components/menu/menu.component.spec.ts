import {async, ComponentFixture, TestBed} from '@angular/core/testing';

import {MenuComponent} from './menu.component';
import {MatDialogModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatSnackBarModule} from '@angular/material';
import {HttpClientModule} from '@angular/common/http';
import {FormsModule} from '@angular/forms';
import {SocketIoModule} from 'ngx-socket-io';
import {environment} from '../../../environments/environment';

describe('MenuComponent', () => {
  let component: MenuComponent;
  let fixture: ComponentFixture<MenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MenuComponent],
      imports: [
        MatIconModule,
        MatMenuModule,
        MatSnackBarModule,
        HttpClientModule,
        MatDialogModule,
        MatSlideToggleModule, FormsModule, SocketIoModule.forRoot({
          url: `${environment.express_server_url}:${environment.express_server_port}`,
          options: {}
        })]
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
