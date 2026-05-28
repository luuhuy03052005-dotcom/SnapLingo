import { LoggingService } from '../logging/LoggingService';

interface CacheEntry<T> {
  value: T;
  sizeBytes: number;
}

/**
 * High-performance, memory-bounded Least Recently Used (LRU) cache.
 * Why: Optimizes translation lookup speeds and limits memory footprint to exactly 5MB/1000 items.
 */
export class MemoryLRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private currentSizeBytes = 0;

  constructor(
    private maxItems: number = 1000,
    private maxSizeBytes: number = 5 * 1024 * 1024 // Default: 5MB
  ) {}

  /**
   * Approximates the memory size in bytes of a string or JSON-serialized value.
   * Why: UTF-16 characters consume 2 bytes of memory in V8.
   */
  private calculateSize(key: string, value: T): number {
    const valString = typeof value === 'string' ? value : JSON.stringify(value);
    return (key.length + valString.length) * 2;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Refresh LRU order (delete and append to make it most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T): void {
    const newSize = this.calculateSize(key, value);

    // Evict old key if overriding
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSizeBytes -= existing.sizeBytes;
      this.cache.delete(key);
    }

    // Evict oldest items if exceeding bounds
    while (
      (this.cache.size >= this.maxItems || this.currentSizeBytes + newSize > this.maxSizeBytes) &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        const oldestEntry = this.cache.get(oldestKey);
        if (oldestEntry) {
          this.currentSizeBytes -= oldestEntry.sizeBytes;
        }
        this.cache.delete(oldestKey);
        LoggingService.debug(`[LRUCache] Evicted item: key=${oldestKey}`);
      }
    }

    // Insert new entry
    this.cache.set(key, { value, sizeBytes: newSize });
    this.currentSizeBytes += newSize;
  }

  clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
    LoggingService.info('[LRUCache] In-memory cache cleared.');
  }

  getStats() {
    return {
      size: this.cache.size,
      currentSizeBytes: this.currentSizeBytes,
      maxItems: this.maxItems,
      maxSizeBytes: this.maxSizeBytes
    };
  }
}
