import { Component, effect, input, output, signal } from '@angular/core';

@Component({
  selector: 'k-labelled-checkbox',
  standalone: true,
  imports: [],
  templateUrl: './labelled-checkbox.component.html',
  styleUrl: './labelled-checkbox.component.scss',
})
export class LabelledCheckboxComponent {
  label = input.required<string>();
  checkedChange = output<boolean>();
  checked = signal(false);

  checkedChangeEffectRef = effect(() => {
    this.checkedChange.emit(this.checked());
  });

  toggle() {
    this.checked.update(value => !value);
  }
}
