# Data Sources, Licensing, and Fallback Strategy

This document details the air quality data providers, licensing conditions, rate limits, and multi-tier failover architecture for **Saans (सांस)**.

---

## 1. Provider Directory

| Provider | Role | Geographic Coverage | Resolution / Metrics | License / Terms | Rate Limit / Quota |
|---|---|---|---|---|---|
| **Google Air Quality API** | Primary (`GS-09`) | Global / India Pan-Country | Hourly real-time + 72h forecast, CPCB NAQI, heatmap raster tiles | Google Maps Platform Terms of Service | Tiered GCP quota; cached per grid-cell to minimize queries |
| **CPCB (Central Pollution Control Board)** | Secondary Station Source | National Air Monitoring Programme (NAMP / CAAQMS stations) | 15-minute / hourly station measurements for PM2.5, PM10, NO2, SO2, CO, O3 | Open Government Data (OGD) Platform India (data.gov.in) | Free API key required; rate-limited per minute |
| **OpenAQ v3** | Tertiary Station Source | Global open stations (including CPCB, US State Dept, DPCC) | Hourly historical and real-time station data | Open Data Commons Open Database License (ODbL) | 60 requests/min, 2,000 req/hr on free tier |
| **Open-Meteo Air Quality (CAMS)** | Quaternary Model Reanalysis | Global ECMWF Copernicus Atmosphere Monitoring Service (CAMS) | 11 km grid, global aerosol optical depth & surface particulates | Creative Commons Attribution 4.0 (CC BY 4.0) | Non-commercial free tier: 10,000 daily calls |

---

## 2. Priority & Failover Architecture

Air quality ingestion operates through a common TypeScript interface `AirProvider`:

```
Client / API Request (lat, lon)
               │
               ▼
   [ Grid-Cell Cache ] (Key: lat_2dec, lon_2dec; TTL: 30 min)
               │
      Cache Miss / Expired
               │
               ▼
     ┌───────────────────┐
     │  Priority 1:      │──▶ Success ──▶ Cache & Return
     │  Google Air API   │
     └───────────────────┘
               │ (Fails / Quota Exceeded / Latency > 2.5s)
               ▼
     ┌───────────────────┐
     │  Priority 2:      │──▶ Success ──▶ Cache & Return
     │  CPCB CAAQMS      │
     └───────────────────┘
               │ (Fails / Station Offline)
               ▼
     ┌───────────────────┐
     │  Priority 3:      │──▶ Success ──▶ Cache & Return
     │  OpenAQ v3        │
     └───────────────────┘
               │ (Fails / Rate Limited)
               ▼
     ┌───────────────────┐
     │  Priority 4:      │──▶ Success ──▶ Cache (Flagged 'model_reanalysis')
     │  Open-Meteo CAMS  │
     └───────────────────┘
               │
          All Failed
               ▼
    Return Last Cached Value (flagged 'very_stale', confidence: Low)
```

---

## 3. Data Freshness & Confidence Metrics

Every normalized `AirReading` payload exposes data provenance:
- `source`: Name of the provider that served the observation.
- `observed_at`: Exact ISO 8601 observation timestamp.
- `age_minutes`: Elapsed time since observation.
- `station_distance_km`: Distance to monitoring station (null for gridded models).
- `confidence_score`: Deterministic metric from 0.0 to 1.0.
  - **High (≥ 0.75):** Age ≤ 60 mins, distance ≤ 5 km, all key pollutants present.
  - **Medium (0.45 – 0.74):** Age 60–180 mins, or distance 5–15 km, or partial pollutants.
  - **Low (< 0.45):** Age > 180 mins, distance > 15 km, or single pollutant fallback. The UI explicitly displays **"I'm unsure"** and suppresses false-precision recommendations.
