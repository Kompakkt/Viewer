/// <reference lib="webworker" />

import { type LASHeader } from './las-helper';

export type EPTWorkerMessageData = {
  key: string;
  decompressedPositions: ArrayBuffer;
  decompressedColors: ArrayBuffer;
  header: LASHeader;
};

addEventListener('message', async event => {
  try {
    const { key, decompressedColors, decompressedPositions, header } =
      event.data as EPTWorkerMessageData;

    const dC = new Uint16Array(decompressedColors);
    const dP = new Int32Array(decompressedPositions);

    const { numberOfPointRecords: pointCount } = header;

    const { scaleFactorX, scaleFactorY, scaleFactorZ, offsetX, offsetY, offsetZ } = header;

    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < pointCount; i++) {
      positions.push(
        dP[i * 3 + 0] * scaleFactorX + offsetX,
        dP[i * 3 + 1] * scaleFactorY + offsetY,
        dP[i * 3 + 2] * scaleFactorZ + offsetZ,
      );
      colors.push(
        dC[i * 4 + 0] / 65_535,
        dC[i * 4 + 1] / 65_535,
        dC[i * 4 + 2] / 65_535,
        dC[i * 4 + 3] / 65_535,
      );
    }

    postMessage({ key, positions, colors, error: false });
  } catch (e: unknown) {
    if (e instanceof Error) {
      postMessage({ error: true, message: e.toString(), stack: e.stack });
    } else {
      postMessage({ error: true, message: 'Unknown error' });
    }
  }
});
