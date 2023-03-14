import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, debounceTime, filter, skip } from 'rxjs';
import { BabylonService } from 'src/app/services/babylon/babylon.service';

@Component({
  selector: 'app-camera-settings',
  templateUrl: './camera-settings.component.html',
  styleUrls: ['./camera-settings.component.scss'],
})
export class CameraSettingsComponent implements OnInit {
  public cameraSpeed = new FormControl(1.0, { nonNullable: true });

  public opened$ = new BehaviorSubject(false);
  public showNotification$ = new BehaviorSubject<string | undefined>(undefined);

  constructor(public babylon: BabylonService) {
    this.cameraSpeed.valueChanges.subscribe(cameraSpeed => {
      this.babylon.cameraManager.cameraSpeed = cameraSpeed;
    });
    this.babylon.cameraManager.cameraType$.pipe(skip(1)).subscribe(type => {
      const typeString = type === 'ArcRotateCamera' ? 'Orbit' : 'Free';
      this.showNotification$.next(`Switched to ${typeString} camera`);
    });
    this.showNotification$
      .pipe(
        filter(state => state !== undefined),
        debounceTime(2_500),
      )
      .subscribe(() => {
        this.showNotification$.next(undefined);
      });
  }

  get cameraType$() {
    return this.babylon.cameraManager.cameraType$;
  }

  public open() {
    this.opened$.next(true);
  }

  public close() {
    this.opened$.next(false);
  }

  public toggle() {
    this.opened$.getValue() ? this.close() : this.open();
  }

  public resetCamera() {
    this.babylon.cameraManager.resetCamera();
    this.showNotification$.next('Camera has been reset');
  }

  ngOnInit(): void {}
}
