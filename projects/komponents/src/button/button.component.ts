import { Component, HostBinding, input } from '@angular/core';

@Component({
  selector: 'k-button',
  standalone: true,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  type = input<'default' | 'outlined' | 'raised'>('default');
  color = input<
    'primary' | 'secondary' | 'accent' | 'warn' | 'transparent' | `rgb${string}` | `#${string}`
  >('primary');
  bgColor = input<`rgb${string}` | `#${string}` | 'transparent'>();
  disabled = input(false);
  iconButton = input<string | undefined>(undefined, { alias: 'icon-button' });

  @HostBinding('class.icon-button')
  get isIconButton() {
    return this.iconButton() !== undefined;
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
    const color = this.color();
    return color.startsWith('rgb') || color.startsWith('#') || color === 'transparent'
      ? color
      : `var(--color-${this.color()}, currentColor)`;
  }

  @HostBinding('style.--bg-color')
  get hostBgColor() {
    return this.bgColor() || this.hostColor;
  }
}
