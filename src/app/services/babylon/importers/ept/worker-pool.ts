import { EventEmitter } from '@angular/core';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';
import { decompress } from './laz-perf';
import { parseHeader } from './las-helper';
import { EPTWorkerMessageData } from './ept.worker';

type Task = {
  key: string;
  url: string;
};

class TaskQueue {
  private tasks: Task[] = [];

  addTask(task: Task) {
    let i = 0;
    while (i < this.tasks.length && this.tasks[i].key < task.key) {
      i++;
    }

    this.tasks.splice(i, 0, task);
  }

  getTask() {
    return this.tasks.shift();
  }

  size() {
    return this.tasks.length;
  }

  isEmpty() {
    return this.size() === 0;
  }
}

class WorkerPool {
  private workers: Worker[];
  private activeTasks: Map<Worker, Task>;
  private taskQueue: TaskQueue;

  public results$ = new EventEmitter<
    | {
        positions: number[];
        colors: number[];
        key: string;
        error: false;
      }
    | { error: true; message: string; key: string }
  >(true);
  public isBusy$ = new BehaviorSubject<boolean>(false);

  constructor(workers: Worker[]) {
    this.workers = [];
    this.taskQueue = new TaskQueue();
    this.activeTasks = new Map();

    for (const worker of workers) {
      worker.onmessage = this.handleWorkerMessage.bind(this, worker);
      worker.onerror = this.handleWorkerError.bind(this, worker);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent) {
    this.activeTasks.delete(worker);
    this.processNextTask();
    if (event.data.error) {
      console.error(event.data);
    }
    this.results$.next({ error: false, ...event.data });
  }

  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    console.error(error);
    this.activeTasks.delete(worker);
    this.processNextTask();
  }

  private async processNextTask() {
    if (this.taskQueue.isEmpty()) {
      this.isBusy$.next(false);
      return;
    }
    this.isBusy$.next(true);

    const availableWorker = this.workers.find(worker => !this.activeTasks.has(worker));
    if (!availableWorker) return;

    const task = this.taskQueue.getTask()!;
    try {
      this.activeTasks.set(availableWorker, task);

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

      availableWorker.postMessage(message, [
        message.decompressedColors,
        message.decompressedPositions,
      ]);
    } catch (e: any) {
      this.activeTasks.delete(availableWorker);
      console.error(e);
      this.results$.next({ error: true, message: e.toString(), key: task.key });
    }
  }

  public async addTask(task: Task) {
    this.taskQueue.addTask(task);
    this.processNextTask();

    return firstValueFrom(this.results$.pipe(filter(result => result.key === task.key)));
  }
}

export default WorkerPool;
