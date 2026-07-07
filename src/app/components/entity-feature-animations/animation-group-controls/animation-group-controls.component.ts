import { Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { AnimationGroup } from '@babylonjs/core';
import { ButtonComponent } from '@kompakkt/komponents';
import { TranslatePipe } from '../../../pipes/translate.pipe';

@Component({
  selector: 'app-animation-group-controls',
  standalone: true,
  templateUrl: './animation-group-controls.component.html',
  styleUrls: ['./animation-group-controls.component.scss'],
  imports: [MatIcon, ButtonComponent, TranslatePipe],
})
export class AnimationGroupControlsComponent {
  readonly target = input.required<AnimationGroup>();
  readonly isActive = input<boolean>(false);

  readonly play = output<AnimationGroup>();
  readonly stop = output<void>();
  readonly addToSequenceEditor = output<AnimationGroup>();
}
