import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { IColor } from '@kompakkt/common';
import { ColorChromeModule } from 'ngx-color/chrome';
import { TooltipDirective } from '@kompakkt/komponents';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';

@Component({
  selector: 'app-color-field',
  templateUrl: './color-field.component.html',
  styleUrls: ['./color-field.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [OverlayModule, ColorChromeModule, TooltipDirective, TranslatePipe],
  host: {
    '(click)': 'toggle()',
  },
})
export class ColorFieldComponent {
  color = input.required<IColor>();
  label = input<string>('');
  disableAlpha = input(false, { alias: 'disableAlpha' });
  colorChange = output<IColor>();

  popoverOpen = signal(false);

  swatch = viewChild.required<CdkOverlayOrigin>('origin');

  swatchColor = computed(() => {
    const { r, g, b, a } = this.color();
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  });

  positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: 8 },
    { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: -8 },
  ];

  private scrollClose = (event: Event) => {
    const target = event.target;
    if (target instanceof Node && this.swatch().elementRef.nativeElement.contains(target)) {
      this.close();
      this.teardown();
    }
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.teardown());
  }

  toggle() {
    this.popoverOpen.update(open => !open);
  }

  close() {
    this.popoverOpen.set(false);
  }

  onPickerChange(event: { color: { rgb: IColor } }) {
    this.colorChange.emit(event.color.rgb);
  }

  onAttach() {
    document.addEventListener('scroll', this.scrollClose, true);
  }

  onDetach() {
    this.teardown();
  }

  private teardown() {
    document.removeEventListener('scroll', this.scrollClose, true);
  }
}
