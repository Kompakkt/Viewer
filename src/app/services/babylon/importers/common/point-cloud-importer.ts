import { StandardMaterial } from '@babylonjs/core';

export class PointCloudImporter {
  public static debugMat?: StandardMaterial;
  public static toggleDebugMatVisibility() {
    if (!PointCloudImporter.debugMat) return;
    PointCloudImporter.debugMat.alpha = PointCloudImporter.debugMat.alpha <= 0.5 ? 1 : 0;
  }

  public static pointMat?: StandardMaterial;
  /**
   * Change the point size of the point cloud material.
   * @param size
   * @returns
   */
  public static changePointSize(size: number) {
    if (Number.isNaN(size)) size = 1;
    if (size < 0.1) size = 0.1;
    if (size > 10) size = 10;
    if (!PointCloudImporter.pointMat) return;
    PointCloudImporter.pointMat.pointSize = size;
  }

  public static currentLOD = 0;
  public static maxLOD = 10;
  public static loadNextLevelOfDetail?: () => Promise<void>;

  public static totalLoadedPoints = 0;
  public static totalPoints = Number.MAX_SAFE_INTEGER;
  public static pointsPerLevel?: number[];
}
