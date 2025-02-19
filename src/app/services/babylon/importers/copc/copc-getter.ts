import type { Copc, Getter, Hierarchy } from "copc";

export const createGetter =
  (arrayBuffer: ArrayBuffer): Getter =>
  (begin: number, end: number) => {
    return new Promise((resolve) => {
      resolve(new Uint8Array(arrayBuffer.slice(begin, end)));
    });
  };

const metadataBufferCache = new Map<string, ArrayBuffer>();
export const createUrlGetter =
  (url: string, node: Hierarchy.Node) => (begin: number, end: number) => {
    return new Promise<Uint8Array>(async (resolve) => {
      const key = `${url}`;
      if (begin === 0) {
        const cachedBuffer = metadataBufferCache.get(key);
        if (cachedBuffer) {
          resolve(new Uint8Array(cachedBuffer));
          return;
        }
      }

      const buffer = await fetch(url, {
        headers: {
          Range: `bytes=${begin}-${end}`,
        },
      }).then((res) => res.arrayBuffer());

      if (begin === 0) {
        metadataBufferCache.set(key, buffer);
      }

      resolve(new Uint8Array(buffer));
    });
  };
