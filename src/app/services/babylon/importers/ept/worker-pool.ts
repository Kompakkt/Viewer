import WorkerPool, { BaseTask, TaskProcessor } from '../common/worker-pool';
import { decompress } from './laz-perf';
import { parseHeader } from './las-helper';
import { EPTWorkerMessageData } from './ept.worker';

export interface EPTTask extends BaseTask {
  url: string;
}

class EPTTaskProcessor implements TaskProcessor<EPTTask> {
  async process(worker: Worker, task: EPTTask): Promise<void> {
    const url = `${task.url}ept-data/${task.key}.laz`;
    const arrayBuffer = await fetch(url).then(res => res.arrayBuffer());
    const decompressed = await decompress(arrayBuffer);
    const header = parseHeader(arrayBuffer);

    const message = {
      key: task.key,
      header,
      decompressedColors: decompressed.colors.buffer.slice(0) as ArrayBuffer,
      decompressedPositions: decompressed.positions.buffer.slice(0) as ArrayBuffer,
    } satisfies EPTWorkerMessageData;

    worker.postMessage(message, [message.decompressedColors, message.decompressedPositions]);
  }
}

export function createEPTWorkerPool(workers: Worker[]) {
  return new WorkerPool<EPTTask>(workers, new EPTTaskProcessor());
}

export type EPTWorkerPool = ReturnType<typeof createEPTWorkerPool>;
