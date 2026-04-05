interface Task {
  id: string;
  priority: number;
  execute: () => void;
  estimatedMs: number;
}

export class FrameBudgetTaskQueue {
  private queue: Task[] = [];
  private readonly budgetMs: number;
  private readonly maxTasksPerFrame: number;

  constructor(budgetMs: number = 4, maxTasksPerFrame: number = 3) {
    this.budgetMs = budgetMs;
    this.maxTasksPerFrame = maxTasksPerFrame;
  }

  enqueue(task: Task): void {
    this.queue.push(task);
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  processFrame(): number {
    if (this.queue.length === 0) return 0;

    const frameStart = performance.now();
    let processed = 0;

    while (this.queue.length > 0) {
      if (processed >= this.maxTasksPerFrame) break;

      const elapsed = performance.now() - frameStart;
      if (elapsed >= this.budgetMs) break;

      const nextTask = this.queue[0];
      if (elapsed + nextTask.estimatedMs > this.budgetMs && elapsed > 0) break;

      const task = this.queue.shift()!;
      try {
        const taskStart = performance.now();
        task.execute();
        const taskTime = performance.now() - taskStart;

        if (taskTime > task.estimatedMs * 2) {
          console.warn(
            `Task "${task.id}" estimated ${task.estimatedMs}ms, took ${taskTime.toFixed(1)}ms`,
          );
        }
        processed++;
      } catch (e) {
        console.error(`Task "${task.id}" failed:`, e);
      }
    }

    return processed;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  clear(): void {
    this.queue = [];
  }
}
