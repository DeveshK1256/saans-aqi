import { describe, it, expect } from 'vitest';
import { AirService } from '../../src/domain/air/air-service';
import { AirProvider, AirReading } from '../../src/domain/air/types';
import { computeNaqi } from '../../src/domain/air/naqi';
import { assessConfidence } from '../../src/domain/air/confidence';
import { airCache } from '../../src/domain/air/cache';

class MockProvider implements AirProvider {
  constructor(
    public readonly name: string,
    public readonly priority: number,
    private shouldFail: boolean = false
  ) {}

  public setFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }

  async getCurrent(lat: number, lon: number): Promise<AirReading> {
    if (this.shouldFail) {
      throw new Error(`Provider ${this.name} failure`);
    }

    const pollutants = { pm25: 140, pm10: 220, no2: 50 };
    return {
      id: `${this.name}-reading`,
      location: { lat, lon, gridCell: `${lat.toFixed(2)},${lon.toFixed(2)}` },
      pollutants,
      naqi: computeNaqi(pollutants),
      confidence: assessConfidence({ ageMinutes: 10, pollutants }),
      provenance: {
        source: this.name as any,
        stationOrGrid: `${this.name} Station`,
        observedAt: new Date().toISOString(),
        ageMinutes: 10,
        freshness: 'live',
      },
    };
  }
}

describe('Air Service Multi-Tier Provider Failover', () => {
  it('Uses Primary provider when available', async () => {
    airCache.clear();
    const primary = new MockProvider('google_air_quality', 1, false);
    const secondary = new MockProvider('cpcb', 2, false);
    const tertiary = new MockProvider('open_meteo_cams', 3, false);

    const service = new AirService([primary, secondary, tertiary]);
    const reading = await service.getAirNow(28.61, 77.21);

    expect(reading.provenance.source).toBe('google_air_quality');
  });

  it('Fails over to Secondary when Primary is killed/offline', async () => {
    airCache.clear();
    const primary = new MockProvider('google_air_quality', 1, true); // Primary DEAD
    const secondary = new MockProvider('cpcb', 2, false); // Secondary OK
    const tertiary = new MockProvider('open_meteo_cams', 3, false);

    const service = new AirService([primary, secondary, tertiary]);
    const reading = await service.getAirNow(28.61, 77.21);

    expect(reading.provenance.source).toBe('cpcb');
  });

  it('Fails over to Tertiary when both Primary and Secondary are killed', async () => {
    airCache.clear();
    const primary = new MockProvider('google_air_quality', 1, true);
    const secondary = new MockProvider('cpcb', 2, true);
    const tertiary = new MockProvider('open_meteo_cams', 3, false); // Tertiary OK

    const service = new AirService([primary, secondary, tertiary]);
    const reading = await service.getAirNow(28.61, 77.21);

    expect(reading.provenance.source).toBe('open_meteo_cams');
  });

  it('Degrades gracefully to cached fallback with isUnsure = true when all providers die', async () => {
    airCache.clear();
    const primary = new MockProvider('google_air_quality', 1, false);
    const service = new AirService([primary]);

    // 1. Initial healthy fetch populates lastKnownReadings
    const firstReading = await service.getAirNow(28.61, 77.21);
    expect(firstReading.confidence.isUnsure).toBe(false);

    // Expire cache manually to force fresh provider call
    airCache.clear();

    // 2. Kill all providers
    primary.setFail(true);

    // 3. Service returns degraded historical reading with low confidence & isUnsure = true
    const fallbackReading = await service.getAirNow(28.61, 77.21);
    expect(fallbackReading.provenance.source).toBe('cached_fallback');
    expect(fallbackReading.confidence.isUnsure).toBe(true);
    expect(fallbackReading.confidence.tier).toBe('low');
  });
});
