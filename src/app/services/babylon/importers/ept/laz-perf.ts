import { createLazPerf } from "laz-perf";

type Pointer = number;

declare class LASZip {
  constructor();
  delete(): void;

  open(data: Pointer, length: number): void;
  getPoint(dest: Pointer): void;
  getCount(): number;
  getPointLength(): number;
  getPointFormat(): number;
}

declare class ChunkDecoder {
  constructor();
  delete(): void;

  open(
    pointDataRecordFormat: number,
    pointDataRecordLength: number,
    pointer: Pointer,
  ): void;

  getPoint(pointer: Pointer): void;
}

declare interface LazPerf extends EmscriptenModule {
  LASZip: typeof LASZip;
  ChunkDecoder: typeof ChunkDecoder;
}

let instance: LazPerf | null = null;
export const getInstance = async () => {
  if (!instance) {
    instance = await createLazPerf();
  }
  return instance;
};

export const decompress = async (arrayBuffer: ArrayBuffer) => {
  const buffer = new Uint8Array(arrayBuffer);

  const lazPerf = await getInstance();
  const lasZip = new lazPerf.LASZip();

  const bufferPtr = lazPerf._malloc(buffer.byteLength);

  lazPerf.HEAPU8.set(
    new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    bufferPtr,
  );

  lasZip.open(bufferPtr, buffer.byteLength);

  const pointCount = lasZip.getCount();
  const pointDataRecordLength = lasZip.getPointLength();
  const pointFormat = lasZip.getPointFormat();
  const dataPtr = lazPerf._malloc(pointDataRecordLength);

  const positions = new Int32Array(pointCount * 3);
  const colors = new Uint16Array(pointCount * 4);

  const pointBuffer = new Uint8Array(pointDataRecordLength);
  const view = new DataView(pointBuffer.buffer);

  for (let i = 0; i < pointCount; i++) {
    lasZip.getPoint(dataPtr);
    pointBuffer.set(
      new Uint8Array(lazPerf.HEAP8.buffer, dataPtr, pointDataRecordLength),
    );

    positions[i * 3 + 0] = view.getInt32(0, true);
    positions[i * 3 + 1] = view.getInt32(4, true);
    positions[i * 3 + 2] = view.getInt32(8, true);

    switch (pointFormat) {
      case 0: // Base format: X,Y,Z,Intensity,Return,etc. (no RGB)
        colors[i * 4 + 0] = 65535; // Default white
        colors[i * 4 + 1] = 65535;
        colors[i * 4 + 2] = 65535;
        colors[i * 4 + 3] = 65535;
        break;

      case 1: // Format 1: GPS Time
        colors[i * 4 + 0] = 65535;
        colors[i * 4 + 1] = 65535;
        colors[i * 4 + 2] = 65535;
        colors[i * 4 + 3] = 65535;
        break;

      case 2: // Format 2: RGB
        colors[i * 4 + 0] = view.getUint16(20, true);
        colors[i * 4 + 1] = view.getUint16(22, true);
        colors[i * 4 + 2] = view.getUint16(24, true);
        colors[i * 4 + 3] = 65535;
        break;

      case 3: // Format 3: RGB + GPS Time
        colors[i * 4 + 0] = view.getUint16(28, true);
        colors[i * 4 + 1] = view.getUint16(30, true);
        colors[i * 4 + 2] = view.getUint16(32, true);
        colors[i * 4 + 3] = 65535;
        break;

      case 6: // Format 6: RGB + GPS Time + Wave Packets
      case 7: // Format 7: RGB + GPS Time + Wave Packets
        colors[i * 4 + 0] = view.getUint16(30, true);
        colors[i * 4 + 1] = view.getUint16(32, true);
        colors[i * 4 + 2] = view.getUint16(34, true);
        colors[i * 4 + 3] = 65535;
        break;

      default: // For unsupported formats, default to white
        colors[i * 4 + 0] = 65535;
        colors[i * 4 + 1] = 65535;
        colors[i * 4 + 2] = 65535;
        colors[i * 4 + 3] = 65535;
    }
  }

  lazPerf._free(dataPtr);
  lazPerf._free(bufferPtr);
  lasZip.delete();

  const positionsAb = new ArrayBuffer(positions.length * 4);
  const colorsAb = new ArrayBuffer(colors.length * 2);
  new Int32Array(positionsAb).set(positions);
  new Uint16Array(colorsAb).set(colors);

  return {
    positions,
    colors,
  };
};
