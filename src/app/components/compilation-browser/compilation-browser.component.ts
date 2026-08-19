import { Component, computed, inject, signal } from '@angular/core';
import { FixImageUrlPipe } from 'src/app/pipes/fix-image-url.pipe';
import { ICompilation, IEntity } from '@kompakkt/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { ProcessingService } from '../../services/processing/processing.service';
import { ButtonComponent, ButtonRowComponent, TooltipDirective } from '@kompakkt/komponents';
import { MatIconModule } from '@angular/material/icon';
import { BackendService } from 'src/app/services/backend/backend.service';

@Component({
  selector: 'app-compilation-browser',
  templateUrl: './compilation-browser.component.html',
  styleUrls: ['./compilation-browser.component.scss'],
  imports: [
    TranslatePipe,
    FixImageUrlPipe,
    ButtonComponent,
    ButtonRowComponent,
    MatIconModule,
    TooltipDirective,
  ],
})
export class CompilationBrowserComponent {
  processing = inject(ProcessingService);
  backend = inject(BackendService);

  isReorderEnabled = signal(false);
  #originalOrder = signal<IEntity[]>([]);

  public colorToRGBA = (colorString: { r: number; g: number; b: number; a: number }) => {
    return `rgba(${colorString.r}, ${colorString.g}, ${colorString.b}, ${colorString.a})`;
  };

  isCompilationOwner = computed(() => {
    const { ofCompilation } = this.processing.isOwner();
    return ofCompilation;
  });

  enableReorder() {
    const isEnabled = this.isReorderEnabled();
    if (isEnabled) return;
    // Save current order for cancellation
    const entitiesArr = this.processing.compilationEntities();
    this.#originalOrder.set(entitiesArr);
    this.isReorderEnabled.set(true);
  }

  async cancelReorder() {
    const compilation = this.processing.compilation();
    if (compilation) {
      this.processing.compilation.set(
        this.#combineArrayWithCompilation(this.#originalOrder(), compilation),
      );
    }

    this.#originalOrder.set([]);
    this.isReorderEnabled.set(false);
  }

  #combineArrayWithCompilation(entities: IEntity[], compilation: ICompilation): ICompilation {
    return {
      ...compilation,
      entities: entities.reduce((acc, entity) => ({ ...acc, [entity._id]: entity }), {}),
    };
  }

  async saveReorder() {
    const compilation = this.processing.compilation();
    if (!compilation) return;
    const updatedCompilation = await this.backend.updateCompilation(compilation);
    if (updatedCompilation) {
      this.processing.compilation.set({ ...compilation });
      this.#originalOrder.set([]);
      this.isReorderEnabled.set(false);
    }
  }

  async applyReorderAction(
    event: Event,
    action: 'move_top' | 'move_up' | 'move_down' | 'move_bottom',
    index: number,
  ) {
    event.stopPropagation();
    const entitiesArr = this.processing.compilationEntities();
    const compilation = this.processing.compilation();
    if (!compilation) return;

    console.log('Before', entitiesArr, index, action);
    const newIndex = (() => {
      if (action === 'move_top') return 0;
      if (action === 'move_up') return Math.max(0, index - 1);
      if (action === 'move_down') return Math.min(entitiesArr.length - 1, index + 1);
      if (action === 'move_bottom') return entitiesArr.length - 1;
      return index;
    })();
    const entity = entitiesArr.splice(index, 1)[0];
    entitiesArr.splice(newIndex, 0, entity);
    console.log('After', entitiesArr, newIndex, action);

    this.processing.compilation.set(this.#combineArrayWithCompilation(entitiesArr, compilation));
  }
}
