/** Bound cleanup without leaving a timer (or a late rejection) behind. */
export async function withDeadline<T>(work: Promise<T>, milliseconds: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(message)), milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

/** Close and Cmd+Q share one cleanup; a failed save leaves the window retryable. */
export class ShutdownCoordinator {
  private pending?: Promise<void>;
  finished = false;
  constructor(private readonly prepare: () => Promise<void>, private readonly finish: () => void, private readonly report: (error: unknown) => void) {}
  request() {
    if (this.finished) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = Promise.resolve().then(this.prepare).then(() => {
      this.finished = true;
      this.finish();
    }).catch(this.report).finally(() => { this.pending = undefined; });
    return this.pending;
  }
}
