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
  signal
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, fromEvent } from 'rxjs';

@Component({
  selector: 'k-tooltip',
  template: '{{ state()?.text }}',
  standalone: true,
  styles: [
    `
      :host {
        position: absolute;
        text-align: center;
        background-color: var(--color-bg-transparent);
        color: #fff;
        padding: 5px 10px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
        pointer-events: none;
        transform: translateX(-50%) translateY(calc(-150% + 12px));
        transition-property: opacity, transform;
        transition-duration: 0.2s;
        transition-timing-function: ease-in-out;
        opacity: 0;

        &.visible {
          opacity: 1;
          transform: translateX(-50%) translateY(-150%);
        }
      }
    `,
  ],
})
export class TooltipComponent implements AfterViewInit {
  state = input<{
    x: number;
    y: number;
    text: string;
  }>();
  visible = signal<boolean>(false);
  
  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #firstStateChange$ = toObservable(this.state).pipe(
    filter((state): state is { x: number; y: number; text: string } => state !== undefined),
  );
  transitionEnd$ = fromEvent(this.#elRef.nativeElement, 'transitionend').pipe(filter(() => !this.visible()));

  @HostBinding('class.visible') get isVisible() {
    return this.visible() && this.state()?.text;
  }

  @HostBinding('style.left.px') get left() {
    return this.state()?.x ?? 0;
  }

  @HostBinding('style.top.px') get top() {
    return this.state()?.y ?? 0;
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

  #elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  #viewContainerRef = inject(ViewContainerRef);
  #tooltipComponentRef?: ComponentRef<TooltipComponent>;

  constructor() {
    this.#tooltipComponentRef = this.#viewContainerRef.createComponent(TooltipComponent);    
  }

  @HostListener('mouseenter') onMouseEnter() {
    const parent = this.#elRef.nativeElement;
    const { left, top, width, height } = parent.getBoundingClientRect();
    const position = { x: left + width / 2, y: top + height / 2 };

    this.#tooltipComponentRef?.setInput('state', {
      text: this.tooltip(),
      x: position.x,
      y: position.y,
    });
    this.#tooltipComponentRef?.instance.visible.set(true);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.#tooltipComponentRef?.instance.visible.set(false);
  }
}
