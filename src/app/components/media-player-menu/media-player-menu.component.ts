import {
  Component,
  computed,
  effect,
  inject,
  Pipe,
  PipeTransform,
  signal,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Sound } from '@babylonjs/core';
import { ButtonComponent, SliderComponent } from '@kompakkt/komponents';
import { interval, Subscription } from 'rxjs';
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
export class MediaPlayerMenuComponent implements OnInit, OnDestroy {
  #babylon = inject(BabylonService);

  mediaElement = computed(() => {
    return this.#babylon.containers.video()?.video ?? this.#babylon.containers.audio()?.audio;
  });
  _mediaElChangedRef = effect(() => {
    const el = this.mediaElement();
    console.log('[MediaPlayerMenuComponent] Media element changed:', el);
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
  isPlaying = signal(false);
  currentVolumePercentage = signal(0);
  playPercentage = signal(0);

  #isPlaying() {
    const el = this.mediaElement();
    if (!el) return false;
    if (el instanceof Sound) {
      return el.isPlaying;
    } else {
      return !el.paused;
    }
  }

  #playPercentage() {
    const el = this.mediaElement();
    if (!el) return 0;
    const duration = el instanceof Sound ? (el.getAudioBuffer()?.duration ?? 0) : el.duration;
    if (duration === 0) return 0;
    const currentTime = el.currentTime;
    return (currentTime / duration) * 100;
  }

  #currentVolumePercentageGetter() {
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
    void (this.isPlaying() ? el.pause() : el.play());
  }

  #signalSubscription?: Subscription;
  ngOnInit() {
    this.#signalSubscription = interval(200).subscribe(() => this.#updateSignals());
    this.#updateSignals();
  }
  ngOnDestroy() {
    this.#signalSubscription?.unsubscribe();
  }

  #updateSignals() {
    this.currentVolumePercentage.set(this.#currentVolumePercentageGetter());
    this.playPercentage.set(this.#playPercentage());
    this.isPlaying.set(this.#isPlaying());
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
