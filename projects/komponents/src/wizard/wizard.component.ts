import { AfterViewInit, Component, computed, contentChildren, input, signal } from '@angular/core';
import { WizardStepComponent } from '../wizard-step/wizard-step.component';

@Component({
  selector: 'k-wizard',
  standalone: true,
  imports: [],
  templateUrl: './wizard.component.html',
  styleUrl: './wizard.component.scss',
})
export class WizardComponent implements AfterViewInit {
  direction = input<'horizontal' | 'vertical'>('horizontal');
  linear = input<boolean>(false);

  steps = contentChildren(WizardStepComponent);
  #stepIndex = signal(0);
  stepIndex = computed(() => {
    const index = this.#stepIndex();
    return this.steps().length % index;
  });
  selectedStep = computed(() => {
    return this.steps().at(this.stepIndex());
  });

  #setSelectedStep(step?: WizardStepComponent) {
    const selectedStep = step ?? this.selectedStep();
    const steps = this.steps();
    console.log(steps, selectedStep);
    for (const step of steps) {
      step.active.set(step.label() === selectedStep?.label());
      console.log(step.active());
    }
  }

  #updateStepCounters() {
    const steps = this.steps();
    for (let i = 0; i < steps.length; i++) {
      steps[i].counter.set(i + 1);
    }
  }

  #setupListeners() {
    const steps = this.steps();
    for (let i = 0; i < steps.length; i++) {
      steps[i].headerClicked.subscribe(() => {
        console.log('Header clicked', i, steps[i], steps[i].label());
        this.#setSelectedStep(steps[i]);
      });
    }
  }

  nextStep() {
    this.#stepIndex.set(this.#stepIndex() + 1);
    const step = this.selectedStep();
    this.#setSelectedStep(step);
  }
  prevStep() {
    this.#stepIndex.set(this.#stepIndex() - 1);
    const step = this.selectedStep();
    this.#setSelectedStep(step);
  }

  ngAfterViewInit(): void {
    console.log('Wizard', this.steps());
    setTimeout(() => {
      this.#setSelectedStep();
      this.#updateStepCounters();
      this.#setupListeners();
    }, 100);
  }
}
