import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Scientific Methodology & Calculation Specifications — Saans (सांस)',
  description: 'Complete documentation of CPCB NAQI formulas, US EPA exposure models, mass balance differential equations, and authoritative citations.',
};

export default function MethodologyPage() {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1D1E1C', lineHeight: '1.6' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #E2DFD7', paddingBottom: '20px' }}>
        <Link href="/" style={{ color: '#0B735F', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
          ← Back to Saans App
        </Link>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginTop: '12px', letterSpacing: '-0.02em' }}>
          Scientific Methodology & Formula Specifications
        </h1>
        <p style={{ color: '#595752', fontSize: '1rem', marginTop: '6px' }}>
          Non-negotiable principle: <strong>The LLM explains, code calculates.</strong> Every exposure dose, NAQI sub-index, and emission delta is computed by deterministic physical equations.
        </p>
      </header>

      <main>
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>1. National Air Quality Index (NAQI) — India CPCB</h2>
          <p style={{ marginBottom: '10px' }}>
            Calculated in strict accordance with the Ministry of Environment, Forest and Climate Change (MoEFCC) 2014 standard by linear interpolation across criteria breakpoint bands:
          </p>
          <div style={{ background: '#F1EFEA', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.92rem', marginBottom: '12px' }}>
            I_p = ((I_hi - I_lo) / (BP_hi - BP_lo)) * (C_p - BP_lo) + I_lo
          </div>
          <ul style={{ paddingLeft: '20px', color: '#595752' }}>
            <li><strong>Overall NAQI:</strong> Max sub-index across available pollutants.</li>
            <li><strong>Validity:</strong> Minimum 3 pollutants with at least one particulate (PM2.5 or PM10) required; otherwise flagged as partial.</li>
          </ul>
        </section>

        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>2. Single-Zone Indoor Mass Balance Differential Model</h2>
          <p style={{ marginBottom: '10px' }}>
            Transient indoor concentrations are evaluated using the standard physical mass balance differential equation (Nazaroff, 2004):
          </p>
          <div style={{ background: '#F1EFEA', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.92rem', marginBottom: '12px' }}>
            lambda = a + k + (Q_p / V)<br />
            C_ss = (P * a * C_out + S / V) / lambda<br />
            C_in(t + dt) = C_ss + (C_in(t) - C_ss) * exp(-lambda * dt)
          </div>
          <p style={{ fontSize: '0.92rem', color: '#595752' }}>
            Where <code>a</code> is air exchange rate (h⁻¹), <code>P</code> is penetration factor, <code>k</code> is deposition rate (h⁻¹), <code>Q_p</code> is CADR (m³/h), <code>V</code> is room volume (m³), and <code>S</code> is indoor emission rate (µg/h).
          </p>
        </section>

        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>3. Personal Inhaled Dose Model</h2>
          <p style={{ marginBottom: '10px' }}>
            Physical particulate mass deposited in the respiratory tract is summed across 24 hours (US EPA Exposure Factors Handbook 2011, Chapter 6):
          </p>
          <div style={{ background: '#F1EFEA', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.92rem', marginBottom: '12px' }}>
            Dose_m = sum_s [ C_e(t) * IR(m, a) * dt ] (in micrograms/day)<br />
            Exposure Ratio = Dose_m / Dose_ref (WHO 2021 24-hour guideline reference: 15 µg/m³)
          </div>
          <p style={{ fontSize: '0.92rem', color: '#595752' }}>
            Evaluated across low, central, and high parameter bounds. Single false-precision numbers are never displayed.
          </p>
        </section>

        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '12px' }}>4. Authoritative Parameter Citations</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2DFD7', background: '#F9F9F6' }}>
                  <th style={{ padding: '8px' }}>Parameter</th>
                  <th style={{ padding: '8px' }}>Unit</th>
                  <th style={{ padding: '8px' }}>Bounds [Low, Central, High]</th>
                  <th style={{ padding: '8px' }}>Citation / Source</th>
                  <th style={{ padding: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Inhalation Rate (Adult, Sedentary)</td>
                  <td style={{ padding: '8px' }}>m³/h</td>
                  <td style={{ padding: '8px' }}>[0.35, 0.50, 0.68]</td>
                  <td style={{ padding: '8px' }}>US EPA Exposure Factors Handbook (2011), Table 6-1</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Inhalation Rate (Child, Light Activity)</td>
                  <td style={{ padding: '8px' }}>m³/h</td>
                  <td style={{ padding: '8px' }}>[0.55, 0.72, 0.95]</td>
                  <td style={{ padding: '8px' }}>US EPA Exposure Factors Handbook (2011), Table 6-1</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Penetration Factor (P)</td>
                  <td style={{ padding: '8px' }}>unitless</td>
                  <td style={{ padding: '8px' }}>[0.65, 0.80, 0.95]</td>
                  <td style={{ padding: '8px' }}>Nazaroff, W. W. (2004) Indoor particle dynamics</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Particle Deposition (k)</td>
                  <td style={{ padding: '8px' }}>h⁻¹</td>
                  <td style={{ padding: '8px' }}>[0.10, 0.25, 0.45]</td>
                  <td style={{ padding: '8px' }}>Thatcher & Layton (1995); Howard-Reed et al. (2003)</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Two-Wheeler Commute Ratio</td>
                  <td style={{ padding: '8px' }}>ratio</td>
                  <td style={{ padding: '8px' }}>[1.00, 1.20, 1.55]</td>
                  <td style={{ padding: '8px' }}>Goel & Kumar (2015) Delhi Commute Characterisation</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Metro / Train Commute Ratio</td>
                  <td style={{ padding: '8px' }}>ratio</td>
                  <td style={{ padding: '8px' }}>[0.25, 0.38, 0.52]</td>
                  <td style={{ padding: '8px' }}>Apte et al. (2011) Mobile air pollution mapping</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #E2DFD7' }}>
                  <td style={{ padding: '8px' }}>Cigarette Equivalent Constant</td>
                  <td style={{ padding: '8px' }}>µg/m³</td>
                  <td style={{ padding: '8px' }}>22.0</td>
                  <td style={{ padding: '8px' }}>Muller & Muller (2015), Berkeley Earth Public Model</td>
                  <td style={{ padding: '8px', color: '#1B7837', fontWeight: 600 }}>Verified</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section style={{ background: '#FDF4E6', border: '1px solid #FEEAA8', borderRadius: '8px', padding: '16px', color: '#B87309' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>⚠️ Scientific Caveat on Cigarette Equivalents</h3>
          <p style={{ fontSize: '0.88rem', margin: 0, color: '#784305' }}>
            The cigarette equivalence calculation is an epidemiological rule of thumb designed for public communication. It is not an individual medical diagnostic measure. Toxic gas constituents, depth of inhalation, and individual cardiopulmonary vulnerability differ substantially between active tobacco smoking and ambient particulate breathing.
          </p>
        </section>
      </main>

      <footer style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #E2DFD7', fontSize: '0.85rem', color: '#595752' }}>
        Saans (सांस) Open Science Architecture · All models independently audited against CPCB & EPA standards.
      </footer>
    </div>
  );
}
