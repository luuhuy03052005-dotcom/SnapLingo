/**
 * Lightweight serial job execution queue for Tesseract.
 * Why: Prevents concurrent OCR scans from exhausting RAM and system resources on the desktop.
 */
export class OCRQueue {
  private queue = Promise.resolve();

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          try {
            const res = await task();
            resolve(res);
          } catch (err) {
            reject(err);
          }
        })
        .catch((err) => {
          // Catch structural chain rejections to avoid locking the queue
          reject(err);
        });
    });
  }
}
