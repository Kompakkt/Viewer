import { Component, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip, Subscription } from 'rxjs';

export type InputType = 'text' | 'number' | 'username' | 'password' | 'email' | 'tel' | 'url';

@Component({
    selector: 'k-input',
    imports: [],
    templateUrl: './input.component.html',
    styleUrl: './input.component.scss'
})
export class InputComponent implements OnInit, OnDestroy {
  min = input<number>(0);
  max = input<number>(100);

  label = input.required<string>();
  type = input<InputType>('text');
  placeholder = input('');

  startingValue = input<string | number>();
  #startingValue$ = toObservable(this.startingValue);
  value = signal('');
  #value$ = toObservable(this.value).pipe(skip(1));
  valueChanged = output<{ value: string; valueAsNumber: number }>();

  prefix = input('');
  suffix = input('');

  #updateValue(value: string | number) {
    if (this.type() === 'number') {
      const cleanedValue = value.toString().replace(/[^0-9.]/g, '');
      const valueAsNumber = Number(cleanedValue);
      const clampedNumber = Math.min(Math.max(this.min(), valueAsNumber));
      this.value.set(clampedNumber.toString());
    } else {
      this.value.set(value.toString());
    }
  }

  valueSubscription?: Subscription;
  ngOnInit(): void {
    this.valueSubscription = this.#value$.subscribe(value => {
      this.valueChanged.emit({
        value,
        valueAsNumber: Number(value),
      });
    });

    this.#startingValue$.subscribe(value => {
      if (value === this.value()) return;

      if (value !== undefined) {
        this.#updateValue(value);
      } else {
        this.#updateValue(this.type() === 'number' ? this.min() : '');
      }
    });
  }

  ngOnDestroy(): void {
    this.valueSubscription?.unsubscribe();
  }

  onValueChangeEvent(event: Event) {
    const el = event.target as HTMLInputElement;
    this.#updateValue(el.value);
  }
}
