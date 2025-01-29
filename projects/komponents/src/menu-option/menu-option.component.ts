import { Component, HostBinding, input } from '@angular/core';

@Component({
  selector: 'k-menu-option',
  standalone: true,
  imports: [],
  templateUrl: './menu-option.component.html',
  styleUrl: './menu-option.component.scss',
})
export class MenuOptionComponent {
  disabled = input<string | undefined>();

  @HostBinding('class.disabled') get disabledClass() {
    return typeof this.disabled() === 'string';
  }
}
