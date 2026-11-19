import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GridCellCache } from '../../src/domain/air/cache';
import { AirReading } from '../../src/domain/air/types';

describe('GridCellCache & Request Coalescing Unit Tests', () => {
  let cache: GridCellCache;

  const mockReading: AirReading = {
    id: 'test-1',
    location: { lat: 28.61, lon: 77.21, gridCell: '28.61,77.21', name: 'Delhi Central' },
    pollutants: { pm25: 180, pm10: 270, no2: 50 },
    naqi: {
      overallAqi: 346,
      dominantPollutant: 'pm25',
      category: 'Very Poor',
      colorHex: '#CC0033',
      isPartial: false,
      subIndices: [],
    },
    confidence: {
      score: 0.88,
      tier: 'high',
      isUnsure: false,
      factors: { dataAgeScore: 1, distanceScore: 0.9, completenessScore: 0.8, providerAgreementScore: 1 },
      explanation: 'High confidence',
    },
    provenance: {
      source: 'cpcb',
      stationOrGrid: 'Mandir Marg Monitor',
      stationDistanceKm: 1.5,
      observedAt: new Date().toISOString(),
      ageMinutes: 20,
      freshness: 'live',
    },
  };

  beforeEach(() => {
    cache = new GridCellCache();
  });

  describe('Grid Cell Normalization (toGridCell)', () => {
    it('rounds coordinates to 2 decimal places (~1 km grid)', () => {
      expect(GridCellCache.toGridCell(28.6139, 77.2090)).toBe('28.61,77.21');
      expect(GridCellCache.toGridCell(18.5204, 73.8567)).toBe('18.52,73.86');
    });

    it('coalesces nearby coordinates (<500m) into identical grid cell keys', () => {
      const cell1 = GridCellCache.toGridCell(28.6101, 77.2102);
      const cell2 = GridCellCache.toGridCell(28.6149, 77.2148);
      expect(cell1).toBe('28.61,77.21');
      expect(cell2).toBe('28.61,77.21');
      expect(cell1).toBe(cell2);
    });

    it('handles negative latitudes and longitudes', () => {
      expect(GridCellCache.toGridCell(-33.8688, 151.2093)).toBe('-33.87,151.21');
    });
  });

  describe('Cache Hit / Miss & Statistics', () => {
    it('returns null on cache miss and records stats', () => {
      const result = cache.get('28.61,77.21');
      expect(result).toBeNull();

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
      expect(stats.hitRatio).toBe(0);
    });

    it('returns cached item on hit and updates hit ratio', () => {
      cache.set('28.61,77.21', mockReading);

      const result = cache.get('28.61,77.21');
      expect(result).toEqual(mockReading);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
      expect(stats.hitRatio).toBe(1.0);
      expect(stats.size).toBe(1);
    });
  });

  describe('TTL Expiration', () => {
    it('evicts expired item on get() when TTL is exceeded', () => {
      const shortTtlMs = 50;
      cache.set('28.61,77.21', mockReading, shortTtlMs);

      // Fast-forward time
      const realNow = Date.now;
      try {
        Date.now = () => realNow() + 100;
        const result = cache.get('28.61,77.21');
        expect(result).toBeNull();
        expect(cache.getStats().misses).toBe(1);
      } finally {
        Date.now = realNow;
      }
    });
  });

  describe('Request Coalescing (coalesce)', () => {
    it('coalesces multiple concurrent requests for the same cell to 1 fetcher execution', async () => {
      let callCount = 0;
      const delayedFetcher = vi.fn(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 20));
        return mockReading;
      });

      const [res1, res2, res3] = await Promise.all([
        cache.coalesce('28.61,77.21', delayedFetcher),
        cache.coalesce('28.61,77.21', delayedFetcher),
        cache.coalesce('28.61,77.21', delayedFetcher),
      ]);

      expect(callCount).toBe(1);
      expect(res1).toEqual(mockReading);
      expect(res2).toEqual(mockReading);
      expect(res3).toEqual(mockReading);

      // Subsequent call immediately served from cache without fetcher call
      const res4 = await cache.coalesce('28.61,77.21', delayedFetcher);
      expect(callCount).toBe(1);
      expect(res4).toEqual(mockReading);
    });

    it('cleans up in-flight promise if fetcher throws error', async () => {
      const failingFetcher = vi.fn(async () => {
        throw new Error('Upstream provider timeout');
      });

      await expect(cache.coalesce('28.61,77.21', failingFetcher)).rejects.toThrow('Upstream provider timeout');

      // Subsequent call should be allowed to retry instead of being stuck
      const succeedingFetcher = vi.fn(async () => mockReading);
      const res = await cache.coalesce('28.61,77.21', succeedingFetcher);
      expect(res).toEqual(mockReading);
      expect(succeedingFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cache Clear', () => {
    it('resets entries, in-flight promises, and metrics', () => {
      cache.set('28.61,77.21', mockReading);
      cache.get('28.61,77.21'); // 1 hit
      cache.get('99.99,99.99'); // 1 miss

      cache.clear();
      const stats = cache.getStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(cache.get('28.61,77.21')).toBeNull();
    });
  });
});
