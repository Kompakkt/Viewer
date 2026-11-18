# IIIF 4.0 Import/Export – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Kompakkt viewer imports IIIF Presentation 4.0 manifests with 3D Scenes through a dedicated, tested module and exports an entity plus its annotations as a complete 4.0 manifest.

**Architecture:** New directory `src/app/iiif/`. Pure, Babylon-free functions (`types`, `color`, `coordinates`, `model`, `parser`, `comments`, `exporter`) are tested with `bun test`. Only `scene-builder.ts` (an Angular service) talks to Babylon. For the import, `processing.service.ts` only calls the parser and the builder. The export hangs off the annotations editor.

**Tech Stack:** Angular 19, Babylon.js 8.38, TypeScript, Bun 1.3 (`bun test`), file-saver

**Spec:** `docs/superpowers/specs/2026-11-18-iiif-4-import-export-design.md`

## Global Constraints

- Plain IIIF 4.0 spec only. No custom `@context`, no Kompakkt extension.
- `@context` on export: `http://iiif.io/api/presentation/4/context.json`
- All values in `model.ts` are in **IIIF space** (right-handed). Conversion happens **only** through `coordinates.ts`.
- Point IIIF ↔ Babylon: `(x, y, z)` ↔ `(-x, y, z)`. Rotation in degrees: `(x, y, z)` ↔ `(x, -y, -z)`.
- Kompakkt camera positions (`cameraPositionInitial.position`, `relatedPerspective.position`) are ArcRotate values: `x = alpha`, `y = beta`, `z = radius` relative to `target`.
- `scene.useRightHandedSystem` is not changed.
- Modules other than `scene-builder.ts` import nothing from `@babylonjs/*` or `@angular/*`. Types from `src/common` only via `import type`.
- Test files are named `*.test.ts` and live next to the code. The Angular build configuration excludes them.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/app/iiif/types.ts` | new | JSON types for IIIF 4.0 (loose, for export and docs) |
| `src/app/iiif/color.ts` | new | Hex ↔ RGB |
| `src/app/iiif/coordinates.ts` | new | Axis, rotation and ArcRotate conversion |
| `src/app/iiif/model.ts` | new | internal `IIIFSceneModel` |
| `src/app/iiif/parser.ts` | new | Manifest JSON → `IIIFSceneModel` |
| `src/app/iiif/comments.ts` | new | Comment → `IAnnotation`, camera → `ICameraPerspective` |
| `src/app/iiif/scene-builder.ts` | new | `IIIFSceneBuilderService`: model → Babylon |
| `src/app/iiif/exporter.ts` | new | Entity + settings + annotations → manifest |
| `src/app/iiif/__fixtures__/scene-basic.json` | new | Test manifest |
| `src/app/iiif/*.test.ts` | new | Tests |
| `src/app/services/processing/processing.service.ts` | modify | Replace the IIIF block (lines 455–1328) with calls, remove the Manifesto import |
| `src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.{ts,html}` | modify | Export button |
| `package.json`, `tsconfig.json`, `README.md` | modify | Test script, test exclude, docs, remove Manifesto |

## PR split

- **PR 1:** Task 1
- **PR 2:** Task 2 and Task 3
- **PR 3:** Task 4
- **PR 4:** Task 5 and Task 6
- **PR 5:** Task 7

---

### Task 1: Test-Setup, `color.ts`, `coordinates.ts`, `types.ts`

**Files:**
- Modify: `package.json` (scripts)
- Modify: `tsconfig.json:28` (exclude)
- Create: `src/app/iiif/color.ts`, `src/app/iiif/coordinates.ts`, `src/app/iiif/types.ts`
- Test: `src/app/iiif/color.test.ts`, `src/app/iiif/coordinates.test.ts`

**Interfaces:**
- Produces:
  - `RGB { r; g; b }` (0–255)
  - `hexToRgb(hex: string): RGB | undefined`
  - `rgbToHex(rgb: RGB): string`
  - `Vec3 { x; y; z }`
  - `ArcRotate { alpha; beta; radius }`
  - `pointToBabylon(p: Vec3): Vec3`, `pointToIIIF(p: Vec3): Vec3`
  - `rotationToBabylon(deg: Vec3): Vec3`, `rotationToIIIF(deg: Vec3): Vec3`
  - `toVec3(v: unknown): Vec3`
  - `arcRotateToCartesian(arc: ArcRotate, target: Vec3): Vec3`
  - `cartesianToArcRotate(position: Vec3, target: Vec3): ArcRotate`
  - from `types.ts`: `PRESENTATION_4_CONTEXT` and the types `Manifest`, `Scene`, `AnnotationPage`, `Annotation`, `Transform`

- [ ] **Step 1: Add the test script and the build exclude**

Add to `"scripts"` in `package.json`:

```json
"test": "bun test src/app/iiif",
```

In `tsconfig.json`, replace the line `"exclude": ["src/@kompakkt/plugins/*.ts"],` with:

```json
"exclude": ["src/@kompakkt/plugins/*.ts", "./src/**/*.test.ts"],
```

- [ ] **Step 2: Write failing tests for `color.ts`**

`src/app/iiif/color.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { hexToRgb, rgbToHex } from './color';

describe('color', () => {
  test('hexToRgb parses #RRGGBB', () => {
    expect(hexToRgb('#99CCFF')).toEqual({ r: 153, g: 204, b: 255 });
  });

  test('hexToRgb accepts missing hash and lowercase', () => {
    expect(hexToRgb('a0ffa0')).toEqual({ r: 160, g: 255, b: 160 });
  });

  test('hexToRgb rejects invalid input', () => {
    expect(hexToRgb('#FFF')).toBeUndefined();
    expect(hexToRgb('#GGGGGG')).toBeUndefined();
  });

  test('rgbToHex produces uppercase #RRGGBB and clamps', () => {
    expect(rgbToHex({ r: 153, g: 204, b: 255 })).toBe('#99CCFF');
    expect(rgbToHex({ r: -4, g: 300, b: 15.6 })).toBe('#00FF10');
  });
});
```

- [ ] **Step 3: Write failing tests for `coordinates.ts`**

`src/app/iiif/coordinates.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import {
  arcRotateToCartesian,
  cartesianToArcRotate,
  pointToBabylon,
  pointToIIIF,
  rotationToBabylon,
  rotationToIIIF,
  toVec3,
} from './coordinates';

describe('coordinates', () => {
  test('points flip the x axis', () => {
    expect(pointToBabylon({ x: 1, y: 2, z: 3 })).toEqual({ x: -1, y: 2, z: 3 });
    expect(pointToIIIF({ x: -1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('zero stays positive zero', () => {
    expect(Object.is(pointToBabylon({ x: 0, y: 0, z: 0 }).x, 0)).toBe(true);
  });

  test('rotations keep x and negate y and z', () => {
    expect(rotationToBabylon({ x: 10, y: 20, z: 30 })).toEqual({ x: 10, y: -20, z: -30 });
    expect(rotationToIIIF(rotationToBabylon({ x: 10, y: 20, z: 30 }))).toEqual({ x: 10, y: 20, z: 30 });
  });

  test('toVec3 accepts plain and underscore vectors', () => {
    expect(toVec3({ x: 1, y: 2, z: 3 })).toEqual({ x: 1, y: 2, z: 3 });
    expect(toVec3({ _x: 4, _y: 5, _z: 6 })).toEqual({ x: 4, y: 5, z: 6 });
    expect(toVec3(undefined)).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('arcRotateToCartesian matches Babylon ArcRotateCamera', () => {
    const p = arcRotateToCartesian({ alpha: Math.PI / 2, beta: Math.PI / 2, radius: 10 }, { x: 0, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(10);
  });

  test('cartesianToArcRotate inverts arcRotateToCartesian', () => {
    const target = { x: 1, y: 2, z: 3 };
    const arc = { alpha: 0.7, beta: 1.1, radius: 5 };
    const back = cartesianToArcRotate(arcRotateToCartesian(arc, target), target);
    expect(back.alpha).toBeCloseTo(arc.alpha);
    expect(back.beta).toBeCloseTo(arc.beta);
    expect(back.radius).toBeCloseTo(arc.radius);
  });

  test('cartesianToArcRotate handles zero distance', () => {
    expect(cartesianToArcRotate({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 })).toEqual({ alpha: 0, beta: 0, radius: 0 });
  });
});
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `bun test src/app/iiif`
Expected: FAIL with `Cannot find module './color'` or `'./coordinates'`

- [ ] **Step 5: Implement `color.ts`**

```ts
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): RGB | undefined => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return undefined;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

const clampByte = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

export const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${[r, g, b]
    .map(value => clampByte(value).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
```

- [ ] **Step 6: Implement `coordinates.ts`**

```ts
/**
 * The single place for converting between IIIF (right-handed, +y up, +z forward)
 * and Babylon.js (left-handed). Mirrors on the X axis.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Kompakkt stores cameras as ArcRotate values: x = alpha, y = beta, z = radius. */
export interface ArcRotate {
  alpha: number;
  beta: number;
  radius: number;
}

const negate = (value: number) => (value === 0 ? 0 : -value);

export const pointToBabylon = (p: Vec3): Vec3 => ({ x: negate(p.x), y: p.y, z: p.z });
export const pointToIIIF = (p: Vec3): Vec3 => ({ x: negate(p.x), y: p.y, z: p.z });

/** Rotations in degrees. Mirroring on X keeps X; Y and Z change sign. */
export const rotationToBabylon = (deg: Vec3): Vec3 => ({ x: deg.x, y: negate(deg.y), z: negate(deg.z) });
export const rotationToIIIF = (deg: Vec3): Vec3 => ({ x: deg.x, y: negate(deg.y), z: negate(deg.z) });

/** Accepts IVector3, Babylon vectors ({_x,_y,_z}) and undefined. */
export const toVec3 = (value: unknown): Vec3 => {
  const record = (value ?? {}) as Record<string, unknown>;
  const pick = (key: 'x' | 'y' | 'z') => Number(record[key] ?? record[`_${key}`] ?? 0);
  return { x: pick('x'), y: pick('y'), z: pick('z') };
};

/** Same formula as Babylon's ArcRotateCamera (in Babylon space). */
export const arcRotateToCartesian = ({ alpha, beta, radius }: ArcRotate, target: Vec3): Vec3 => ({
  x: target.x + radius * Math.cos(alpha) * Math.sin(beta),
  y: target.y + radius * Math.cos(beta),
  z: target.z + radius * Math.sin(alpha) * Math.sin(beta),
});

/** Inverse of arcRotateToCartesian; alpha ends up in (-π, π]. */
export const cartesianToArcRotate = (position: Vec3, target: Vec3): ArcRotate => {
  const dx = position.x - target.x;
  const dy = position.y - target.y;
  const dz = position.z - target.z;
  const radius = Math.hypot(dx, dy, dz);
  if (radius === 0) return { alpha: 0, beta: 0, radius: 0 };
  return {
    alpha: Math.atan2(dz, dx),
    beta: Math.acos(Math.min(1, Math.max(-1, dy / radius))),
    radius,
  };
};
```

- [ ] **Step 7: Create `types.ts` (types and one constant only)**

```ts
/** Loose JSON types for the part of IIIF Presentation 4.0 we use. */
export const PRESENTATION_4_CONTEXT = 'http://iiif.io/api/presentation/4/context.json';

export type LanguageMap = Record<string, string[]>;

export interface Reference {
  id: string;
  type: string;
}

export interface PointSelector {
  type: 'PointSelector';
  x?: number;
  y?: number;
  z?: number;
  instant?: number;
}

export interface PolygonZSelector {
  type: 'PolygonZSelector';
  value: string;
}

export type Selector = PointSelector | PolygonZSelector | { type: string; [key: string]: unknown };

export interface Transform {
  type: 'ScaleTransform' | 'RotateTransform' | 'TranslateTransform';
  x?: number;
  y?: number;
  z?: number;
}

export interface Value {
  type: 'Value';
  value: number;
  unit?: string;
}

export interface Resource {
  id?: string;
  type: string;
  format?: string;
  label?: LanguageMap;
  [key: string]: unknown;
}

export interface SpecificResource {
  id?: string;
  type: 'SpecificResource';
  source: Resource | Reference | Array<Resource | Reference>;
  selector?: Selector | Selector[];
  transform?: Transform[];
}

export interface TextualBody {
  id?: string;
  type: 'TextualBody';
  value: string;
  format?: string;
  language?: string | string[];
  label?: LanguageMap;
}

export type AnnotationBody = Resource | SpecificResource | TextualBody;
export type AnnotationTarget = Reference | SpecificResource;

export interface Annotation {
  id: string;
  type: 'Annotation';
  motivation?: string | string[];
  body?: AnnotationBody | AnnotationBody[];
  bodyValue?: string;
  target: AnnotationTarget | AnnotationTarget[];
  scope?: Reference | Reference[];
  behavior?: string[];
  exclude?: string[];
  label?: LanguageMap;
}

export interface AnnotationPage {
  id: string;
  type: 'AnnotationPage';
  items?: Annotation[];
}

export interface Scene {
  id: string;
  type: 'Scene';
  label?: LanguageMap;
  backgroundColor?: string;
  items?: AnnotationPage[];
  annotations?: AnnotationPage[];
}

export interface Manifest {
  '@context'?: string | string[];
  id: string;
  type: 'Manifest';
  label: LanguageMap;
  items: Array<Scene | Resource>;
  annotations?: AnnotationPage[];
}
```

- [ ] **Step 8: Run the tests**

Run: `bun test src/app/iiif`
Expected: PASS, 11 tests

- [ ] **Step 9: Check that the Angular build ignores the test files**

Run: `bunx ng build --configuration development`
Expected: build succeeds, no error about `bun:test`

- [ ] **Step 10: Commit**

```bash
git add package.json tsconfig.json src/app/iiif/color.ts src/app/iiif/color.test.ts src/app/iiif/coordinates.ts src/app/iiif/coordinates.test.ts src/app/iiif/types.ts
git commit -m "feat(iiif): add test setup, color and coordinate helpers, IIIF 4.0 types"
```

---

### Task 2: `model.ts` and `parser.ts`

**Files:**
- Create: `src/app/iiif/model.ts`, `src/app/iiif/parser.ts`, `src/app/iiif/__fixtures__/scene-basic.json`
- Test: `src/app/iiif/parser.test.ts`

**Interfaces:**
- Consumes: `hexToRgb`, `RGB` (color.ts); `Vec3` (coordinates.ts)
- Produces:
  - `IIIFSceneModel`, `IIIFModelItem`, `IIIFCanvasItem`, `IIIFCameraItem`, `IIIFLightItem`, `IIIFComment`, `IIIFTransform`, `LightKind`, `CameraProjection` (model.ts)
  - `parseManifest(input: unknown): IIIFSceneModel`
  - `class IIIFParseError extends Error`

- [ ] **Step 1: Create `model.ts`**

```ts
import type { RGB } from './color';
import type { Vec3 } from './coordinates';

/** All vectors in this model are in IIIF space (right-handed). */
export interface IIIFTransform {
  kind: 'scale' | 'rotate' | 'translate';
  value: Vec3;
}

export interface IIIFModelItem {
  annotationId: string;
  url: string;
  format?: string;
  transforms: IIIFTransform[];
  /** PointSelector in the target of the painting annotation */
  position?: Vec3;
}

export interface IIIFCanvasItem {
  annotationId: string;
  /** Raw Canvas JSON from manifest.items */
  canvas: Record<string, any>;
  /** Value of the PolygonZSelector, e.g. "POLYGONZ((0 0 0, ...))" */
  polygonZ: string;
}

export type CameraProjection = 'perspective' | 'orthographic';

export interface IIIFCameraItem {
  annotationId: string;
  projection: CameraProjection;
  label?: string;
  position?: Vec3;
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
  transforms: IIIFTransform[];
  /** degrees */
  fieldOfView?: number;
  near?: number;
  far?: number;
  /** behavior: ["hidden"] – e.g. the camera of a comment */
  hidden: boolean;
}

export type LightKind = 'ambient' | 'directional' | 'point' | 'spot';

export interface IIIFLightItem {
  annotationId: string;
  kind: LightKind;
  color?: RGB;
  intensity?: number;
  /** degrees (SpotLight only) */
  angle?: number;
  position?: Vec3;
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
  transforms: IIIFTransform[];
}

export interface IIIFComment {
  annotationId: string;
  title: string;
  description: string;
  point: Vec3;
  /** first ID from `scope`; points to a camera annotation */
  cameraAnnotationId?: string;
}

export interface IIIFSceneModel {
  manifestId: string;
  label: string;
  sceneId: string;
  backgroundColor?: RGB;
  models: IIIFModelItem[];
  canvases: IIIFCanvasItem[];
  cameras: IIIFCameraItem[];
  lights: IIIFLightItem[];
  /** in document order = Kompakkt ranking */
  comments: IIIFComment[];
  warnings: string[];
}
```

- [ ] **Step 2: Create the fixture**

`src/app/iiif/__fixtures__/scene-basic.json`:

```json
{
  "@context": "http://iiif.io/api/presentation/4/context.json",
  "id": "https://example.org/iiif/basic.json",
  "type": "Manifest",
  "label": { "en": ["Basic Scene"] },
  "items": [
    {
      "id": "https://example.org/iiif/scene/1",
      "type": "Scene",
      "label": { "en": ["Scene"] },
      "backgroundColor": "#99CCFF",
      "items": [
        {
          "id": "https://example.org/iiif/scene/1/page/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.org/iiif/scene/1/anno/model",
              "type": "Annotation",
              "motivation": ["painting"],
              "body": {
                "type": "SpecificResource",
                "source": {
                  "id": "https://example.org/models/pawn.glb",
                  "type": "Model",
                  "format": "model/gltf-binary"
                },
                "transform": [
                  { "type": "ScaleTransform", "x": 2, "y": 2, "z": 2 },
                  { "type": "RotateTransform", "x": 0, "y": 90, "z": 0 },
                  { "type": "TranslateTransform", "x": 1, "y": 0, "z": 0 }
                ]
              },
              "target": {
                "type": "SpecificResource",
                "source": { "id": "https://example.org/iiif/scene/1", "type": "Scene" },
                "selector": [{ "type": "PointSelector", "x": 0, "y": 1, "z": 0 }]
              }
            },
            {
              "id": "https://example.org/iiif/scene/1/anno/camera",
              "type": "Annotation",
              "motivation": ["painting"],
              "body": {
                "type": "PerspectiveCamera",
                "fieldOfView": 50,
                "lookAt": { "id": "https://example.org/iiif/scene/1/anno/model", "type": "Annotation" }
              },
              "target": {
                "type": "SpecificResource",
                "source": { "id": "https://example.org/iiif/scene/1", "type": "Scene" },
                "selector": [{ "type": "PointSelector", "x": 0, "y": 6, "z": 10 }]
              }
            },
            {
              "id": "https://example.org/iiif/scene/1/anno/light",
              "type": "Annotation",
              "motivation": ["painting"],
              "body": {
                "type": "AmbientLight",
                "color": "#FFFFFF",
                "intensity": { "type": "Value", "value": 0.6, "unit": "relative" }
              },
              "target": { "id": "https://example.org/iiif/scene/1", "type": "Scene" }
            },
            {
              "id": "https://example.org/iiif/scene/1/anno/audio",
              "type": "Annotation",
              "motivation": ["painting"],
              "body": { "id": "https://example.org/audio.mp3", "type": "Sound" },
              "target": { "id": "https://example.org/iiif/scene/1", "type": "Scene" }
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://example.org/iiif/scene/1/comments",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.org/iiif/scene/1/comment/1",
              "type": "Annotation",
              "motivation": ["commenting"],
              "body": {
                "type": "TextualBody",
                "value": "Base of the pawn.",
                "format": "text/plain",
                "label": { "en": ["Base"] }
              },
              "target": {
                "type": "SpecificResource",
                "source": { "id": "https://example.org/iiif/scene/1", "type": "Scene" },
                "selector": [{ "type": "PointSelector", "x": 0.5, "y": 0.25, "z": 0 }]
              },
              "scope": [{ "id": "https://example.org/iiif/scene/1/anno/camera", "type": "Annotation" }]
            },
            {
              "id": "https://example.org/iiif/scene/1/comment/legacy",
              "type": "Annotation",
              "bodyValue": "Legacy comment",
              "target": {
                "type": "SpecificResource",
                "source": [{ "id": "https://example.org/iiif/scene/1", "type": "Scene" }],
                "selector": [{ "type": "PointSelector", "x": 1, "y": 2, "z": 3 }]
              }
            },
            {
              "id": "https://example.org/iiif/scene/1/comment/nopoint",
              "type": "Annotation",
              "motivation": ["commenting"],
              "body": { "type": "TextualBody", "value": "No point" },
              "target": { "id": "https://example.org/iiif/scene/1", "type": "Scene" }
            }
          ]
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Write failing tests**

`src/app/iiif/parser.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Glob } from 'bun';
import { IIIFParseError, parseManifest } from './parser';

const fixture = (name: string) =>
  JSON.parse(readFileSync(join(import.meta.dir, '__fixtures__', name), 'utf8'));

const SCENE = 'https://example.org/iiif/scene/1';

describe('parseManifest – scene-basic', () => {
  const model = parseManifest(fixture('scene-basic.json'));

  test('reads manifest and scene metadata', () => {
    expect(model.manifestId).toBe('https://example.org/iiif/basic.json');
    expect(model.label).toBe('Basic Scene');
    expect(model.sceneId).toBe(SCENE);
    expect(model.backgroundColor).toEqual({ r: 153, g: 204, b: 255 });
  });

  test('reads model with transforms in document order and target point', () => {
    expect(model.models).toEqual([
      {
        annotationId: `${SCENE}/anno/model`,
        url: 'https://example.org/models/pawn.glb',
        format: 'model/gltf-binary',
        transforms: [
          { kind: 'scale', value: { x: 2, y: 2, z: 2 } },
          { kind: 'rotate', value: { x: 0, y: 90, z: 0 } },
          { kind: 'translate', value: { x: 1, y: 0, z: 0 } },
        ],
        position: { x: 0, y: 1, z: 0 },
      },
    ]);
  });

  test('reads perspective camera with lookAt reference', () => {
    expect(model.cameras).toHaveLength(1);
    const camera = model.cameras[0];
    expect(camera.projection).toBe('perspective');
    expect(camera.fieldOfView).toBe(50);
    expect(camera.position).toEqual({ x: 0, y: 6, z: 10 });
    expect(camera.lookAtAnnotationId).toBe(`${SCENE}/anno/model`);
    expect(camera.hidden).toBe(false);
  });

  test('reads ambient light with Value intensity', () => {
    expect(model.lights).toHaveLength(1);
    expect(model.lights[0].kind).toBe('ambient');
    expect(model.lights[0].intensity).toBe(0.6);
    expect(model.lights[0].color).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('reads TextualBody and legacy bodyValue comments in order', () => {
    expect(model.comments).toEqual([
      {
        annotationId: `${SCENE}/comment/1`,
        title: 'Base',
        description: 'Base of the pawn.',
        point: { x: 0.5, y: 0.25, z: 0 },
        cameraAnnotationId: `${SCENE}/anno/camera`,
      },
      {
        annotationId: `${SCENE}/comment/legacy`,
        title: 'Legacy comment',
        description: '',
        point: { x: 1, y: 2, z: 3 },
        cameraAnnotationId: undefined,
      },
    ]);
  });

  test('collects warnings instead of failing', () => {
    expect(model.warnings.some(w => w.includes('Unsupported body type "sound"'))).toBe(true);
    expect(model.warnings.some(w => w.includes('comment/nopoint'))).toBe(true);
  });
});

describe('parseManifest – errors', () => {
  test('invalid JSON string', () => {
    expect(() => parseManifest('{')).toThrow(IIIFParseError);
  });

  test('not a manifest', () => {
    expect(() => parseManifest({ type: 'Collection' })).toThrow('Not a IIIF Manifest');
  });

  test('manifest without scene', () => {
    expect(() =>
      parseManifest({ id: 'x', type: 'Manifest', label: { en: ['x'] }, items: [] }),
    ).toThrow('No Scene found in IIIF Manifest');
  });

  test('marks hidden cameras and orthographic projection', () => {
    const model = parseManifest({
      id: 'm',
      type: 'Manifest',
      label: { none: ['m'] },
      items: [
        {
          id: 's',
          type: 'Scene',
          items: [
            {
              id: 'p',
              type: 'AnnotationPage',
              items: [
                {
                  id: 'c',
                  type: 'Annotation',
                  motivation: ['painting'],
                  behavior: ['hidden'],
                  body: { type: 'OrthographicCamera', lookAt: { type: 'PointSelector', x: 1, y: 2, z: 3 } },
                  target: { id: 's', type: 'Scene' },
                },
              ],
            },
          ],
        },
      ],
    });
    expect(model.cameras[0]).toMatchObject({
      projection: 'orthographic',
      hidden: true,
      lookAtPoint: { x: 1, y: 2, z: 3 },
    });
  });
});

const DEMO_DIR = join(import.meta.dir, '..', '..', '..', 'demos', 'iiif-3d');
const demoFiles = existsSync(DEMO_DIR) ? [...new Glob('**/*.json').scanSync(DEMO_DIR)] : [];

if (demoFiles.length === 0) {
  test.skip('demo manifests (submodule demos/iiif-3d not initialized)', () => {});
} else {
  describe('parseManifest – demo manifests', () => {
    for (const file of demoFiles) {
      test(file, () => {
        const json = JSON.parse(readFileSync(join(DEMO_DIR, file), 'utf8'));
        const items: any[] = Array.isArray(json?.items) ? json.items : [];
        if (json?.type !== 'Manifest' || !items.some(item => item?.type === 'Scene')) return;
        expect(() => parseManifest(json)).not.toThrow();
      });
    }
  });
}
```

- [ ] **Step 4: Run the tests and confirm they fail**

Run: `bun test src/app/iiif/parser.test.ts`
Expected: FAIL with `Cannot find module './parser'`

- [ ] **Step 5: Implement `parser.ts`**

```ts
import { hexToRgb } from './color';
import type { Vec3 } from './coordinates';
import type { IIIFComment, IIIFSceneModel, IIIFTransform, LightKind } from './model';

export class IIIFParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IIIFParseError';
  }
}

type Json = Record<string, any>;

const asArray = <T>(value: T | T[] | undefined | null): T[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

const firstLabel = (label: unknown): string | undefined => {
  if (!label || typeof label !== 'object') return undefined;
  for (const values of Object.values(label as Record<string, unknown>)) {
    const first = asArray(values as string | string[])[0];
    if (typeof first === 'string') return first;
  }
  return undefined;
};

/** Number or IIIF Value ({ type: "Value", value }). */
const toNumber = (value: unknown): number | undefined => {
  const raw = typeof value === 'object' && value !== null ? (value as Json)['value'] : value;
  if (raw === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const pointFromSelector = (selector: unknown): Vec3 | undefined => {
  const s = selector as Json | undefined;
  if (s?.['type'] !== 'PointSelector') return undefined;
  if (s['x'] === undefined && s['y'] === undefined && s['z'] === undefined) return undefined;
  return { x: Number(s['x'] ?? 0), y: Number(s['y'] ?? 0), z: Number(s['z'] ?? 0) };
};

const targetSelectors = (annotation: Json): Json[] =>
  asArray<Json>(annotation['target']).flatMap(target => asArray<Json>(target?.['selector']));

const targetPoint = (annotation: Json): Vec3 | undefined =>
  targetSelectors(annotation)
    .map(pointFromSelector)
    .find((point): point is Vec3 => point !== undefined);

const TRANSFORM_KINDS: Record<string, IIIFTransform['kind']> = {
  scaletransform: 'scale',
  rotatetransform: 'rotate',
  translatetransform: 'translate',
};

const parseTransforms = (list: unknown): IIIFTransform[] =>
  asArray<Json>(list as Json | Json[]).flatMap((transform): IIIFTransform[] => {
    const kind = TRANSFORM_KINDS[String(transform?.['type'] ?? '').toLowerCase()];
    if (!kind) return [];
    const fallback = kind === 'scale' ? 1 : 0;
    return [
      {
        kind,
        value: {
          x: Number(transform['x'] ?? fallback),
          y: Number(transform['y'] ?? fallback),
          z: Number(transform['z'] ?? fallback),
        },
      },
    ];
  });

/** Unwraps SpecificResource bodies: returns source, transforms and type (lowercase). */
const unwrapBody = (body: Json) => {
  if (body?.['type'] === 'SpecificResource') {
    const source: Json = asArray<Json>(body['source'])[0] ?? {};
    return {
      source,
      transforms: parseTransforms(body['transform'] ?? source['transform']),
      type: String(source['type'] ?? '').toLowerCase(),
    };
  }
  return {
    source: body ?? {},
    transforms: parseTransforms(body?.['transform']),
    type: String(body?.['type'] ?? '').toLowerCase(),
  };
};

const parseLookAt = (lookAt: unknown): { lookAtAnnotationId?: string; lookAtPoint?: Vec3 } => {
  const l = lookAt as Json | undefined;
  if (!l) return {};
  const point = pointFromSelector(l);
  if (point) return { lookAtPoint: point };
  return typeof l['id'] === 'string' ? { lookAtAnnotationId: l['id'] } : {};
};

const isComment = (annotation: Json) =>
  asArray(annotation['motivation']).includes('commenting') ||
  annotation['bodyValue'] !== undefined ||
  asArray<Json>(annotation['body']).some(body => body?.['type'] === 'TextualBody');

const parseComment = (annotation: Json, warnings: string[]): IIIFComment | undefined => {
  const id = String(annotation['id']);
  const point = targetPoint(annotation);
  if (!point) {
    warnings.push(`Comment ${id} has no PointSelector and was skipped`);
    return undefined;
  }
  const textual = asArray<Json>(annotation['body']).find(body => body?.['type'] === 'TextualBody');
  const value = String(textual?.['value'] ?? annotation['bodyValue'] ?? '');
  const title = firstLabel(textual?.['label']) ?? value;
  return {
    annotationId: id,
    title,
    description: value === title ? '' : value,
    point,
    cameraAnnotationId: asArray<Json>(annotation['scope'])
      .map(scope => scope?.['id'])
      .find((scopeId): scopeId is string => typeof scopeId === 'string'),
  };
};

const LIGHT_KINDS: Record<string, LightKind> = {
  ambientlight: 'ambient',
  directionallight: 'directional',
  pointlight: 'point',
  spotlight: 'spot',
};

const parsePainting = (annotation: Json, manifest: Json, model: IIIFSceneModel) => {
  const id = String(annotation['id']);
  if (asArray(annotation['exclude']).length) {
    model.warnings.push(`Annotation ${id}: "exclude" is not supported and was ignored`);
  }

  for (const rawBody of asArray<Json>(annotation['body'])) {
    const { source, transforms, type } = unwrapBody(rawBody);
    const position = targetPoint(annotation);

    if (type === 'model') {
      if (typeof source['id'] !== 'string') {
        model.warnings.push(`Annotation ${id}: Model without id was skipped`);
        continue;
      }
      model.models.push({
        annotationId: id,
        url: source['id'],
        format: typeof source['format'] === 'string' ? source['format'] : undefined,
        transforms,
        position,
      });
    } else if (type === 'perspectivecamera' || type === 'orthographiccamera') {
      model.cameras.push({
        annotationId: id,
        projection: type === 'perspectivecamera' ? 'perspective' : 'orthographic',
        label: firstLabel(source['label']),
        position,
        transforms,
        fieldOfView: toNumber(source['fieldOfView']),
        near: toNumber(source['near']),
        far: toNumber(source['far']),
        hidden: asArray(annotation['behavior']).includes('hidden'),
        ...parseLookAt(source['lookAt'] ?? rawBody['lookAt']),
      });
    } else if (LIGHT_KINDS[type]) {
      model.lights.push({
        annotationId: id,
        kind: LIGHT_KINDS[type],
        color: typeof source['color'] === 'string' ? hexToRgb(source['color']) : undefined,
        intensity: toNumber(source['intensity'] ?? rawBody['intensity']),
        angle: toNumber(source['angle']),
        position,
        transforms,
        ...parseLookAt(source['lookAt'] ?? rawBody['lookAt']),
      });
    } else if (type === 'canvas') {
      const canvas = asArray<Json>(manifest['items']).find(
        item => item?.['type'] === 'Canvas' && item?.['id'] === source['id'],
      );
      const polygon = targetSelectors(annotation).find(s => s?.['type'] === 'PolygonZSelector');
      if (!canvas || typeof polygon?.['value'] !== 'string') {
        model.warnings.push(`Annotation ${id}: Canvas or PolygonZSelector not found`);
        continue;
      }
      model.canvases.push({ annotationId: id, canvas, polygonZ: polygon['value'] });
    } else if (type === 'scene') {
      model.warnings.push(`Annotation ${id}: nested Scenes are not supported`);
    } else {
      model.warnings.push(`Annotation ${id}: Unsupported body type "${type}"`);
    }
  }
};

export const parseManifest = (input: unknown): IIIFSceneModel => {
  let json: unknown = input;
  if (typeof input === 'string') {
    try {
      json = JSON.parse(input);
    } catch {
      throw new IIIFParseError('Invalid JSON');
    }
  }

  const manifest = json as Json;
  if (!manifest || typeof manifest !== 'object' || manifest['type'] !== 'Manifest') {
    throw new IIIFParseError('Not a IIIF Manifest');
  }

  const scenes = asArray<Json>(manifest['items']).filter(item => item?.['type'] === 'Scene');
  const scene = scenes[0];
  if (!scene) throw new IIIFParseError('No Scene found in IIIF Manifest');

  const model: IIIFSceneModel = {
    manifestId: String(manifest['id'] ?? ''),
    label: firstLabel(manifest['label']) ?? firstLabel(scene['label']) ?? 'IIIF Manifest',
    sceneId: String(scene['id'] ?? ''),
    backgroundColor:
      typeof scene['backgroundColor'] === 'string' ? hexToRgb(scene['backgroundColor']) : undefined,
    models: [],
    canvases: [],
    cameras: [],
    lights: [],
    comments: [],
    warnings: [],
  };

  if (scenes.length > 1) {
    model.warnings.push(`Manifest has ${scenes.length} Scenes, only the first one is loaded`);
  }

  const pages = [
    ...asArray<Json>(scene['items']),
    ...asArray<Json>(scene['annotations']),
    ...asArray<Json>(manifest['annotations']),
  ];

  for (const page of pages) {
    if (page?.['type'] !== 'AnnotationPage') continue;
    if (!Array.isArray(page['items'])) {
      model.warnings.push(`External AnnotationPage ${page['id']} was not loaded`);
      continue;
    }
    for (const annotation of page['items'] as Json[]) {
      if (annotation?.['type'] !== 'Annotation') continue;
      if (isComment(annotation)) {
        const comment = parseComment(annotation, model.warnings);
        if (comment) model.comments.push(comment);
      } else {
        parsePainting(annotation, manifest, model);
      }
    }
  }

  return model;
};
```

- [ ] **Step 6: Run the tests**

Run: `bun test src/app/iiif`
Expected: PASS. Without the initialized submodule, one skipped test "demo manifests" is shown.

- [ ] **Step 7: Check against the demo manifests**

Run: `git submodule update --init demos/iiif-3d && bun test src/app/iiif/parser.test.ts`
Expected: PASS for all demo files. If one fails, that's a parser bug: inspect the file and fix the parser, not the test.

- [ ] **Step 8: Commit**

```bash
git add src/app/iiif/model.ts src/app/iiif/parser.ts src/app/iiif/parser.test.ts src/app/iiif/__fixtures__/scene-basic.json
git commit -m "feat(iiif): add babylon-free IIIF 4.0 scene model and parser"
```

---

### Task 3: `scene-builder.ts` and switching `processing.service.ts` over

Goal: The existing import runs through the parser and the builder **with no visible change in behavior**. Deliberate exception: the entity name is now the manifest label instead of "IIIF Manifest". The comment perspective stays as before for now; Task 4 replaces it.

**Files:**
- Create: `src/app/iiif/comments.ts` (basic functions), `src/app/iiif/scene-builder.ts`
- Test: `src/app/iiif/comments.test.ts`
- Modify: `src/app/services/processing/processing.service.ts` (import block lines 51–59; method `processIIIF3DManifest` lines 455–1328; fields from line 108)

**Interfaces:**
- Consumes: `IIIFSceneModel` and item types (model.ts); `pointToBabylon`, `rotationToBabylon`, `cartesianToArcRotate`, `Vec3` (coordinates.ts); `parseManifest`, `IIIFParseError` (parser.ts)
- Produces:
  - `ARC_ROTATE_CAMERA_TYPE = 'arcRotateCam'`
  - `perspectiveFromPoints(position: Vec3, target: Vec3): ICameraPerspective` (both in Babylon space)
  - `commentToAnnotation(comment: IIIFComment, ranking: number, perspective: ICameraPerspective, referenceNormal: Vec3): IAnnotation`
  - `IIIFSceneBuilderService.build(model: IIIFSceneModel): Promise<IIIFBuildResult>`
  - `IIIFBuildResult { meshes; annotations; entitySettings; hasExplicitLights; hasExplicitCamera; applyCamera }`

- [ ] **Step 1: Write a failing test for `comments.ts`**

`src/app/iiif/comments.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { ARC_ROTATE_CAMERA_TYPE, commentToAnnotation, perspectiveFromPoints } from './comments';

describe('comments', () => {
  test('perspectiveFromPoints stores alpha/beta/radius in position', () => {
    const perspective = perspectiveFromPoints({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 });
    expect(perspective.cameraType).toBe(ARC_ROTATE_CAMERA_TYPE);
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.x).toBeCloseTo(Math.PI / 2);
    expect(position.y).toBeCloseTo(Math.PI / 2);
    expect(position.z).toBeCloseTo(10);
    expect(perspective.target).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('commentToAnnotation converts point to Babylon space', () => {
    const annotation = commentToAnnotation(
      { annotationId: 'c1', title: 'T', description: 'D', point: { x: 1, y: 2, z: 3 } },
      4,
      perspectiveFromPoints({ x: 0, y: 0, z: 10 }, { x: -1, y: 2, z: 3 }),
      { x: 0, y: 1, z: 0 },
    );
    expect(annotation._id).toBe('c1');
    expect(annotation.ranking).toBe(4);
    expect(annotation.body.content.title).toBe('T');
    expect(annotation.body.content.description).toBe('D');
    expect(annotation.target.selector.referencePoint).toEqual({ x: -1, y: 2, z: 3 });
    expect(annotation.target.selector.referenceNormal).toEqual({ x: 0, y: 1, z: 0 });
    expect(annotation.target.source.relatedEntity).toBe('standalone');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `bun test src/app/iiif/comments.test.ts`
Expected: FAIL with `Cannot find module './comments'`

- [ ] **Step 3: Implement `comments.ts`**

```ts
import type { IAgent, IAnnotation, ICameraPerspective } from 'src/common';
import { cartesianToArcRotate, pointToBabylon, type Vec3 } from './coordinates';
import type { IIIFComment } from './model';

/** Value that cameraManager.getInitialPosition() returns for ArcRotate cameras. */
export const ARC_ROTATE_CAMERA_TYPE = 'arcRotateCam';

const KOMPAKKT_SOFTWARE = {
  _id: 'kompakkt',
  type: 'software',
  name: 'Kompakkt',
  homepage: 'https://github.com/Kompakkt/Kompakkt',
} as IAgent;

const KOMPAKKT_PERSON = { _id: 'kompakkt', type: 'person', name: 'Kompakkt' } as IAgent;

/** Kompakkt perspective from camera position and target, both in Babylon space. */
export const perspectiveFromPoints = (position: Vec3, target: Vec3): ICameraPerspective => {
  const { alpha, beta, radius } = cartesianToArcRotate(position, target);
  return {
    cameraType: ARC_ROTATE_CAMERA_TYPE,
    position: { x: alpha, y: beta, z: radius },
    target: { ...target },
    preview: '',
  };
};

export const commentToAnnotation = (
  comment: IIIFComment,
  ranking: number,
  perspective: ICameraPerspective,
  referenceNormal: Vec3,
): IAnnotation =>
  ({
    _id: comment.annotationId,
    identifier: comment.annotationId,
    ranking,
    validated: true,
    created: new Date().toISOString(),
    motivation: 'defaultMotivation',
    creator: KOMPAKKT_PERSON,
    lastModifiedBy: KOMPAKKT_PERSON,
    generator: KOMPAKKT_SOFTWARE,
    body: {
      type: 'annotation',
      content: {
        type: 'text',
        title: comment.title,
        description: comment.description,
        relatedPerspective: perspective,
      },
    },
    target: {
      source: { relatedEntity: 'standalone', relatedCompilation: '' },
      selector: {
        referencePoint: pointToBabylon(comment.point),
        referenceNormal,
      },
    },
  }) as IAnnotation;
```

- [ ] **Step 4: Run the test**

Run: `bun test src/app/iiif`
Expected: PASS

- [ ] **Step 5: Create `scene-builder.ts`**

The Babylon logic comes from `processing.service.ts` (lines 578–1098 and 1284–1313). It now works on `IIIFSceneModel` instead of Manifesto objects.

```ts
import { Injectable, inject } from '@angular/core';
import {
  AbstractMesh,
  Axis,
  Camera,
  Color3,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  PBRMaterial,
  Quaternion,
  StandardMaterial,
  Texture,
  TransformNode,
  Vector3,
  VertexData,
} from '@babylonjs/core';
import type { IAnnotation, ICameraPerspective, IEntitySettings } from 'src/common';
import { minimalSettings } from '../../assets/settings/settings';
import { BabylonService } from '../services/babylon/babylon.service';
import type { RGB } from './color';
import { hexToRgb } from './color';
import { commentToAnnotation } from './comments';
import { pointToBabylon, rotationToBabylon, type Vec3 } from './coordinates';
import type {
  IIIFCameraItem,
  IIIFCanvasItem,
  IIIFLightItem,
  IIIFModelItem,
  IIIFSceneModel,
  IIIFTransform,
} from './model';

export interface IIIFBuildResult {
  meshes: AbstractMesh[];
  annotations: IAnnotation[];
  entitySettings: IEntitySettings;
  hasExplicitLights: boolean;
  hasExplicitCamera: boolean;
  /** applies the manifest's default camera or positions the camera automatically */
  applyCamera: () => void;
}

interface LookAtSource {
  lookAtAnnotationId?: string;
  lookAtPoint?: Vec3;
}

const DEG_TO_RAD = Math.PI / 180;
const toVector3 = (v: Vec3) => new Vector3(v.x, v.y, v.z);
const toBabylonVector = (iiifPoint: Vec3) => toVector3(pointToBabylon(iiifPoint));
const rgbToColor3 = ({ r, g, b }: RGB) => new Color3(r / 255, g / 255, b / 255);

/** Rotation X, then Y, then Z – same as the previous importer. */
const rotationQuaternion = (iiifDegrees: Vec3) => {
  const r = rotationToBabylon(iiifDegrees);
  return Quaternion.RotationAxis(Axis.X, r.x * DEG_TO_RAD)
    .multiply(Quaternion.RotationAxis(Axis.Y, r.y * DEG_TO_RAD))
    .multiply(Quaternion.RotationAxis(Axis.Z, r.z * DEG_TO_RAD));
};

/** Direction vectors for cameras and lights, via Euler angles as before. */
const rotateDirection = (direction: Vector3, transforms: IIIFTransform[]) =>
  transforms
    .filter(t => t.kind === 'rotate')
    .reduce((current, t) => {
      const r = rotationToBabylon(t.value);
      const q = Quaternion.FromEulerAngles(r.x * DEG_TO_RAD, r.y * DEG_TO_RAD, r.z * DEG_TO_RAD);
      return current.applyRotationQuaternion(q).normalize();
    }, direction.clone());

const applyTransforms = (node: TransformNode, transforms: IIIFTransform[]) => {
  for (const transform of transforms) {
    if (transform.kind === 'scale') {
      const v = toVector3(transform.value);
      node.scaling = node.scaling.multiply(v);
      node.position = node.position.multiply(v);
    }
    if (transform.kind === 'rotate') {
      const net = rotationQuaternion(transform.value).multiply(Quaternion.FromEulerVector(node.rotation));
      node.rotation = net.toEulerAngles();
      node.position.applyRotationQuaternionInPlace(net);
    }
    if (transform.kind === 'translate') {
      node.position.addInPlace(toBabylonVector(transform.value));
    }
  }
};

const getMeshBounds = (meshes: AbstractMesh[]) => {
  const boxes = meshes.filter(m => !m.isDisposed()).map(m => m.getBoundingInfo().boundingBox);
  if (!boxes.length) return undefined;
  const min = boxes.map(b => b.minimumWorld).reduce((a, b) => Vector3.Minimize(a, b));
  const max = boxes.map(b => b.maximumWorld).reduce((a, b) => Vector3.Maximize(a, b));
  return { min, max, size: max.subtract(min), center: min.add(max).scale(0.5) };
};

const parsePolygonZ = (value: string): Vector3[] | undefined => {
  const match = value.match(/POLYGONZ\s*\(\((.*)\)\)/i);
  if (!match) return undefined;
  const points = match[1]
    .split(',')
    .map(point => point.trim().split(/\s+/).map(Number))
    .filter(point => point.length === 3 && point.every(Number.isFinite))
    .map(([x, y, z]) => toBabylonVector({ x, y, z }));
  return points.length >= 4 ? points : undefined;
};

const getCanvasImageUrl = (canvas: Record<string, any>): string | undefined => {
  for (const page of Array.isArray(canvas?.['items']) ? canvas['items'] : []) {
    for (const annotation of Array.isArray(page?.items) ? page.items : []) {
      const body = Array.isArray(annotation?.body) ? annotation.body[0] : annotation?.body;
      if (body?.type !== 'Image' || !body?.id) continue;
      const service = Array.isArray(body.service) ? body.service[0] : body.service;
      const serviceId = service?.id ?? service?.['@id'];
      return serviceId ? `${serviceId}/full/1024,/0/default.jpg` : body.id;
    }
  }
  return undefined;
};

const getCanvasUVs = (canvas: Record<string, any>, polygon: Vector3[]) => {
  const draftOrderUVs = [0, 0, 0, 1, 1, 1, 1, 0];
  const reversedOrderUVs = [0, 0, 1, 0, 1, 1, 0, 1];
  const width = Number(canvas?.['width'] ?? 0);
  const height = Number(canvas?.['height'] ?? 0);
  if (polygon.length < 4 || width <= 0 || height <= 0 || width === height) return draftOrderUVs;
  const firstEdge = Vector3.Distance(polygon[0], polygon[1]);
  const closingEdge = Vector3.Distance(polygon[0], polygon[3]);
  if (firstEdge === 0 || closingEdge === 0) return draftOrderUVs;
  const edgeRatio = firstEdge / closingEdge;
  return Math.abs(edgeRatio - width / height) < Math.abs(edgeRatio - height / width)
    ? reversedOrderUVs
    : draftOrderUVs;
};

@Injectable({ providedIn: 'root' })
export class IIIFSceneBuilderService {
  private babylon = inject(BabylonService);

  public async build(model: IIIFSceneModel): Promise<IIIFBuildResult> {
    const scene = this.babylon.getScene();
    const entitySettings = structuredClone(minimalSettings) as IEntitySettings;
    (entitySettings as any).skipInitialCameraSetup = true;
    scene.environmentIntensity = 1;

    if (model.backgroundColor) {
      const color = { ...model.backgroundColor, a: 1 };
      entitySettings.background = { color, effect: false };
      this.babylon.setBackgroundColor(color);
      this.babylon.setBackgroundImage(false);
      this.babylon.hideBackgroundHelpers();
    }

    const meshes: AbstractMesh[] = [];
    const transformNodes: TransformNode[] = [];
    const annotationPositions = new Map<string, Vector3>();

    for (const item of model.models) {
      const node = await this.buildModel(item, meshes);
      if (!node) continue;
      transformNodes.push(node);
      annotationPositions.set(item.annotationId, node.position.clone());
    }
    for (const item of model.canvases) {
      const node = this.buildCanvas(item, meshes);
      if (node) transformNodes.push(node);
    }

    const builtLights = model.lights.map(light => this.buildLight(light, annotationPositions));
    const hasExplicitLights = builtLights.some(Boolean);
    if (hasExplicitLights && meshes.length) {
      scene.environmentIntensity = 0;
      meshes.forEach(mesh => {
        if (mesh.material instanceof PBRMaterial) mesh.material.environmentIntensity = 0;
      });
    }

    const defaultCamera = model.cameras.find(camera => !camera.hidden);
    const applyCamera = defaultCamera
      ? () => this.applyExplicitCamera(defaultCamera, annotationPositions, meshes)
      : () => this.automoveCamera(transformNodes);

    const annotations = this.buildAnnotations(model, meshes);

    return {
      meshes,
      annotations,
      entitySettings,
      hasExplicitLights,
      hasExplicitCamera: !!defaultCamera,
      applyCamera,
    };
  }

  /** Previous importer behavior. Replaced in Task 4. */
  protected buildAnnotations(model: IIIFSceneModel, _meshes: AbstractMesh[]): IAnnotation[] {
    return model.comments.map((comment, index) => {
      const target = pointToBabylon(comment.point);
      const n = Vector3.Zero().subtract(toVector3(target)).normalize();
      const legacy: ICameraPerspective = {
        cameraType: 'ArcRotateCamera',
        position: { x: n.x, y: n.y, z: n.z },
        target,
        preview: '',
      };
      return commentToAnnotation(comment, index + 1, legacy, { x: n.x, y: n.y, z: n.z });
    });
  }

  private async buildModel(item: IIIFModelItem, meshes: AbstractMesh[]) {
    const loaded = await this.babylon.addEntityToScene(item.url);
    if (!loaded?.length) {
      console.warn('[IIIF] Model could not be loaded', item.url);
      return undefined;
    }
    meshes.push(...loaded);
    const node = new TransformNode(`transformNode-${item.url}`, this.babylon.getScene());
    loaded.filter(mesh => !mesh.parent).forEach(mesh => mesh.setParent(node));
    applyTransforms(node, item.transforms);
    if (item.position) node.position.addInPlace(toBabylonVector(item.position));
    return node;
  }

  private buildCanvas(item: IIIFCanvasItem, meshes: AbstractMesh[]) {
    const polygon = parsePolygonZ(item.polygonZ);
    if (!polygon) {
      console.warn('[IIIF] Invalid PolygonZSelector', item);
      return undefined;
    }
    const scene = this.babylon.getScene();
    const canvas = item.canvas;
    const canvasId = String(canvas['id'] ?? 'iiif-canvas');
    const uvs = getCanvasUVs(canvas, polygon);
    const background =
      typeof canvas['backgroundColor'] === 'string' ? hexToRgb(canvas['backgroundColor']) : undefined;
    const backgroundColor = background ? rgbToColor3(background) : Color3.White();

    const createSide = (name: string, indices: number[], material: StandardMaterial) => {
      const plane = new Mesh(name, scene);
      const vertexData = new VertexData();
      vertexData.positions = polygon.flatMap(point => point.asArray());
      vertexData.indices = indices;
      vertexData.uvs = uvs;
      const normals: number[] = [];
      VertexData.ComputeNormals(vertexData.positions, vertexData.indices, normals);
      vertexData.normals = normals;
      vertexData.applyToMesh(plane);
      plane.material = material;
      plane.renderingGroupId = 1;
      return plane;
    };

    const imageUrl = getCanvasImageUrl(canvas);
    const texture = imageUrl ? new Texture(imageUrl, scene, false, true) : undefined;
    const imageMaterial = new StandardMaterial(`${canvasId}-image-material`, scene);
    imageMaterial.diffuseColor = imageUrl ? Color3.White() : backgroundColor;
    if (texture) {
      imageMaterial.diffuseTexture = texture;
      imageMaterial.emissiveTexture = texture;
      imageMaterial.emissiveColor = Color3.White();
    }
    imageMaterial.backFaceCulling = true;

    const backgroundMaterial = new StandardMaterial(`${canvasId}-background-material`, scene);
    backgroundMaterial.diffuseColor = backgroundColor;
    backgroundMaterial.emissiveColor = backgroundColor;
    if (!background && texture) {
      backgroundMaterial.diffuseTexture = texture;
      backgroundMaterial.emissiveTexture = texture;
      backgroundMaterial.emissiveColor = Color3.White();
    }
    backgroundMaterial.backFaceCulling = true;

    const imagePlane = createSide(`${canvasId}-image`, [0, 1, 2, 0, 2, 3], imageMaterial);
    const backgroundPlane = createSide(`${canvasId}-background`, [0, 2, 1, 0, 3, 2], backgroundMaterial);
    const node = new TransformNode(`transformNode-${canvasId}`, scene);
    imagePlane.setParent(node);
    backgroundPlane.setParent(node);
    meshes.push(imagePlane, backgroundPlane);
    return node;
  }

  protected resolveLookAt(source: LookAtSource, positions: Map<string, Vector3>) {
    if (source.lookAtAnnotationId) return positions.get(source.lookAtAnnotationId);
    if (source.lookAtPoint) return toBabylonVector(source.lookAtPoint);
    return undefined;
  }

  /** Returns true if a light was created. */
  protected buildLight(light: IIIFLightItem, positions: Map<string, Vector3>): boolean {
    const scene = this.babylon.getScene();
    const intensity = light.intensity ?? 1;
    const diffuse = light.color ? rgbToColor3(light.color) : Color3.White();

    if (light.kind === 'ambient') {
      const ambient = new HemisphericLight(light.annotationId, Vector3.Up(), scene);
      ambient.diffuse = diffuse;
      ambient.groundColor = diffuse;
      ambient.specular = Color3.Black();
      ambient.intensity = intensity;
      return true;
    }

    if (light.kind === 'directional') {
      const position = light.position ? toBabylonVector(light.position) : Vector3.Zero();
      const lookAt = this.resolveLookAt(light, positions);
      const base = lookAt ? lookAt.subtract(position).normalize() : Vector3.Down();
      const directional = new DirectionalLight(
        light.annotationId,
        rotateDirection(base, light.transforms),
        scene,
      );
      directional.diffuse = diffuse;
      directional.position = position;
      directional.intensity = intensity;
      return true;
    }

    console.warn(`[IIIF] Light type "${light.kind}" is not supported yet`);
    return false;
  }

  private applyExplicitCamera(
    camera: IIIFCameraItem,
    positions: Map<string, Vector3>,
    meshes: AbstractMesh[],
  ) {
    const bounds = getMeshBounds(meshes);
    const translation = camera.transforms
      .filter(t => t.kind === 'translate')
      .reduce<Vector3 | undefined>(
        (sum, t) => (sum ?? Vector3.Zero()).add(toBabylonVector(t.value)),
        undefined,
      );
    const position = camera.position
      ? toBabylonVector(camera.position)
      : (translation ?? Vector3.Zero());
    const direction = camera.transforms.some(t => t.kind === 'rotate')
      ? rotateDirection(new Vector3(0, 0, -1), camera.transforms)
      : undefined;
    const target =
      this.resolveLookAt(camera, positions) ??
      (direction
        ? position.add(
            direction.scale(bounds ? Math.max(Vector3.Distance(position, bounds.center), 1) : 1),
          )
        : (bounds?.center ?? position.add(new Vector3(0, 0, -1))));

    this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    const active = this.babylon.getScene().activeCamera as any;
    active.setTarget(target, true);
    if (typeof active.setPosition === 'function') {
      active.setPosition(position.clone());
    } else {
      active.position = position.clone();
    }

    const mode =
      camera.projection === 'orthographic' ? Camera.ORTHOGRAPHIC_CAMERA : Camera.PERSPECTIVE_CAMERA;
    active.mode = mode;
    if (mode === Camera.ORTHOGRAPHIC_CAMERA) {
      const canvas = this.babylon.getCanvas();
      const aspect = (canvas.clientWidth || 1) / (canvas.clientHeight || 1);
      const halfHeight = bounds
        ? Math.max(bounds.size.y / 2, bounds.size.x / (2 * aspect), bounds.size.z / 2, 1) * 1.2
        : 1;
      active.orthoTop = halfHeight;
      active.orthoBottom = -halfHeight;
      active.orthoLeft = -halfHeight * aspect;
      active.orthoRight = halfHeight * aspect;
    }
    active.attachControl(this.babylon.getCanvas(), false);
    if (camera.fieldOfView !== undefined) active.fov = camera.fieldOfView * DEG_TO_RAD;
  }

  private automoveCamera(transformNodes: TransformNode[]) {
    const boxes = transformNodes
      .flatMap(node => node.getChildMeshes(false).filter((m): m is Mesh => m instanceof Mesh))
      .map(mesh => mesh.getBoundingInfo().boundingBox)
      .filter(box => box.extendSizeWorld.asArray().some(v => v > 0));
    if (!boxes.length) return;

    const center = boxes
      .reduce((sum, box) => sum.add(box.centerWorld), Vector3.Zero())
      .scale(1 / boxes.length);
    const maxExtend = Math.max(
      ...boxes.flatMap(box =>
        [...box.maximumWorld.asArray(), ...box.minimumWorld.asArray()].map(Math.abs),
      ),
    );

    this.babylon.cameraManager.setActiveCameraTarget(center);
    this.babylon.cameraManager.moveActiveCameraToPosition(
      new Vector3(Math.PI / 2, Math.PI / 2, maxExtend * 2.5),
    );
  }
}
```

- [ ] **Step 6: Switch `processing.service.ts` over – imports**

Delete the block in lines 51–59 (`import { Annotation, AnnotationBody, … } from '@iiif/3d-manifesto-dev';`) and replace it with:

```ts
import type { IIIFSceneModel } from '../../iiif/model';
import { IIIFParseError, parseManifest as parseIIIFManifest } from '../../iiif/parser';
import { IIIFSceneBuilderService } from '../../iiif/scene-builder';
```

Below `private http: HttpClient = inject(HttpClient);` (line 115), add:

```ts
  private iiifSceneBuilder: IIIFSceneBuilderService = inject(IIIFSceneBuilderService);
```

- [ ] **Step 7: Switch `processing.service.ts` over – replace the method**

Replace the whole method `private async processIIIF3DManifest(manifestJson: object) { … }` (lines 455–1328, up to just before `public importIIIF3DManifestJson`) with:

```ts
  private async processIIIF3DManifest(manifestJson: unknown) {
    this.loadingScreen.show();
    this.standaloneAnnotations$.next([]);

    try {
      this.babylon.clearScene();
      this.babylon.cameraManager.setCameraType('ArcRotateCamera');
    } catch (error) {
      console.warn('[IIIF] Failed to clear scene before import', error);
    }

    let model: IIIFSceneModel;
    try {
      model = parseIIIFManifest(manifestJson);
    } catch (error) {
      console.error('[IIIF] Manifest parsing failed', error);
      this.message.error(
        error instanceof IIIFParseError ? error.message : 'Failed to parse IIIF manifest JSON.',
      );
      this.loadingScreen.hide();
      return;
    }
    model.warnings.forEach(warning => console.warn('[IIIF]', warning));

    const result = await this.iiifSceneBuilder.build(model);
    this.standaloneAnnotations$.next(result.annotations);

    if (result.meshes.length) {
      const entity = {
        ...baseEntity(),
        _id: 'standalone_entity',
        name: model.label,
        relatedDigitalEntity: { _id: 'standalone_entity' },
        settings: result.entitySettings,
        mediaType: 'model',
      } as IEntity;

      this.updateActiveEntity(entity, result.meshes);
      this.settings$.next({
        localSettings: entity.settings,
        serverSettings: entity.settings,
      });
    }

    this.loadingScreen.hide();
    this.bootstrapped$.next(true);

    setTimeout(() => {
      result.applyCamera();
      if (result.hasExplicitCamera) setTimeout(result.applyCamera, 250);
    }, 0);
  }
```

- [ ] **Step 8: Remove unused Babylon imports**

Run:

```bash
for n in Camera Color3 DirectionalLight HemisphericLight Mesh PBRMaterial Quaternion StandardMaterial Texture TransformNode VertexData AbstractMesh Vector3 Annotation AnnotationBody AnnotationPage Manifest SpecificResource; do printf "%s: " $n; grep -cw "$n" src/app/services/processing/processing.service.ts; done
```

Expected: Every name with a count of `1` now only appears in the import. Remove those names from the `@babylonjs/core` import (lines 4–18). Names with more matches stay.

- [ ] **Step 9: Build and tests**

Run: `bun test src/app/iiif && bunx ng build --configuration development`
Expected: tests PASS, build succeeds

- [ ] **Step 10: Manual regression check in the browser**

Run: `bun run start` and open `http://localhost:4200/?manifest=<URL>`. Use the example manifests listed in the import dialog (`dialog-iiif-import.component.ts`) as URLs, one after another. To compare with the state before Task 3, use `git stash` or check out the previous commit.

Expected: Models, transforms, camera, lights, Canvas-in-Scene and comment markers look the same as before. Only the entity name now matches the manifest label.

- [ ] **Step 11: Commit**

```bash
git add src/app/iiif/comments.ts src/app/iiif/comments.test.ts src/app/iiif/scene-builder.ts src/app/services/processing/processing.service.ts
git commit -m "refactor(iiif): route manifest import through parser and scene builder"
```

---

### Task 4: Comments with a linked camera or a computed view; PointLight and SpotLight

**Files:**
- Modify: `src/app/iiif/comments.ts`, `src/app/iiif/scene-builder.ts`
- Test: `src/app/iiif/comments.test.ts`

**Interfaces:**
- Consumes: `perspectiveFromPoints`, `commentToAnnotation` (Task 3); `IIIFCameraItem` (Task 2)
- Produces:
  - `perspectiveFromCamera(camera: IIIFCameraItem, fallbackTarget: Vec3): ICameraPerspective | undefined` (`fallbackTarget` in IIIF space)
  - `perspectiveAlongNormal(target: Vec3, normal: Vec3, distance: number): ICameraPerspective` (Babylon space)

- [ ] **Step 1: Add failing tests**

In `src/app/iiif/comments.test.ts`, extend the import and append these tests:

```ts
import {
  ARC_ROTATE_CAMERA_TYPE,
  commentToAnnotation,
  perspectiveAlongNormal,
  perspectiveFromCamera,
  perspectiveFromPoints,
} from './comments';

describe('perspectives', () => {
  test('perspectiveFromCamera converts IIIF camera to Babylon arc-rotate values', () => {
    const perspective = perspectiveFromCamera(
      {
        annotationId: 'cam',
        projection: 'perspective',
        position: { x: 0, y: 0, z: 10 },
        lookAtPoint: { x: 0, y: 0, z: 0 },
        transforms: [],
        hidden: true,
      },
      { x: 5, y: 5, z: 5 },
    )!;
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.x).toBeCloseTo(Math.PI / 2);
    expect(position.y).toBeCloseTo(Math.PI / 2);
    expect(position.z).toBeCloseTo(10);
    expect(perspective.target).toEqual({ x: 0, y: 0, z: 0 });
  });

  test('perspectiveFromCamera falls back to comment point as target', () => {
    const perspective = perspectiveFromCamera(
      { annotationId: 'cam', projection: 'perspective', position: { x: 1, y: 0, z: 0 }, transforms: [], hidden: true },
      { x: 2, y: 0, z: 0 },
    )!;
    expect(perspective.target).toEqual({ x: -2, y: 0, z: 0 });
  });

  test('perspectiveFromCamera returns undefined without position', () => {
    expect(
      perspectiveFromCamera({ annotationId: 'cam', projection: 'perspective', transforms: [], hidden: true }, { x: 0, y: 0, z: 0 }),
    ).toBeUndefined();
  });

  test('perspectiveAlongNormal places the camera along the normal', () => {
    const perspective = perspectiveAlongNormal({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 4);
    const position = perspective.position as { x: number; y: number; z: number };
    expect(position.y).toBeCloseTo(0);
    expect(position.z).toBeCloseTo(4);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `bun test src/app/iiif/comments.test.ts`
Expected: FAIL with `perspectiveFromCamera is not a function` or similar

- [ ] **Step 3: Add the functions to `comments.ts`**

Replace the import `import type { IIIFComment } from './model';` with `import type { IIIFCameraItem, IIIFComment } from './model';` and append:

```ts
/** Perspective from a IIIF camera. fallbackTarget (IIIF space) applies when lookAt is not a point. */
export const perspectiveFromCamera = (
  camera: IIIFCameraItem,
  fallbackTarget: Vec3,
): ICameraPerspective | undefined => {
  if (!camera.position) return undefined;
  const target = camera.lookAtPoint ?? fallbackTarget;
  return perspectiveFromPoints(pointToBabylon(camera.position), pointToBabylon(target));
};

/** Camera at `distance` along `normal` in front of `target` (both in Babylon space). */
export const perspectiveAlongNormal = (target: Vec3, normal: Vec3, distance: number): ICameraPerspective => {
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  const position = {
    x: target.x + (normal.x / length) * distance,
    y: target.y + (normal.y / length) * distance,
    z: target.z + (normal.z / length) * distance,
  };
  return perspectiveFromPoints(position, target);
};
```

- [ ] **Step 4: Run the tests**

Run: `bun test src/app/iiif`
Expected: PASS

- [ ] **Step 5: Replace `buildAnnotations` in the builder**

In `scene-builder.ts`:
- Add `Ray`, `PointLight` and `SpotLight` to the `@babylonjs/core` import.
- Replace `import { commentToAnnotation } from './comments';` with `import { commentToAnnotation, perspectiveAlongNormal, perspectiveFromCamera } from './comments';`.
- Replace the whole `buildAnnotations` method with:

```ts
  protected buildAnnotations(model: IIIFSceneModel, meshes: AbstractMesh[]): IAnnotation[] {
    const bounds = getMeshBounds(meshes);
    const viewDistance = bounds ? Math.max(bounds.size.length() * 0.75, 1) : 3;

    return model.comments.map((comment, index) => {
      const target = pointToBabylon(comment.point);
      const normal = this.surfaceNormal(target, meshes);
      const camera = model.cameras.find(c => c.annotationId === comment.cameraAnnotationId);
      const perspective =
        (camera && perspectiveFromCamera(camera, comment.point)) ??
        perspectiveAlongNormal(target, normal, viewDistance);
      return commentToAnnotation(comment, index + 1, perspective, normal);
    });
  }

  /** Normal at the comment point via a raycast from outside; fallback: direction from the center. */
  private surfaceNormal(target: Vec3, meshes: AbstractMesh[]): Vec3 {
    const point = toVector3(target);
    const bounds = getMeshBounds(meshes);
    const outward = point.subtract(bounds?.center ?? Vector3.Zero());
    if (outward.lengthSquared() === 0) outward.copyFrom(Vector3.Up());
    outward.normalize();

    const reach = bounds ? bounds.size.length() : 1;
    const ray = new Ray(point.add(outward.scale(reach)), outward.negate(), reach * 2);
    const pick = this.babylon.getScene().pickWithRay(ray, mesh => meshes.includes(mesh));
    const normal = (pick?.hit ? pick.getNormal(true, true) : null) ?? outward;
    return { x: normal.x, y: normal.y, z: normal.z };
  }
```

- [ ] **Step 6: Add PointLight and SpotLight to `buildLight`**

In `buildLight`, insert directly before `console.warn(\`[IIIF] Light type …`:

```ts
    if (light.kind === 'point' || light.kind === 'spot') {
      const position = light.position ? toBabylonVector(light.position) : Vector3.Zero();
      if (light.kind === 'point') {
        const point = new PointLight(light.annotationId, position, scene);
        point.diffuse = diffuse;
        point.intensity = intensity;
        return true;
      }
      const lookAt = this.resolveLookAt(light, positions);
      const direction = lookAt
        ? lookAt.subtract(position).normalize()
        : rotateDirection(Vector3.Down(), light.transforms);
      const spot = new SpotLight(
        light.annotationId,
        position,
        direction,
        (light.angle ?? 90) * DEG_TO_RAD,
        2,
        scene,
      );
      spot.diffuse = diffuse;
      spot.intensity = intensity;
      return true;
    }
```

- [ ] **Step 7: Build and tests**

Run: `bun test src/app/iiif && bunx ng build --configuration development`
Expected: PASS, build succeeds

- [ ] **Step 8: Manual check in the browser**

Run `bun run start`, then load demo manifests with comments (e.g. from `demos/iiif-3d`, "3D Comments"). Click each comment in the annotation list.

Expected: The camera moves to the point and looks at it from the direction of the surface or of the linked camera. For SpotLight, compare the cone width with a demo manifest. Check in the spec text whether IIIF `angle` means the full or the half cone angle, and add `* 2` if needed.

- [ ] **Step 9: Commit**

```bash
git add src/app/iiif/comments.ts src/app/iiif/comments.test.ts src/app/iiif/scene-builder.ts
git commit -m "feat(iiif): derive comment perspectives from linked cameras or surface normals; add point and spot lights"
```

---

### Task 5: `exporter.ts`

**Files:**
- Create: `src/app/iiif/exporter.ts`, `src/app/iiif/__fixtures__/export-input.ts`
- Test: `src/app/iiif/exporter.test.ts`

**Interfaces:**
- Consumes: `rgbToHex`; `arcRotateToCartesian`, `pointToIIIF`, `rotationToIIIF`, `toVec3`, `Vec3`; `PRESENTATION_4_CONTEXT`, `Annotation`, `Manifest`, `Scene`, `Transform`
- Produces:
  - `ManifestExportInput { entityId; entityName; modelUrl; settings: IEntitySettings; annotations: IAnnotation[]; baseId? }`
  - `ManifestExportResult { manifest: Manifest; warnings: string[] }`
  - `exportManifest(input): ManifestExportResult`
  - `modelFormatFromUrl(url): string | undefined`
  - `isPublicUrl(url): boolean`

- [ ] **Step 1: Create the test helpers**

`src/app/iiif/__fixtures__/export-input.ts` (also used by the round-trip test in Task 7):

```ts
import type { IAnnotation, IEntitySettings } from 'src/common';
import type { ManifestExportInput } from '../exporter';

export const makeSettings = (overrides: Partial<IEntitySettings> = {}): IEntitySettings => ({
  preview: '',
  cameraPositionInitial: { position: { x: Math.PI / 2, y: Math.PI / 2, z: 10 }, target: { x: 0, y: 0, z: 0 } },
  lights: [],
  background: { color: { r: 153, g: 204, b: 255, a: 1 }, effect: false },
  rotation: { x: 0, y: 0, z: 0 },
  scale: 1,
  ...overrides,
});

export const makeAnnotation = (
  id: string,
  ranking: number,
  title: string,
  description: string,
  point: { x: number; y: number; z: number },
): IAnnotation =>
  ({
    _id: id,
    ranking,
    body: {
      type: 'annotation',
      content: {
        type: 'text',
        title,
        description,
        relatedPerspective: {
          cameraType: 'arcRotateCam',
          position: { x: 0.8, y: 1.2, z: 6 },
          target: point,
          preview: 'data:image/png;base64,xyz',
        },
      },
    },
    target: {
      source: { relatedEntity: 'e1' },
      selector: { referencePoint: point, referenceNormal: { x: 0, y: 1, z: 0 } },
    },
  }) as unknown as IAnnotation;

export const makeInput = (overrides: Partial<ManifestExportInput> = {}): ManifestExportInput => ({
  entityId: 'e1',
  entityName: 'Pawn',
  modelUrl: 'https://kompakkt.de/server/models/pawn/high.glb',
  settings: makeSettings(),
  annotations: [
    makeAnnotation('a2', 2, 'Second', 'Two', { x: 1, y: 0, z: 0 }),
    makeAnnotation('a1', 1, 'First', '', { x: -1, y: 2, z: 3 }),
  ],
  ...overrides,
});
```

- [ ] **Step 2: Write failing tests**

`src/app/iiif/exporter.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest, isPublicUrl, modelFormatFromUrl } from './exporter';

const collectIds = (value: unknown, ids: string[] = []): string[] => {
  if (Array.isArray(value)) value.forEach(v => collectIds(v, ids));
  else if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record['id'] === 'string' && record['type'] === 'Annotation' && 'motivation' in record) {
      ids.push(record['id']);
    }
    Object.values(record).forEach(v => collectIds(v, ids));
  }
  return ids;
};

describe('helpers', () => {
  test('modelFormatFromUrl', () => {
    expect(modelFormatFromUrl('https://x/y/model.GLB?token=1')).toBe('model/gltf-binary');
    expect(modelFormatFromUrl('https://x/y/model.gltf')).toBe('model/gltf+json');
    expect(modelFormatFromUrl('https://x/y/model.xyz')).toBeUndefined();
  });

  test('isPublicUrl', () => {
    expect(isPublicUrl('https://kompakkt.de/a.glb')).toBe(true);
    expect(isPublicUrl('blob:https://x/123')).toBe(false);
    expect(isPublicUrl('http://localhost:4200/a.glb')).toBe(false);
    expect(isPublicUrl('not a url')).toBe(false);
  });
});

describe('exportManifest', () => {
  test('builds a IIIF 4.0 manifest with one scene', () => {
    const { manifest, warnings } = exportManifest(makeInput());
    expect(manifest['@context']).toBe('http://iiif.io/api/presentation/4/context.json');
    expect(manifest.type).toBe('Manifest');
    expect(manifest.id).toBe('urn:kompakkt:e1');
    expect(manifest.label).toEqual({ none: ['Pawn'] });
    const scene = manifest.items[0] as any;
    expect(scene.type).toBe('Scene');
    expect(scene.backgroundColor).toBe('#99CCFF');
    expect(warnings).toEqual([]);
  });

  test('paints the model without transforms when settings are neutral', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const model = scene.items[0].items[0];
    expect(model.motivation).toEqual(['painting']);
    expect(model.body).toEqual({
      id: 'https://kompakkt.de/server/models/pawn/high.glb',
      type: 'Model',
      format: 'model/gltf-binary',
    });
    expect(model.target).toEqual({ id: 'urn:kompakkt:e1/scene/1', type: 'Scene' });
  });

  test('exports scale, rotation and translation in IIIF space and order', () => {
    const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 90, z: 0 }, translate: { x: 1, y: 2, z: 3 } });
    const scene = exportManifest(makeInput({ settings })).manifest.items[0] as any;
    expect(scene.items[0].items[0].body.transform).toEqual([
      { type: 'ScaleTransform', x: 2, y: 2, z: 2 },
      { type: 'RotateTransform', x: 10, y: -90, z: 0 },
      { type: 'TranslateTransform', x: -1, y: 2, z: 3 },
    ]);
  });

  test('exports the initial camera as cartesian PerspectiveCamera', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const camera = scene.items[0].items.find((a: any) => a.id.endsWith('/anno/camera'));
    expect(camera.body.type).toBe('PerspectiveCamera');
    expect(camera.body.lookAt).toEqual({ type: 'PointSelector', x: 0, y: 0, z: 0 });
    const selector = camera.target.selector[0];
    expect(selector.x).toBeCloseTo(0);
    expect(selector.y).toBeCloseTo(0);
    expect(selector.z).toBeCloseTo(10);
  });

  test('exports comments sorted by ranking with point and hidden camera', () => {
    const scene = exportManifest(makeInput()).manifest.items[0] as any;
    const comments = scene.annotations[0].items;
    expect(comments.map((c: any) => c.id)).toEqual([
      'urn:kompakkt:e1/scene/1/comment/a1',
      'urn:kompakkt:e1/scene/1/comment/a2',
    ]);
    expect(comments[0].motivation).toEqual(['commenting']);
    expect(comments[0].body).toEqual({
      type: 'TextualBody',
      value: 'First',
      format: 'text/markdown',
      label: { none: ['First'] },
    });
    expect(comments[0].target.selector).toEqual([{ type: 'PointSelector', x: 1, y: 2, z: 3 }]);
    const cameraId = comments[0].scope[0].id;
    const camera = scene.items[0].items.find((a: any) => a.id === cameraId);
    expect(camera.behavior).toEqual(['hidden']);
    expect(camera.body.type).toBe('PerspectiveCamera');
  });

  test('exports lights with Value intensity', () => {
    const settings = makeSettings({
      lights: [
        { type: 'HemisphericLight', position: { x: 0, y: 1, z: 0 }, intensity: 0.5 },
        { type: 'PointLight', position: { x: 1, y: 2, z: 3 }, intensity: 1 },
      ],
    });
    const scene = exportManifest(makeInput({ settings })).manifest.items[0] as any;
    const lights = scene.items[0].items.filter((a: any) => a.id.includes('/anno/light/'));
    expect(lights.map((l: any) => l.body.type)).toEqual(['AmbientLight', 'PointLight']);
    expect(lights[0].body.intensity).toEqual({ type: 'Value', value: 0.5, unit: 'relative' });
    expect(lights[1].target.selector[0]).toEqual({ type: 'PointSelector', x: -1, y: 2, z: 3 });
  });

  test('all annotation ids are unique', () => {
    const ids = collectIds(exportManifest(makeInput()).manifest);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('warns about non-public model URLs and unknown formats', () => {
    const { warnings } = exportManifest(makeInput({ modelUrl: 'blob:http://localhost/123' }));
    expect(warnings.some(w => w.includes('not publicly reachable'))).toBe(true);
    expect(warnings.some(w => w.includes('Unknown model format'))).toBe(true);
  });

  test('uses baseId when given', () => {
    const { manifest } = exportManifest(makeInput({ baseId: 'https://kompakkt.de/iiif/e1' }));
    expect(manifest.id).toBe('https://kompakkt.de/iiif/e1');
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `bun test src/app/iiif/exporter.test.ts`
Expected: FAIL with `Cannot find module './exporter'`

- [ ] **Step 4: Implement `exporter.ts`**

```ts
import type { IAnnotation, IEntitySettings } from 'src/common';
import { rgbToHex } from './color';
import { arcRotateToCartesian, pointToIIIF, rotationToIIIF, toVec3, type Vec3 } from './coordinates';
import {
  PRESENTATION_4_CONTEXT,
  type Annotation,
  type Manifest,
  type PointSelector,
  type Reference,
  type Scene,
  type Transform,
} from './types';

export interface ManifestExportInput {
  entityId: string;
  entityName: string;
  /** absolute URL of the model */
  modelUrl: string;
  settings: IEntitySettings;
  annotations: IAnnotation[];
  /** public base URL; default urn:kompakkt:<entityId> */
  baseId?: string;
}

export interface ManifestExportResult {
  manifest: Manifest;
  warnings: string[];
}

const MODEL_FORMATS: Record<string, string> = {
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  obj: 'model/obj',
  stl: 'model/stl',
  ply: 'model/ply',
};

export const modelFormatFromUrl = (url: string): string | undefined => {
  const path = url.split(/[?#]/)[0];
  const dot = path.lastIndexOf('.');
  return dot < 0 ? undefined : MODEL_FORMATS[path.slice(dot + 1).toLowerCase()];
};

export const isPublicUrl = (url: string): boolean => {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      !['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    );
  } catch {
    return false;
  }
};

/** Kompakkt light type → IIIF light type */
const LIGHT_TYPES: Record<string, string> = {
  HemisphericLight: 'AmbientLight',
  PointLight: 'PointLight',
  DirectionalLight: 'DirectionalLight',
};

const pointSelector = (p: Vec3): PointSelector => ({ type: 'PointSelector', x: p.x, y: p.y, z: p.z });

/** Kompakkt camera (alpha/beta/radius + target, Babylon) → Cartesian IIIF points. */
const cameraPoints = (arcPosition: unknown, rawTarget: unknown) => {
  const arc = toVec3(arcPosition);
  const target = toVec3(rawTarget);
  const position = arcRotateToCartesian({ alpha: arc.x, beta: arc.y, radius: arc.z }, target);
  return { position: pointToIIIF(position), target: pointToIIIF(target) };
};

export const exportManifest = (input: ManifestExportInput): ManifestExportResult => {
  const warnings: string[] = [];
  const { settings } = input;
  const base = input.baseId ?? `urn:kompakkt:${input.entityId}`;
  const sceneId = `${base}/scene/1`;
  const sceneRef: Reference = { id: sceneId, type: 'Scene' };
  const label = { none: [input.entityName] };

  if (!isPublicUrl(input.modelUrl)) {
    warnings.push(`Model URL is not publicly reachable: ${input.modelUrl}`);
  }
  const format = modelFormatFromUrl(input.modelUrl);
  if (!format) warnings.push(`Unknown model format for ${input.modelUrl}`);

  const placedAt = (p: Vec3) => ({
    type: 'SpecificResource' as const,
    source: sceneRef,
    selector: [pointSelector(p)],
  });

  const cameraAnnotation = (
    id: string,
    arcPosition: unknown,
    rawTarget: unknown,
    extra: Partial<Annotation> = {},
  ): Annotation => {
    const { position, target } = cameraPoints(arcPosition, rawTarget);
    return {
      id,
      type: 'Annotation',
      motivation: ['painting'],
      body: { type: 'PerspectiveCamera', lookAt: pointSelector(target) },
      target: placedAt(position),
      ...extra,
    };
  };

  // Model
  const modelResource = { id: input.modelUrl, type: 'Model', ...(format ? { format } : {}) };
  const transforms: Transform[] = [];
  if (settings.scale !== undefined && settings.scale !== 1) {
    transforms.push({ type: 'ScaleTransform', x: settings.scale, y: settings.scale, z: settings.scale });
  }
  const rotation = toVec3(settings.rotation);
  if (rotation.x || rotation.y || rotation.z) {
    transforms.push({ type: 'RotateTransform', ...rotationToIIIF(rotation) });
  }
  const translate = toVec3(settings.translate);
  if (translate.x || translate.y || translate.z) {
    transforms.push({ type: 'TranslateTransform', ...pointToIIIF(translate) });
  }

  const painting: Annotation[] = [
    {
      id: `${sceneId}/anno/model`,
      type: 'Annotation',
      motivation: ['painting'],
      body: transforms.length
        ? { type: 'SpecificResource', source: modelResource, transform: transforms }
        : modelResource,
      target: sceneRef,
    },
  ];

  // Default camera
  if (settings.cameraPositionInitial) {
    painting.push(
      cameraAnnotation(
        `${sceneId}/anno/camera`,
        settings.cameraPositionInitial.position,
        settings.cameraPositionInitial.target,
      ),
    );
  }

  // Lights
  (settings.lights ?? []).forEach((light, index) => {
    const type = LIGHT_TYPES[light.type];
    if (!type) {
      warnings.push(`Light type ${light.type} is not exported`);
      return;
    }
    painting.push({
      id: `${sceneId}/anno/light/${index + 1}`,
      type: 'Annotation',
      motivation: ['painting'],
      body: { type, intensity: { type: 'Value', value: light.intensity, unit: 'relative' } },
      target: type === 'AmbientLight' ? sceneRef : placedAt(pointToIIIF(toVec3(light.position))),
    });
  });

  // Comments
  const comments: Annotation[] = [...input.annotations]
    .sort((a, b) => a.ranking - b.ranking)
    .map(annotation => {
      const key = String(annotation._id);
      const cameraId = `${sceneId}/comment-camera/${key}`;
      const { title, description, relatedPerspective } = annotation.body.content;
      painting.push(
        cameraAnnotation(cameraId, relatedPerspective.position, relatedPerspective.target, {
          behavior: ['hidden'],
        }),
      );
      return {
        id: `${sceneId}/comment/${key}`,
        type: 'Annotation',
        motivation: ['commenting'],
        body: {
          type: 'TextualBody',
          value: description || title,
          format: 'text/markdown',
          label: { none: [title] },
        },
        target: placedAt(pointToIIIF(toVec3(annotation.target.selector.referencePoint))),
        scope: [{ id: cameraId, type: 'Annotation' }],
      };
    });

  const scene: Scene = {
    id: sceneId,
    type: 'Scene',
    label,
    items: [{ id: `${sceneId}/page/1`, type: 'AnnotationPage', items: painting }],
  };
  if (settings.background?.color) scene.backgroundColor = rgbToHex(settings.background.color);
  if (comments.length) {
    scene.annotations = [{ id: `${sceneId}/comments`, type: 'AnnotationPage', items: comments }];
  }

  return {
    manifest: { '@context': PRESENTATION_4_CONTEXT, id: base, type: 'Manifest', label, items: [scene] },
    warnings,
  };
};
```

- [ ] **Step 5: Run the tests**

Run: `bun test src/app/iiif`
Expected: PASS

- [ ] **Step 6: Check the spec form of the camera**

Look up in the spec text (https://iiif.io/api/presentation/4.0/, sections "Cameras", "lookAt", "scope", "Value"):
- whether `lookAt` may be an embedded PointSelector,
- whether `scope` is the right link from comment to camera,
- whether `intensity` has the form `{ type: "Value", value, unit: "relative" }`.

If anything differs: adjust the exporter **and** the parser, update the test expectations, and get the tests green.

- [ ] **Step 7: Commit**

```bash
git add src/app/iiif/exporter.ts src/app/iiif/exporter.test.ts src/app/iiif/__fixtures__/export-input.ts
git commit -m "feat(iiif): export entity, settings and annotations as IIIF 4.0 manifest"
```

---

### Task 6: Export button in the annotations editor

**Files:**
- Modify: `src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.ts`
- Modify: `src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.html:63-71`

**Interfaces:**
- Consumes: `exportManifest`, `ManifestExportInput` (Task 5); `ProcessingService.entity$`, `ProcessingService.settings$`; `MessageService.info`

- [ ] **Step 1: Add the method**

Add these imports to `annotations-editor.component.ts`:

```ts
import { environment } from 'src/environment';
import { exportManifest } from '../../../iiif/exporter';
import { MessageService } from '../../../services/message/message.service';
```

Field below `public userdata = inject(UserdataService);`:

```ts
  private message = inject(MessageService);
```

Method below `exportAnnotations()`:

```ts
  async exportIIIFManifest() {
    const [entity, annotations, settings] = await Promise.all([
      firstValueFrom(this.processing.entity$),
      firstValueFrom(this.currentAnnotations$),
      firstValueFrom(this.processing.settings$),
    ]);
    if (!entity) return;

    const path = entity.externalFile ?? entity.processed?.high ?? '';
    const modelUrl = /^https?:|^blob:/.test(path)
      ? path
      : new URL(`${environment.server_url}${path}`, window.location.href).toString();

    const { manifest, warnings } = exportManifest({
      entityId: String(entity._id),
      entityName: entity.name,
      modelUrl,
      settings: settings.localSettings,
      annotations,
    });
    warnings.forEach(warning => console.warn('[IIIF export]', warning));
    if (warnings.length) this.message.info(warnings.join('\n'));

    const fileName = `${entity.name.replace(/[^\w-]+/g, '_') || 'entity'}-iiif-manifest.json`;
    saveAs(
      new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/ld+json;charset=utf-8' }),
      fileName,
    );
  }
```

- [ ] **Step 2: Add the button**

In `annotations-editor.component.html`, insert directly after the closing `</k-button>` of the JSON export (inside `@if (count > 0) { … }`):

```html
      <k-button
        icon-button
        color="transparent"
        tooltip="Export as IIIF 4.0 manifest"
        (click)="exportIIIFManifest()"
        ><mat-icon>ios_share</mat-icon></k-button
      >
```

- [ ] **Step 3: Build**

Run: `bunx ng build --configuration development`
Expected: build succeeds

- [ ] **Step 4: Manual check**

Run `bun run start`. Open a Kompakkt object that has annotations and click the new button.

Expected:
- A `<Name>-iiif-manifest.json` download with `@context`, Scene, model, camera and comments.
- Load the file again through the IIIF import dialog (JSON option): model, view and comments appear in the same place. Note any differences; Task 7 captures them as a round-trip test.
- If annotation points are offset after re-import, Kompakkt probably uses a different reference frame for `referencePoint` than for the transformed model. In that case, investigate before Task 7 (systematic-debugging) and adjust the exporter or the builder.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.ts src/app/components/entity-feature-annotations/annotations-editor/annotations-editor.component.html
git commit -m "feat(iiif): add IIIF 4.0 manifest export button to annotations editor"
```

---

### Task 7: Round-trip tests, remove Manifesto, docs

**Files:**
- Test: `src/app/iiif/roundtrip.test.ts`
- Modify: `package.json` (remove the `@iiif/3d-manifesto-dev` dependency), `bun.lock`
- Modify: `README.md`

**Interfaces:**
- Consumes: `exportManifest`, `parseManifest`, `perspectiveFromCamera`, `commentToAnnotation`, `rotationToBabylon`, `pointToBabylon`; test helpers `makeInput`, `makeSettings` from `__fixtures__/export-input.ts`

- [ ] **Step 1: Write the round-trip test**

`src/app/iiif/roundtrip.test.ts`:

```ts
import { describe, expect, test } from 'bun:test';
import { commentToAnnotation, perspectiveFromCamera } from './comments';
import { pointToBabylon, rotationToBabylon } from './coordinates';
import { makeInput, makeSettings } from './__fixtures__/export-input';
import { exportManifest } from './exporter';
import { parseManifest } from './parser';

const closeTo = (actual: { x: number; y: number; z: number }, expected: { x: number; y: number; z: number }) => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
  expect(actual.z).toBeCloseTo(expected.z);
};

describe('round trip: exportManifest → parseManifest', () => {
  const settings = makeSettings({ scale: 2, rotation: { x: 10, y: 45, z: -30 }, translate: { x: 1, y: 2, z: 3 } });
  const input = makeInput({ settings });
  const model = parseManifest(JSON.parse(JSON.stringify(exportManifest(input).manifest)));

  test('model, transforms and background survive', () => {
    expect(model.label).toBe('Pawn');
    expect(model.models[0].url).toBe(input.modelUrl);
    expect(model.backgroundColor).toEqual({ r: 153, g: 204, b: 255 });
    const [scale, rotate, translate] = model.models[0].transforms;
    expect(scale).toEqual({ kind: 'scale', value: { x: 2, y: 2, z: 2 } });
    expect(rotationToBabylon(rotate.value)).toEqual({ x: 10, y: 45, z: -30 });
    expect(pointToBabylon(translate.value)).toEqual({ x: 1, y: 2, z: 3 });
  });

  test('initial camera survives', () => {
    const camera = model.cameras.find(c => !c.hidden)!;
    const perspective = perspectiveFromCamera(camera, { x: 0, y: 0, z: 0 })!;
    closeTo(perspective.position as any, settings.cameraPositionInitial.position);
    closeTo(perspective.target as any, settings.cameraPositionInitial.target);
  });

  test('comments survive with order, text, point and perspective', () => {
    const sorted = [...input.annotations].sort((a, b) => a.ranking - b.ranking);
    expect(model.comments).toHaveLength(sorted.length);

    model.comments.forEach((comment, index) => {
      const original = sorted[index];
      const camera = model.cameras.find(c => c.annotationId === comment.cameraAnnotationId)!;
      expect(camera.hidden).toBe(true);
      const perspective = perspectiveFromCamera(camera, comment.point)!;
      const annotation = commentToAnnotation(comment, index + 1, perspective, { x: 0, y: 1, z: 0 });

      expect(annotation.ranking).toBe(original.ranking);
      expect(annotation.body.content.title).toBe(original.body.content.title);
      expect(annotation.body.content.description).toBe(original.body.content.description);
      closeTo(annotation.target.selector.referencePoint as any, original.target.selector.referencePoint as any);
      closeTo(perspective.position as any, original.body.content.relatedPerspective.position as any);
      closeTo(perspective.target as any, original.body.content.relatedPerspective.target as any);
    });
  });
});
```

Note: The test helper `makeAnnotation` uses `alpha = 0.8`, which is in (-π, π]. An `alpha` outside that range would come back as an equivalent angle, but with a different number.

- [ ] **Step 2: Run the test**

Run: `bun test src/app/iiif`
Expected: PASS. If the round trip fails, there's a real bug in the exporter or the parser: fix it, don't loosen the expectation.

- [ ] **Step 3: Check that nothing uses Manifesto anymore**

Run: `grep -rn "3d-manifesto" src`
Expected: no matches

- [ ] **Step 4: Remove the dependency**

Run: `bun remove @iiif/3d-manifesto-dev`
Expected: `package.json` and `bun.lock` without `@iiif/3d-manifesto-dev`

- [ ] **Step 5: Build and tests**

Run: `bun test src/app/iiif && bunx ng build --configuration development`
Expected: PASS, build succeeds

- [ ] **Step 6: Extend the README**

Append a section to `README.md`:

````markdown
## IIIF Presentation API 4.0

Kompakkt can import 3D Scenes from IIIF 4.0 manifests (`?manifest=<URL>` or the import dialog) and
export objects with their annotations as IIIF 4.0 manifests (button in the annotations editor).

- Code: `src/app/iiif/` – the parser, the exporter and the coordinate conversion are Babylon-free and tested.
- Tests: `bun run test` (demo manifests are tested too when the submodule is initialized:
  `git submodule update --init demos/iiif-3d`)
- Kompakkt ↔ IIIF mapping: see `docs/superpowers/specs/2026-11-18-iiif-4-import-export-design.md`
- Dropped on export (no IIIF equivalent): the normal at the annotation point, the preview image, `validated`.
````

- [ ] **Step 7: Commit**

```bash
git add src/app/iiif/roundtrip.test.ts package.json bun.lock README.md
git commit -m "test(iiif): add export/import round trip; drop manifesto dependency; document IIIF support"
```
