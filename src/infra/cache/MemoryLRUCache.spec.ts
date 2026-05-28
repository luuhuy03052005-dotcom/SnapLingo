import { describe, it, expect } from 'vitest';
import { MemoryLRUCache } from './MemoryLRUCache';

describe('MemoryLRUCache Unit Tests', () => {
  it('should store and retrieve values correctly', () => {
    const cache = new MemoryLRUCache<string>(5);
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should evict items when exceeding maximum count', () => {
    const cache = new MemoryLRUCache<string>(3);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');
    
    // Refresh k1
    cache.get('k1');

    // Insert k4, which should evict k2 (as k1 was refreshed and k3 is newer)
    cache.set('k4', 'v4');

    expect(cache.get('k1')).toBe('v1');
    expect(cache.get('k2')).toBeNull();
    expect(cache.get('k3')).toBe('v3');
    expect(cache.get('k4')).toBe('v4');
  });

  it('should evict items when exceeding memory size limits', () => {
    // 1 char = 2 bytes. Key + Value sizing
    // Sizing: key (2 chars) + val (2 chars) = 4 chars * 2 = 8 bytes.
    // Set memory limit to 20 bytes (fits max 2 entries of 8 bytes)
    const cache = new MemoryLRUCache<string>(100, 20);

    cache.set('aa', 'bb'); // 8 bytes
    cache.set('cc', 'dd'); // 8 bytes

    // Adding third item should trigger memory eviction
    cache.set('ee', 'ff'); // 8 bytes

    expect(cache.get('aa')).toBeNull(); // evicted
    expect(cache.get('cc')).toBe('dd');
    expect(cache.get('ee')).toBe('ff');
  });
});
