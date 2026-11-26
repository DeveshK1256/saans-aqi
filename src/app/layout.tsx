import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Saans (सांस) — Evidence-Based Air Quality & Exposure Toolkit',
  description: 'Your family’s personal air shield. Calculate personal PM2.5 dose, find optimal ventilation windows, and build low-cost DIY air purifiers.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ fontFamily: "'Outfit', sans-serif", margin: 0, background: '#F9F9F6', color: '#1D1E1C' }}>
        {children}
      </body>
    </html>
  );
}
