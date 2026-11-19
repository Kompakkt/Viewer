import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent, LabelledCheckboxComponent, SliderComponent } from '@kompakkt/komponents';
import { FluentPipe } from 'src/app/pipes/fluent.pipe';
import { PointCloudImporter } from 'src/app/services/babylon/importers/common/point-cloud-importer';

@Component({
  selector: 'app-point-cloud-settings',
  imports: [FluentPipe, SliderComponent, ButtonComponent, LabelledCheckboxComponent],
  templateUrl: './point-cloud-settings.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './point-cloud-settings.component.scss',
})
export class PointCloudSettingsComponent {
  get currentLevelOfDetail() {
    return PointCloudImporter.currentLOD;
  }

  get maxLevelOfDetail() {
    return PointCloudImporter.maxLOD;
  }

  get currentPointSize() {
    return PointCloudImporter.pointMat?.pointSize ?? 1;
  }

  get loadedPointsCount() {
    return PointCloudImporter.totalLoadedPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get totalPointsCount() {
    return PointCloudImporter.totalPoints.toLocaleString('en-US').replaceAll(',', ' ');
  }

  get pointsOfNextLevel() {
    return (PointCloudImporter.pointsPerLevel?.[PointCloudImporter.currentLOD + 1] ?? 0)
      .toLocaleString('en-US')
      .replaceAll(',', ' ');
  }

  get loadedPointsPercentage() {
    return ((PointCloudImporter.totalLoadedPoints / PointCloudImporter.totalPoints) * 100).toFixed(
      2,
    );
  }

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
