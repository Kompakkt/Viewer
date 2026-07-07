import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AnimationGroup } from '@babylonjs/core';
import {
  ButtonComponent,
  DetailsComponent,
  SlideToggleComponent,
  TooltipDirective,
} from '@kompakkt/komponents';
import { AnimationService, AnimTarget } from '../../services/animation/animation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AnimationGroupControlsComponent } from './animation-group-controls/animation-group-controls.component';
import { SequenceEditorService } from 'src/app/services/sequence-editor.service';

@Component({
  selector: 'app-entity-feature-animations',
  templateUrl: './entity-feature-animations.component.html',
  styleUrls: ['./entity-feature-animations.component.scss'],
  imports: [
    MatIconModule,
    TranslatePipe,
    TooltipDirective,
    DetailsComponent,
    SlideToggleComponent,
    AnimationGroupControlsComponent,
    ButtonComponent,
  ],
})
export class EntityFeatureAnimationsComponent implements OnDestroy {
  #sequenceEditorService = inject(SequenceEditorService);
  anim = inject(AnimationService);

  readonly tree = this.anim.tree$;
  readonly activeGroup = this.anim.activeGroup$;
  readonly hideEmpty = signal(false);
  readonly filteredTree = computed(() => {
    const nodes = this.tree();
    if (!this.hideEmpty()) return nodes;
    return nodes.filter(n => !this.#isGroupEmpty(n.group));
  });

  #isGroupEmpty(group: AnimationGroup): boolean {
    return group.targetedAnimations.every(ta => {
      const keys = ta.animation?.getKeys();
      if (!keys || keys.length <= 1) return true;
      const first = JSON.stringify(keys[0].value);
      return keys.every(k => JSON.stringify(k.value) === first);
    });
  }

  play(group: AnimationGroup) {
    this.anim.play(group);
  }

  stop() {
    this.anim.stop();
  }

  focus(target: AnimTarget) {
    this.anim.focusTarget(target);
  }

  addToSequenceEditor(animationGroup: AnimationGroup) {
    this.#sequenceEditorService.addSequenceItem(animationGroup);
  }

  ngOnDestroy() {
    this.anim.dispose();
  }
}
