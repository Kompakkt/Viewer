import { EventEmitter } from "@angular/core";
import type { Mesh } from "@babylonjs/core";
import type { Hierarchy } from "copc";
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  first,
  firstValueFrom,
  ReplaySubject,
} from "rxjs";

type Task = {
  key: string;
  url: string;
  nodes: Hierarchy.Node.Map;
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
    const task = this.activeTasks.get(worker);
    this.activeTasks.delete(worker);
    this.processNextTask();
    this.results$.next({ error: false, ...event.data });
  }

  private handleWorkerError(worker: Worker, error: ErrorEvent) {
    const task = this.activeTasks.get(worker);
    console.error(error);
    this.activeTasks.delete(worker);
    this.processNextTask();
  }

  private processNextTask() {
    if (this.taskQueue.isEmpty()) {
      this.isBusy$.next(false);
      return;
    }
    this.isBusy$.next(true);

    const availableWorker = this.workers.find(
      (worker) => !this.activeTasks.has(worker),
    );
    if (!availableWorker) return;

    const task = this.taskQueue.getTask()!;
    try {
      this.activeTasks.set(availableWorker, task);
      availableWorker.postMessage(task);
    } catch (e: any) {
      this.results$.next({ error: true, message: e.toString(), key: task.key });
    }
  }

  public addTask(key: string, url: string, nodes: Hierarchy.Node.Map) {
    const task: Task = { key, url, nodes };
    this.taskQueue.addTask(task);
    this.processNextTask();

    return firstValueFrom(
      this.results$.pipe(filter((result) => result.key === task.key)),
    );
  }
}

export default WorkerPool;
