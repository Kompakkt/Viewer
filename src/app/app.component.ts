import { AfterContentChecked, ChangeDetectorRef, Component } from '@angular/core';
import { LoadingscreenComponent } from './components/loadingscreen/loadingscreen.component';
import { SceneComponent } from './components/scene/scene.component';
import { EntitySettingsService } from './services/entitysettings/entitysettings.service';
import { UserdataService } from './services/userdata/userdata.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [LoadingscreenComponent, SceneComponent],
})
export class AppComponent implements AfterContentChecked {
  constructor(
    private changeDetector: ChangeDetectorRef,
    private userdata: UserdataService,
    public entitySettings: EntitySettingsService,
  ) {
    this.userdata.isAuthenticated$.subscribe(isAuthenticated => {
      console.log('Authentication status changed:', isAuthenticated);
    });
  }

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();

    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('transparent')) {
      document.querySelector('html')?.style.setProperty('background-color', 'transparent');
      document.body.style.setProperty('background-color', 'transparent');
    }
  }
}
