import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent, ButtonRowComponent, SliderComponent } from '@kompakkt/komponents';
import { AnnotationService } from 'src/app/services/annotation/annotation.service';
import { BabylonService } from 'src/app/services/babylon/babylon.service';
import { OverlayService } from 'src/app/services/overlay/overlay.service';
import { TranslatePipe } from '../../../pipes/translate.pipe';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-camera-settings',
  templateUrl: './camera-settings.component.html',
  styleUrls: ['./camera-settings.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    TranslatePipe,
    SliderComponent,
    ButtonComponent,
    ButtonRowComponent,
  ],
  host: {
    '[class.is-resizing]': 'isResizing()',
  },
})
export class CameraSettingsComponent {
  public babylon = inject(BabylonService);
  public annotationService = inject(AnnotationService);
  #elementRef = inject(ElementRef);
  #overlay = inject(OverlayService);

  public isResizing = computed(() => this.#overlay.panelResizing());

  public cameraSpeed = signal(1.0);

  public opened = signal(false);
  public showNotification = signal<string | undefined>(undefined);

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
      const typeString = cameraType === 'ArcRotateCamera' ? 'Orbit' : 'Free';
      this.showNotification.set(`Switched to ${typeString} camera`);
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

  public toggle() {
    this.opened.update(state => !state);
  }

  public resetCamera() {
    this.babylon.cameraManager.resetCamera();
    this.showNotification.set('Camera has been reset');
  }

  //Alternate way to close camera-settings
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.opened()) return;

    const clickedInside = this.#elementRef.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.opened.set(false);
    }
  }
}
