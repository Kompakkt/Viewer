import { Component, computed, effect, inject, Pipe, PipeTransform, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { Sound } from '@babylonjs/core';
import { ButtonComponent, SliderComponent } from 'komponents';
import { interval } from 'rxjs';
import { BabylonService } from 'src/app/services/babylon/babylon.service';

@Pipe({ name: 'prettyTime' })
class PrettyTimePipe implements PipeTransform {
  transform(inputSeconds: number): string {
    const hours = Math.floor(inputSeconds / 3600);
    const minutes = Math.floor((inputSeconds % 3600) / 60);
    const seconds = Math.floor(inputSeconds % 60);
    const milliseconds = Math.floor((inputSeconds % 1) * 100);

    const parts = [];
    if (hours > 0) {
      parts.push(hours.toString().padStart(2, '0'));
    }
    parts.push(minutes.toString().padStart(2, '0'));
    parts.push(seconds.toString().padStart(2, '0'));

    return parts.join(':') + '.' + milliseconds.toString().padStart(2, '0');
  }
}

@Component({
  selector: 'app-media-player-menu',
  imports: [MatIconModule, ButtonComponent, SliderComponent, PrettyTimePipe],
  templateUrl: './media-player-menu.component.html',
  styleUrl: './media-player-menu.component.scss',
})
export class MediaPlayerMenuComponent {
  #babylon = inject(BabylonService);

  #videoContainer = toSignal(this.#babylon.containers.video$);
  #audioContainer = toSignal(this.#babylon.containers.audio$);

  mediaElement = computed(() => {
    return this.#videoContainer()?.video ?? this.#audioContainer()?.audio;
  });
  totalDuration = computed(() => {
    const el = this.mediaElement();
    if (!el) return 0;
    if (el instanceof Sound) {
      return el.getAudioBuffer()?.duration ?? 0;
    } else {
      return el.duration;
    }
  });

  get isPlaying() {
    const el = this.mediaElement();
    if (!el) return false;
    if (el instanceof Sound) {
      return el.isPlaying;
    } else {
      return !el.paused;
    }
  }

  get playPercentage() {
    const el = this.mediaElement();
    if (!el) return 0;
    const duration = el instanceof Sound ? (el.getAudioBuffer()?.duration ?? 0) : el.duration;
    if (duration === 0) return 0;
    const currentTime = el.currentTime;
    return (currentTime / duration) * 100;
  }

  currentVolumePercentage = signal(0);

  get currentVolumePercentageGetter() {
    const el = this.mediaElement();
    if (!el) return 0;
    if (el instanceof Sound) {
      return el.getVolume() * 100;
    } else {
      return el.volume * 100;
    }
  }

  togglePlay() {
    const el = this.mediaElement();
    if (!el) return;
    this.isPlaying ? el.pause() : el.play();
  }

  constructor() {
    effect(() => {
      const el = this.mediaElement();
      console.log('Media element changed:', el);
    });
    interval(200).subscribe(() => this.#updateSignals());
    this.#updateSignals();
  }

  #updateSignals() {
    this.currentVolumePercentage.set(this.currentVolumePercentageGetter);
  }

  setVolume(percentage: number) {
    const el = this.mediaElement();
    if (!el) return;
    const volume = percentage / 100;
    if (el instanceof Sound) {
      el.setVolume(volume);
    } else {
      el.volume = volume;
    }
    this.currentVolumePercentage.set(percentage);
  }

  mouseTime = signal(0);
  onPlaytimeMouseMove(event: MouseEvent) {
    const ratio = event.layerX / (event.target as HTMLElement).clientWidth;
    const newTime = ratio * this.totalDuration();
    this.mouseTime.set(newTime);
  }

  onPlaytimeClick(event: MouseEvent) {
    const ratio = event.layerX / (event.target as HTMLElement).clientWidth;
    const newTime = ratio * this.totalDuration();
    const el = this.mediaElement();
    if (!el) return;
    if (el instanceof Sound) {
      (el as any).currentTime = newTime;
    } else {
      el.currentTime = newTime;
    }
  }

  #mouseTracker = signal<number>(0);
  isMouseInVolume = computed(() => this.#mouseTracker() > 0);
  onMouseEnterVolume() {
    this.#mouseTracker.update(state => state + 1);
  }

  onMouseLeaveVolume() {
    setTimeout(() => {
      this.#mouseTracker.update(state => state - 1);
    }, 300);
  }
}
