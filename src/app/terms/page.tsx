import React from 'react';

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: 1.7 }}>
      <a href="/" style={{ color: '#0B735F', textDecoration: 'none', fontWeight: 600 }}>← Back to Saans</a>
      <h1 style={{ fontSize: '2.2rem', marginTop: 20 }}>Terms of Service — Saans (सांस)</h1>
      <p style={{ color: '#595752' }}>Effective: November 2026</p>

      <section style={{ marginTop: 24, padding: 16, background: '#FBECEB', borderLeft: '4px solid #BA2D1F', borderRadius: 6 }}>
        <h2 style={{ color: '#BA2D1F', marginTop: 0 }}>⚠️ Crucial Medical & Health Notice</h2>
        <p style={{ margin: 0 }}>
          <strong>Saans is NOT a medical device, diagnostic system, or doctor replacement.</strong> All exposure doses (µg/day) are modeled estimates based on outdoor air quality feeds and user-reported microenvironments. For any acute respiratory symptom (severe cough, wheezing, breathlessness, cyanosis), seek immediate emergency medical care (Call 112 / 108 in India).
        </p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>1. Service Scope</h2>
        <p>Saans provides environmental exposure estimation, ventilation planning heuristics, evidence-based myth busting, and open-source DIY purifier instructions for personal, non-commercial use.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. Community Action & Hotspots</h2>
        <p>Crowdsourced air pollution hotspot reports are moderated. Generated municipal complaint drafts are provided for human review and transmission; Saans never automatically files reports to government authorities on your behalf.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3. Governing Law</h2>
        <p>These terms are governed by the laws of India. Any disputes are subject to the jurisdiction of courts in New Delhi or Pune, India.</p>
      </section>
    </main>
  );
}
