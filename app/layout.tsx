import type { Metadata } from 'next';
import './globals.css';
import SiteLayout from '@/components/SiteLayout';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'Catalytic Atlas — Enzyme Dynamics Explorer',
  description:
    'An open, browser-native explorer for enzyme structure, catalytic mechanism, kinetics and dynamics. No account, no data leaves your browser.',
  metadataBase: new URL('https://catalytic-atlas.vercel.app'),
  openGraph: {
    title: 'Catalytic Atlas — Enzyme Dynamics Explorer',
    description:
      'Interactive 3D viewer, mechanism walk-throughs, kinetic data and client-side ENM/ANM analysis for classic enzymes.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <SiteLayout>{children}</SiteLayout>
        <Analytics />
      </body>
    </html>
  );
}
