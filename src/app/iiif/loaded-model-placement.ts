/**
 * Babylon-side helper for the IIIF export: remembers the loader's local matrix of every root node
 * of a loaded 3D model and derives the model's effective placement from the current world matrices.
 *
 * Why the loader matrix is recorded instead of hard-coded: the glTF loader creates a `__root__`
 * node with its own handedness conversion (scaling (1, 1, -1) and a 180° rotation about Y in a
 * left-handed scene), other loaders (OBJ, STL, .babylon) leave their roots at identity. Kompakkt's
 * auto-placement (EntitySettingsService) later parents these roots to a helper node, or bakes the
 * helper transform into them (decomposeMeshSettingsHelper), so the original local matrix cannot be
 * recovered afterwards.
 */
import type { AbstractMesh } from '@babylonjs/core';
import type { Matrix } from '@babylonjs/core/Maths/math.vector';
import { effectiveModelTransform, type IIIFModelTransform } from './placement';

const loaderMatrices = new WeakMap<AbstractMesh, Matrix>();

/** Call right after a model was loaded, before anything re-parents or moves it. */
export const rememberLoaderMatrices = (meshes: AbstractMesh[]) => {
  for (const mesh of meshes) {
    if (mesh.parent) continue;
    loaderMatrices.set(mesh, mesh.computeWorldMatrix(true).clone());
  }
};

/**
 * Effective placement (IIIF space) of the model whose meshes are given, e.g. `processing.meshes$`.
 * Uses the world matrix of each recorded root node: `N = L⁻¹ · W` (see placement.ts).
 * Returns no transform if no root was recorded.
 */
export const getEffectiveModelTransform = (
  meshes: AbstractMesh[],
): { transform?: IIIFModelTransform; warnings: string[] } => {
  const roots = meshes.filter(mesh => !mesh.isDisposed() && loaderMatrices.has(mesh));
  if (!roots.length) return { warnings: [] };

  const results = roots.map(root =>
    effectiveModelTransform(root.computeWorldMatrix(true), loaderMatrices.get(root)!),
  );
  const [first] = results;
  const warnings = [...first.warnings];
  const same = (a: IIIFModelTransform, b: IIIFModelTransform) =>
    (['scale', 'rotation', 'translation'] as const).every(key =>
      (['x', 'y', 'z'] as const).every(axis => Math.abs(a[key][axis] - b[key][axis]) < 1e-6),
    );
  if (results.some(result => !same(result.transform, first.transform))) {
    warnings.push('Model root nodes are placed differently, exporting the placement of the first one');
  }
  return { transform: first.transform, warnings };
};
