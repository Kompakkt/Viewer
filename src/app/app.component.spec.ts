import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import {SceneComponent} from './components/scene/scene.component';
import {CamerasComponent} from './components/cameras/cameras.component';

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppComponent,
        SceneComponent,
        CamerasComponent
      ],
    }).compileComponents();
  }));
  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
