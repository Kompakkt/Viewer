import {
  Component,
  effect,
  ElementRef,
  HostBinding,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip, Subscription } from 'rxjs';

@Component({
  selector: 'k-textarea',
  standalone: true,
  imports: [],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
})
export class TextareaComponent {
  textarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea');

  label = input.required<string>();
  placeholder = input('');

  startingValue = input<string>();
  value = signal('');
  value$ = toObservable(this.value).pipe(skip(2));
  valueChanged = output<{ value: string }>();

  prefix = input('');
  suffix = input('');

  minRows = input<number | string>(4, { alias: 'min-rows' });
  maxRows = input<number | string>(24, { alias: 'max-rows' });
  resize = input<'none' | 'both' | 'horizontal' | 'vertical'>('vertical', { alias: 'resize' });

  startingValueChangedEffect = effect(() => this.#updateValue(this.startingValue() ?? ''), {
    allowSignalWrites: true,
  });

  #updateValue(value: string) {
    this.value.set(value.toString());
  }

  valueSubscription?: Subscription;
  ngOnInit(): void {
    this.valueSubscription = this.value$.subscribe(value => {
      this.valueChanged.emit({
        value,
      });
    });
  }

  ngOnDestroy(): void {
    this.valueSubscription?.unsubscribe();
  }

  onValueChangeEvent(event: Event) {
    const el = event.target as HTMLInputElement;
    this.#updateValue(el.value);
  }

  @HostBinding('style.--resize')
  get resizeStyle() {
    return this.resize();
  }

  @HostBinding('style.--min-rows')
  get minRowsStyle() {
    return +this.minRows();
  }

  @HostBinding('style.--max-rows')
  get maxRowsStyle() {
    return +this.maxRows();
  }
}
