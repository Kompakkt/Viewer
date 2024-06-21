import { Component, HostBinding, computed, input } from '@angular/core';

type ColorInput = 'primary' | 'secondary' | 'accent' | 'warn' | 'transparent' | `--color-${string}` | `rgb${string}` | `#${string}`;

const getColor = (color?: ColorInput) => {
  if (!color) return 'currentColor';
  
  if (color.startsWith('rgb') || color.startsWith('#') || color === 'transparent') {
    return color;
  }

  if (color.startsWith('--color')) {
    return `var(${color}, currentColor)`;
  }

  return `var(--color-${color}, currentColor)`;
}

@Component({
  selector: 'k-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  type = input<'default' | 'outlined' | 'raised'>('default');
  color = input<ColorInput>('primary');
  bgColor = input<ColorInput>();
  disabled = input(false);
  iconButton = input<string | undefined>(undefined, { alias: 'icon-button' });
  fullWidth = input<string | undefined>(undefined, { alias: 'full-width' });

  #computedColor = computed(() => getColor(this.color()));
  #computedBgColor = computed(() => getColor(this.bgColor()));

  @HostBinding('class.icon-button')
  get isIconButton() {
    return this.iconButton() !== undefined;
  }

  @HostBinding('class.full-width')
  get isFullWidth() {
    return this.fullWidth() !== undefined;
  }

  @HostBinding('class.default')
  get isDefault() {
    return this.type() === 'default';
  }

  @HostBinding('class.outlined')
  get isOutlined() {
    return this.type() === 'outlined';
  }

  @HostBinding('class.raised')
  get isRaised() {
    return this.type() === 'raised';
  }

  @HostBinding('class.disabled')
  get isDisabled() {
    return this.disabled();
  }

  @HostBinding('style.--color')
  get hostColor() {
    return this.#computedColor();
  }

  @HostBinding('style.--bg-color')
  get hostBgColor() {
    return this.#computedBgColor();
  }
}
