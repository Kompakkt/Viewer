import { AsyncPipe } from '@angular/common';
import { Component, OnInit, effect, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent, ButtonRowComponent, SliderComponent } from 'projects/komponents/src';
import { BehaviorSubject, combineLatestWith, debounceTime, filter, skip } from 'rxjs';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';
import { BabylonService } from 'src/app/services/babylon/babylon.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
    selector: 'app-camera-settings',
    templateUrl: './camera-settings.component.html',
    styleUrls: ['./camera-settings.component.scss'],
    imports: [
        FormsModule,
        ReactiveFormsModule,
        AsyncPipe,
        TranslatePipe,
        SliderComponent,
        ButtonComponent,
        ButtonRowComponent,
    ]
})
export class CameraSettingsComponent implements OnInit {
  public cameraSpeed = signal(1.0);

  public opened$ = new BehaviorSubject(false);
  public showNotification$ = new BehaviorSubject<string | undefined>(undefined);

  constructor(public babylon: BabylonService, public annotationService: AnnotationService) {
    effect(() => {
      const cameraSpeed = this.cameraSpeed();
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
    this.annotationService.isAnnotationMode$
      .pipe(combineLatestWith(this.babylon.cameraManager.cameraType$))
      .subscribe(([isEnabled, cameraType]) => {
        if (!isEnabled || cameraType === 'ArcRotateCamera') return;
        this.babylon.cameraManager.setCameraType('ArcRotateCamera');
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
