// AI response caching utility for the AI Assistant
// Reduces API calls for frequently requested data

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class AICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private cacheDuration: number;

  constructor(durationMs: number = DEFAULT_CACHE_DURATION) {
    this.cacheDuration = durationMs;
  }

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > this.cacheDuration;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cache data with current timestamp
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set pattern - returns cached value or fetches and caches new value
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data);
    return data;
  }
}

// Export a singleton instance for the AI Assistant
export const aiCache = new AICache(DEFAULT_CACHE_DURATION);

// Common cache key generators
export const cacheKeys = {
  dashboardStats: (userId: string, period?: string) => 
    `stats-${userId}-${period || 'month'}`,
  contacts: (userId: string, query?: string) => 
    `contacts-${userId}-${query || 'all'}`,
  sessions: (userId: string, status?: string) => 
    `sessions-${userId}-${status || 'all'}`,
  factures: (userId: string, status?: string) => 
    `factures-${userId}-${status || 'all'}`,
};
