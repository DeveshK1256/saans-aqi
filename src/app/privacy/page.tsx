import React from 'react';

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: 1.7 }}>
      <a href="/" style={{ color: '#0B735F', textDecoration: 'none', fontWeight: 600 }}>← Back to Saans</a>
      <h1 style={{ fontSize: '2.2rem', marginTop: 20 }}>Privacy Policy — Saans (सांस)</h1>
      <p style={{ color: '#595752' }}>Last updated: November 2026 · Compliant with India’s Digital Personal Data Protection (DPDP) Act 2023</p>

      <section style={{ marginTop: 24 }}>
        <h2>1. Data Minimization & Sensitivity</h2>
        <p>Saans collects the absolute minimum data required to calculate your household's air pollution exposure. We never ask for child names, government IDs, or raw medical history.</p>
        <ul>
          <li><strong>Location:</strong> Stored only as coarse ~1 km grid cells. Precise GPS coordinates are processed transiently in memory and never stored.</li>
          <li><strong>Health Flags:</strong> Asthmatic, pregnant, or elderly status is stored as boolean enum flags protected by field-level encryption (Cloud KMS envelope encryption).</li>
          <li><strong>Photos (Indoor Air Lab):</strong> Room photos are processed for ventilation features, stored in a private bucket with EXIF stripped, and automatically deleted within 24 hours.</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2. No Data Selling or Profiling</h2>
        <p>We do not monetize user data. We do not sell, rent, or trade your personal or exposure data to advertisers, insurance companies, or third-party data brokers.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3. Consent & Control</h2>
        <p>You maintain complete ownership of your data. At any time in Settings, you can:</p>
        <ul>
          <li><strong>Export your data:</strong> Download a full JSON export of your household profile and exposure logs.</li>
          <li><strong>Delete your account:</strong> Instantly wipe all household, member, and profile data from our databases.</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>4. Contact & Grievance Officer</h2>
        <p>Under the DPDP Act 2023, for any privacy inquiries or grievance redressal, contact our team at <code>privacy@saans.app</code>.</p>
      </section>
    </main>
  );
}
