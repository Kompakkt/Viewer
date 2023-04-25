/*
 * Initial Settings for:
 *  - KompakktLogo(Default)
 *  - Fallbackmodel
 *  - Audio
 *  - Video & Image
 *  - 3D model
 */

import { IEntitySettings } from '~common/interfaces';

// /assets/img/placeholder_transparent.svg
const preview =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwMCIgaGVpZ2h0PSIxMDAwIiB2aWV3Qm94PSIwIDAgMTYwMCAxMDAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNOTYwIDMyNEg2NDBDNjEzLjQ5IDMyNCA1OTIgMzQ1LjQ5IDU5MiAzNzJWNjI4QzU5MiA2NTQuNTEgNjEzLjQ5IDY3NiA2NDAgNjc2SDk2MEM5ODYuNTEgNjc2IDEwMDggNjU0LjUxIDEwMDggNjI4VjM3MkMxMDA4IDM0NS40OSA5ODYuNTEgMzI0IDk2MCAzMjRaIiBmaWxsPSJ3aGl0ZSIgZmlsbC1vcGFjaXR5PSIwLjEiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHBhdGggZD0iTTg4MCA0NTJDODk3LjY3MyA0NTIgOTEyIDQzNy42NzMgOTEyIDQyMEM5MTIgNDAyLjMyNyA4OTcuNjczIDM4OCA4ODAgMzg4Qzg2Mi4zMjcgMzg4IDg0OCA0MDIuMzI3IDg0OCA0MjBDODQ4IDQzNy42NzMgODYyLjMyNyA0NTIgODgwIDQ1MloiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNODQ4IDU3OS43OUw3NTcuMzQgNDg5LjNDNzUxLjU3MSA0ODMuNTMyIDc0My44MTcgNDgwLjE4NiA3MzUuNjYzIDQ3OS45NDRDNzI3LjUwOSA0NzkuNzAyIDcxOS41NyA0ODIuNTg0IDcxMy40NyA0ODhMNTkyIDU5Nk03NjggNjc2TDg5MS4zNCA1NTIuNjZDODk2Ljk4MSA1NDcuMDA4IDkwNC41MzEgNTQzLjY2OSA5MTIuNTA3IDU0My4yOTlDOTIwLjQ4NCA1NDIuOTI5IDkyOC4zMSA1NDUuNTU1IDkzNC40NSA1NTAuNjZMMTAwOCA2MTIiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMTYiIHN0cm9rZS1taXRlcmxpbWl0PSIyLjg1NTQ1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+Cg==';

export const minimalSettings: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: { x: 2, y: 2, z: 50 },
    target: { x: 0, y: 0, z: 0 },
  },
  lights: [],
  background: {
    color: {
      r: 127,
      g: 127,
      b: 127,
      a: 1,
    },
    effect: true,
  },
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
};

export const settingsFallback: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: {
      x: 1.8645935442740058,
      y: 1.472867350520726,
      z: 56.40527468534825,
    },
    target: {
      x: 10.988827228546143,
      y: 8.127124816179276,
      z: 7.5921266078948975,
    },
  },
  background: {
    color: {
      r: 183,
      g: 43,
      b: 86,
      a: 1,
    },
    effect: true,
  },
  lights: [
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: -1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: 1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'PointLight',
      position: {
        x: 0,
        y: 0,
        z: 0,
      },
      intensity: 1,
    },
  ],
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
};

export const settingsKompakktLogo: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: {
      x: 0.765,
      y: 0.8,
      z: 105,
    },
    target: {
      x: 15,
      y: 22,
      z: 15,
    },
  },
  background: {
    color: {
      r: 0,
      g: 158,
      b: 224,
      a: 1,
    },
    effect: false,
  },
  lights: [],
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
};

export const settings2D: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: {
      x: 0,
      y: (Math.PI / 180) * 90,
      z: 80,
    },
    target: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  background: {
    color: {
      r: 0,
      g: 158,
      b: 224,
      a: 1,
    },
    effect: true,
  },
  lights: [
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: -1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: 1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'PointLight',
      position: {
        x: -9,
        y: 8,
        z: 7,
      },
      intensity: 1,
    },
  ],
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
};

export const settingsEntity: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: {
      x: 0,
      y: 0,
      z: 0,
    },
    target: {
      x: 0,
      y: 0,
      z: 0,
    },
  },
  background: {
    color: {
      r: 35,
      g: 47,
      b: 51,
      a: 255,
    },
    effect: true,
  },
  lights: [
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: -1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: 1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'PointLight',
      position: {
        x: 1,
        y: 10,
        z: 1,
      },
      intensity: 1,
    },
  ],
  rotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  scale: 1,
};

export const settingsAudio: IEntitySettings = {
  preview,
  cameraPositionInitial: {
    position: {
      x: -(Math.PI / 2),
      y: Math.PI / 4,
      z: 33.086617341131806,
    },
    target: {
      x: 9.0677,
      y: 7.78202017618113,
      z: 5.68971512644238,
    },
  },
  background: {
    color: {
      r: 17,
      g: 17,
      b: 17,
      a: 0,
    },
    effect: false,
  },
  lights: [
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: -1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'HemisphericLight',
      position: {
        x: 0,
        y: 1,
        z: 0,
      },
      intensity: 1,
    },
    {
      type: 'PointLight',
      position: {
        x: -9,
        y: 8,
        z: 7,
      },
      intensity: 1,
    },
  ],
  rotation: {
    x: 315,
    y: 0,
    z: 0,
  },
  scale: 1,
};
