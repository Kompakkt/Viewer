import {
  AfterViewInit,
  Component,
  ComponentRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  ViewContainerRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent } from 'rxjs';

type TooltipPosition = 'above' | 'below' | 'left' | 'right';
type State = {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  text: string;
  position: TooltipPosition;
  padding: number;
};

@Component({
  selector: 'k-tooltip',
  template: '{{ state()?.text }}',
  standalone: true,
  styles: [
    `
      :host {
        --padding: 8px;
        position: fixed;
        text-align: center;
        background-color: var(--color-bg-transparent);
        color: #fff;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        transition-property: opacity;
        transition-duration: 0.2s;
        transition-timing-function: ease-in-out;
        opacity: 0;

        &.visible {
          opacity: 1;
        }
      }
    `,
  ],
})
export class TooltipComponent implements AfterViewInit {
  state = input<State>();
  visible = signal<boolean>(false);

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #firstStateChange$ = toObservable(this.state).pipe(
    filter((state): state is State => state !== undefined),
  );
  transitionEnd$ = fromEvent(this.#elRef.nativeElement, 'transitionend').pipe(
    filter(() => !this.visible()),
  );

  @HostBinding('class.visible') get isVisible() {
    return this.visible() && this.state()?.text;
  }

  @HostBinding('style.left.px') get left() {
    const state = this.state();
    if (!state) return 0;
    const { x1, x2, padding, position } = state;
    const tooltipWidth = this.#elRef.nativeElement.offsetWidth;
    switch (position) {
      case 'left':
        return x1 - tooltipWidth - padding;
      case 'right':
        return x2 + padding;
      default:
        return x1 + (x2 - x1) / 2 - tooltipWidth / 2;
    }
  }

  @HostBinding('style.top.px') get top() {
    const state = this.state();
    if (!state) return 0;
    const { y1, y2, padding, position } = state;
    const tooltipHeight = this.#elRef.nativeElement.offsetHeight;
    switch (position) {
      case 'above':
        return y1 - tooltipHeight - padding;
      case 'below':
        return y2 + padding;
      default:
        return y1 + (y2 - y1) / 2 - tooltipHeight / 2;
    }
  }

  ngAfterViewInit(): void {
    this.#firstStateChange$.subscribe(() => {
      this.visible.set(true);
    });
  }
}

@Directive({
  selector: '[tooltip]',
  standalone: true,
})
export class TooltipDirective {
  tooltip = input.required<string>();
  tooltipPosition = input<TooltipPosition>('above');
  tooltipPadding = input(12);

  // #appRef = inject(ApplicationRef);
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #viewContainerRef = inject(ViewContainerRef);
  #tooltipComponentRef?: ComponentRef<TooltipComponent>;

  constructor() {
    // Move the tooltip component to the root of the app, so it can be positioned absolutely
    // const appRoot = this.#appRef.components[0].location.nativeElement as HTMLElement;
    this.#tooltipComponentRef = this.#viewContainerRef.createComponent(TooltipComponent);
    // appRoot.append(this.#tooltipComponentRef.location.nativeElement);
  }

  @HostListener('mouseenter') onMouseEnter() {
    const { left, top, width, height } = this.#elRef.nativeElement.getBoundingClientRect();

    this.#tooltipComponentRef?.setInput('state', {
      text: this.tooltip(),
      position: this.tooltipPosition(),
      x1: left,
      x2: left + width,
      y1: top,
      y2: top + height,
      padding: this.tooltipPadding(),
    } satisfies State);
    this.#tooltipComponentRef?.instance.visible.set(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.#tooltipComponentRef?.instance.visible.set(false);
  }
}
