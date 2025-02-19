/// <reference lib="webworker" />

import { Copc, Getter, Hierarchy } from 'copc';
import { createGetter, createUrlGetter } from './copc-getter';

addEventListener('message', async event => {
  const { url, key, nodes } = event.data as {
    url: string;
    key: string;
    nodes: Hierarchy.Node.Map;
  };

  try {
    const getter: Getter = createUrlGetter(url, nodes[key]!);
    const copc = await Copc.create(getter);

    const node = nodes[key];
    if (!node) return;

    const view = await Copc.loadPointDataView(getter, copc, node);
    const getters = ['X', 'Y', 'Z', 'Red', 'Green', 'Blue', 'Intensity'].map(view.getter);
    const getXyzi = (index: number) => {
      return getters.map(get => get(index));
    };

    const colors: number[] = [];
    const positions: number[] = [];

    for (let i = 0; i < view.pointCount; i++) {
      const [x, y, z, r, g, b, intensity] = getXyzi(i);
      positions.push(x, y, z);
      colors.push(r / 65535, g / 65535, b / 65535, intensity !== undefined ? intensity / 65535 : 1);
    }

    postMessage({ key, positions, colors });
  } catch (e: any) {
    postMessage({
      error: true,
      key,
      message: e.toString(),
    });
  }
});
