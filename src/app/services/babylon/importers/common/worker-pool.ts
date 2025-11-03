import { EventEmitter } from '@angular/core';
import { BehaviorSubject, filter, firstValueFrom } from 'rxjs';

export interface BaseTask {
  key: string;
}

export interface BaseResult {
  key: string;
  error: boolean;
}

export interface SuccessResult extends BaseResult {
  error: false;
  positions: number[];
  colors: number[];
}

export interface ErrorResult extends BaseResult {
  error: true;
  message: string;
}

export type WorkerResult = SuccessResult | ErrorResult;

class TaskQueue<T extends BaseTask> {
  private tasks: T[] = [];

  addTask(task: T) {
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

export interface TaskProcessor<T extends BaseTask> {
  process(worker: Worker, task: T): Promise<void>;
}

class WorkerPool<T extends BaseTask> {
  private workers: Worker[];
  private activeTasks: Map<Worker, T>;
  private taskQueue: TaskQueue<T>;
  private taskProcessor: TaskProcessor<T>;

  public results$ = new EventEmitter<WorkerResult>(true);
  public isBusy$ = new BehaviorSubject<boolean>(false);

  constructor(workers: Worker[], taskProcessor: TaskProcessor<T>) {
    this.workers = [];
    this.taskQueue = new TaskQueue<T>();
    this.activeTasks = new Map();
    this.taskProcessor = taskProcessor;

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
    const task = this.activeTasks.get(worker);
    console.error(error);
    this.activeTasks.delete(worker);
    this.processNextTask();

    if (task) {
      this.results$.next({
        error: true,
        message: error.message,
        key: task.key,
      });
    }
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
      await this.taskProcessor.process(availableWorker, task);
    } catch (e: any) {
      this.activeTasks.delete(availableWorker);
      console.error(e);
      this.results$.next({ error: true, message: e.toString(), key: task.key });
      this.processNextTask(); // Try to process next task after error
    }
  }

  public addTask(task: T) {
    this.taskQueue.addTask(task);
    this.processNextTask();

    return firstValueFrom(this.results$.pipe(filter(result => result.key === task.key)));
  }

  public destroy() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.activeTasks.clear();
    this.taskQueue = new TaskQueue<T>();
  }
}

export default WorkerPool;
