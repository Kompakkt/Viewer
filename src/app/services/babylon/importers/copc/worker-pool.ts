import type { Hierarchy } from 'copc';
import WorkerPool, { BaseTask, TaskProcessor } from '../common/worker-pool';

export interface COPCTask extends BaseTask {
  url: string;
  nodes: Hierarchy.Node.Map;
}

class COPCTaskProcessor implements TaskProcessor<COPCTask> {
  async process(worker: Worker, task: COPCTask): Promise<void> {
    worker.postMessage(task);
  }
}

export function createCOPCWorkerPool(workers: Worker[]) {
  return new WorkerPool<COPCTask>(workers, new COPCTaskProcessor());
}

export type COPCWorkerPool = ReturnType<typeof createCOPCWorkerPool>;
