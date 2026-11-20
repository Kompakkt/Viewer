import { Component, ElementRef, computed, effect, inject, signal } from '@angular/core';
import { ButtonComponent, ButtonRowComponent, SliderComponent } from '@kompakkt/komponents';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';
import { BabylonService } from 'src/app/services/babylon/babylon.service';
import { OverlayService } from 'src/app/services/overlay/overlay.service';
import { FluentPipe } from '../../../pipes/fluent.pipe';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-camera-settings',
  templateUrl: './camera-settings.component.html',
  styleUrls: ['./camera-settings.component.scss'],
  imports: [MatIconModule, FluentPipe, SliderComponent, ButtonComponent, ButtonRowComponent],

  host: {
    '[class.is-resizing]': 'isResizing()',
    '(document:click)': 'onClickOutside($event)',
  },
})
export class CameraSettingsComponent {
  babylon = inject(BabylonService);
  annotationService = inject(AnnotationService);
  #elementRef = inject(ElementRef);
  #overlay = inject(OverlayService);

  isResizing = computed(() => this.#overlay.panelResizing());

  cameraSpeed = signal(1.0);

  opened = signal(false);
  showNotification = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      const cameraSpeed = this.cameraSpeed();
      this.babylon.cameraManager.cameraSpeed = cameraSpeed;
    });

    let isInitial = true;
    effect(() => {
      const cameraType = this.babylon.cameraManager.cameraType();
      if (isInitial) {
        isInitial = false;
        return;
      }
      this.showNotification.set(
        cameraType === 'ArcRotateCamera'
          ? 'k_camera-settings-notification-orbit-camera'
          : 'k_camera-settings-notification-free-camera',
      );
    });

    let notificationTimeout: number | undefined;
    effect(() => {
      const showNotification = this.showNotification();
      if (showNotification !== undefined) {
        if (notificationTimeout !== undefined) {
          clearTimeout(notificationTimeout);
        }
        notificationTimeout = setTimeout(() => {
          this.showNotification.set(undefined);
        }, 2_500) as unknown as number;
      }
    });

    // Switch to ArcRotateCamera when annotation mode is enabled
    effect(() => {
      const cameraType = this.babylon.cameraManager.cameraType();
      const isAnnotationMode = this.annotationService.isAnnotationMode();
      if (!isAnnotationMode || cameraType === 'ArcRotateCamera') return;
      this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    });
  }

  cameraType = this.babylon.cameraManager.cameraType;

  toggle() {
    this.opened.update(state => !state);
  }

  resetCamera() {
    this.babylon.cameraManager.resetCamera();
    this.showNotification.set('k_camera-settings-notification-camera-reset');
  }

  onClickOutside(event: MouseEvent) {
    if (!this.opened()) return;

    const clickedInside = this.#elementRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.opened.set(false);
    }
  }
}
