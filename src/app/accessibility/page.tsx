import React from 'react';

export default function AccessibilityPage() {
  return (
    <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', lineHeight: 1.7 }}>
      <a href="/" style={{ color: '#0B735F', textDecoration: 'none', fontWeight: 600 }}>← Back to Saans</a>
      <h1 style={{ fontSize: '2.2rem', marginTop: 20 }}>Accessibility Statement — Saans (सांस)</h1>
      <p style={{ color: '#595752' }}>Target: WCAG 2.2 Level AA Conformance</p>

      <section style={{ marginTop: 24 }}>
        <h2>Our Commitment</h2>
        <p>Air quality information is a public health necessity. Saans is committed to ensuring digital accessibility for people of all abilities, including users with visual, auditory, motor, or cognitive disabilities, elderly citizens, and low-literacy communities.</p>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Implemented Accessibility Measures</h2>
        <ul>
          <li><strong>Never Color-Alone:</strong> AQI danger levels are accompanied by high-contrast text labels, numerical values, and iconography so color-blind users can interpret risk accurately.</li>
          <li><strong>Screen Reader Support:</strong> Sliders and live data updates use ARIA live regions (<code>aria-live="polite"</code>) and accessible labels.</li>
          <li><strong>Keyboard Navigation:</strong> All interactive controls, tabs, and toggles have visible focus indicators (<code>:focus-visible</code>) and 44px+ minimum touch targets.</li>
          <li><strong>Multilingual Typography:</strong> High-legibility Devanagari fonts (Noto Sans Devanagari) paired with Outfit ensure crisp rendering at all zoom levels (supports 200%+ zoom without text truncation).</li>
          <li><strong>Reduced Motion:</strong> Fully respects <code>prefers-reduced-motion</code> operating system settings by disabling non-essential transitions.</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Feedback</h2>
        <p>If you encounter any accessibility barrier or have suggestions for improvement, please contact us at <code>accessibility@saans.app</code>.</p>
      </section>
    </main>
  );
}
