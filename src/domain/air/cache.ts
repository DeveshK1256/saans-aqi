/**
 * Saans Grid-Cell Air Quality Cache & Request Coalescing Layer
 * Implements Part 4.4 of docs/00_MASTER_SPEC.md.
 *
 * Requirements:
 * - Grid cells rounded to ~1 km (2 decimal places)
 * - TTL: 30 minutes for current readings, 3 hours for forecasts
 * - Request coalescing (deduplicating concurrent in-flight requests for the same cell)
 * - In-memory LRU with stats tracking for EFF-05
 */

import { AirReading } from './types';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  cachedAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
}

export class GridCellCache {
  private currentMap = new Map<string, CacheEntry<AirReading>>();
  private inFlightCurrent = new Map<string, Promise<AirReading>>();

  private hits = 0;
  private misses = 0;

  public static readonly CURRENT_TTL_MS = 30 * 60 * 1000; // 30 mins
  public static readonly FORECAST_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

  /**
   * Generates a ~1 km grid cell key by rounding coordinates to 2 decimal places.
   * At the equator, 0.01° ≈ 1.11 km. In Delhi/Pune (28°N / 18°N), 0.01° ≈ 0.98 km.
   */
  public static toGridCell(lat: number, lon: number): string {
    const rLat = (Math.round(lat * 100) / 100).toFixed(2);
    const rLon = (Math.round(lon * 100) / 100).toFixed(2);
    return `${rLat},${rLon}`;
  }

  public get(gridCell: string): AirReading | null {
    const entry = this.currentMap.get(gridCell);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.currentMap.delete(gridCell);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  public set(gridCell: string, data: AirReading, ttlMs: number = GridCellCache.CURRENT_TTL_MS): void {
    const now = Date.now();
    this.currentMap.set(gridCell, {
      data,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  /**
   * Request coalescing: Ensures simultaneous calls for the same grid cell share a single in-flight fetch.
   */
  public async coalesce(gridCell: string, fetcher: () => Promise<AirReading>): Promise<AirReading> {
    const cached = this.get(gridCell);
    if (cached) {
      return cached;
    }

    const inFlight = this.inFlightCurrent.get(gridCell);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const result = await fetcher();
        this.set(gridCell, result);
        return result;
      } finally {
        this.inFlightCurrent.delete(gridCell);
      }
    })();

    this.inFlightCurrent.set(gridCell, promise);
    return promise;
  }

  public getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRatio: total > 0 ? Math.round((this.hits / total) * 100) / 100 : 0,
      size: this.currentMap.size,
    };
  }

  public clear(): void {
    this.currentMap.clear();
    this.inFlightCurrent.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Global cache instance
export const airCache = new GridCellCache();
