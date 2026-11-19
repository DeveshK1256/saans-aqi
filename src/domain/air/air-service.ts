/**
 * Saans Unified Air Data Service & Failover Coordinator
 * Coordinates providers, enforces priority failover, and handles grid-cell caching.
 */

import { AirProvider, AirReading } from './types';
import { airCache, GridCellCache } from './cache';
import { GoogleAirQualityProvider } from './providers/google-air-provider';
import { CpcbAirProvider } from './providers/cpcb-provider';
import { OpenMeteoAirProvider } from './providers/open-meteo-provider';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';

export class AirService {
  private providers: AirProvider[];
  private lastKnownReadings = new Map<string, AirReading>();

  constructor(providers?: AirProvider[]) {
    this.providers = providers || [
      new GoogleAirQualityProvider(),
      new CpcbAirProvider(),
      new OpenMeteoAirProvider(),
    ];
    // Sort ascending by priority (1 = highest preference)
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  public setProviders(providers: AirProvider[]): void {
    this.providers = [...providers].sort((a, b) => a.priority - b.priority);
  }

  /**
   * Fetches air reading for a location with automatic coalescing and fallback chain.
   */
  async getAirNow(lat: number, lon: number): Promise<AirReading> {
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw AppError.badRequest(`Invalid geographic coordinates: ${lat}, ${lon}`);
    }

    const gridCell = GridCellCache.toGridCell(lat, lon);

    return airCache.coalesce(gridCell, async () => {
      let lastError: Error | null = null;

      // Walk provider priority chain
      for (const provider of this.providers) {
        try {
          const available = await provider.isAvailable();
          if (!available) continue;

          const reading = await provider.getCurrent(lat, lon);
          this.lastKnownReadings.set(gridCell, reading);
          logger.info(`Air reading resolved from provider: ${provider.name}`, { gridCell, source: provider.name });
          return reading;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          logger.warn(`Provider ${provider.name} failed for ${gridCell}, attempting failover`, { error: lastError.message });
        }
      }

      // If all providers failed, check for last known historical reading
      const lastKnown = this.lastKnownReadings.get(gridCell);
      if (lastKnown) {
        logger.warn(`All providers failed for ${gridCell}. Returning degraded last-known reading.`);
        return {
          ...lastKnown,
          confidence: {
            ...lastKnown.confidence,
            score: 0.35,
            tier: 'low',
            isUnsure: true,
            explanation: "I'm unsure: Real-time providers are unreachable. Showing cached historical estimate.",
          },
          provenance: {
            ...lastKnown.provenance,
            source: 'cached_fallback',
            freshness: 'very_stale',
          },
        };
      }

      throw AppError.providerUnavailable('All air quality data providers are unreachable.');
    });
  }
}

export const airService = new AirService();
