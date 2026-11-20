import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent, LabelledCheckboxComponent, SliderComponent } from '@kompakkt/komponents';
import { FluentPipe } from 'src/app/pipes/fluent.pipe';
import { PointCloudImporter } from 'src/app/services/babylon/importers/common/point-cloud-importer';

@Component({
  selector: 'app-point-cloud-settings',
  imports: [FluentPipe, SliderComponent, ButtonComponent, LabelledCheckboxComponent],
  templateUrl: './point-cloud-settings.component.html',
  styleUrl: './point-cloud-settings.component.scss',
})
export class PointCloudSettingsComponent {
  currentLevelOfDetail = toSignal(PointCloudImporter.currentLOD$, { initialValue: 0 });
  maxLevelOfDetail = toSignal(PointCloudImporter.maxLOD$, { initialValue: 0 });
  #pointMat = toSignal(PointCloudImporter.pointMat$);
  currentPointSize = computed(() => this.#pointMat()?.pointSize ?? 1);

  #totalLoadedPoints = toSignal(PointCloudImporter.totalLoadedPoints$, { initialValue: 0 });
  loadedPointsCount = computed(() => this.#totalLoadedPoints());
  #totalPoints = toSignal(PointCloudImporter.totalPoints$, { initialValue: 1 });
  totalPointsCount = computed(() => this.#totalPoints());

  #pointsPerLevel = toSignal(PointCloudImporter.pointsPerLevel$, { initialValue: [] });
  pointsOfNextLevel = computed(
    () => this.#pointsPerLevel().at(this.currentLevelOfDetail() + 1) ?? 0,
  );

  loadedPointsPercentage = computed(() =>
    (this.loadedPointsCount() / this.totalPointsCount()).toFixed(2),
  );

  loadNextLevelOfDetail() {
    if (this.currentLevelOfDetail < this.maxLevelOfDetail) {
      void PointCloudImporter.loadNextLevelOfDetail?.();
    }
  }

  changePointSize(size: number) {
    PointCloudImporter.changePointSize(size);
  }

  toggleOctreeBoxes() {
    PointCloudImporter.toggleDebugMatVisibility();
  }
}
