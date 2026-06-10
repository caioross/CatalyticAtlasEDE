import type { Metadata } from 'next';
import './globals.css';
import SiteLayout from '@/components/SiteLayout';

const SITE_URL = 'https://catalytic-atlas.vercel.app';
const SITE_NAME = 'Catalytic Atlas';
const DESCRIPTION =
  'An open, browser-native explorer for enzyme structure, catalytic mechanism, kinetics and molecular dynamics. Interactive 3D viewer, curated mechanisms, live kinetic simulator and client-side ANM analysis — no account, no server, no data leaves your browser.';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Enzyme Dynamics Explorer`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'enzyme', 'enzymology', 'catalysis', 'structural biology', 'protein dynamics',
    'ANM', 'Anisotropic Network Model', 'elastic network model', 'ENM',
    'molecular visualization', 'biochemistry', 'Michaelis-Menten', 'kinetics',
    'protein structure', 'PDB viewer', 'Mol*', 'allosteric', 'allostery',
    'normal modes', 'browser-native', 'educational', 'open science',
    'lysozyme', 'chymotrypsin', 'carbonic anhydrase', 'HIV protease', 'SARS-CoV-2 Mpro',
  ],
  authors: [{ name: 'Caio Ross', url: 'https://github.com/caioross' }],
  creator: 'Caio Ross',
  publisher: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${SITE_NAME} — Enzyme Dynamics Explorer`,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Enzyme Dynamics Explorer`,
    description: DESCRIPTION,
    creator: '@caioross',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'science',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': ['WebApplication', 'EducationalApplication'],
  name: SITE_NAME,
  description: DESCRIPTION,
  url: SITE_URL,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any (browser-native)',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  author: { '@type': 'Person', name: 'Caio Ross', url: 'https://github.com/caioross' },
  license: 'https://opensource.org/licenses/MIT',
  keywords: 'enzyme, structural biology, ANM, protein dynamics, molecular visualization',
  inLanguage: ['en', 'pt'],
  featureList: [
    'Interactive 3D protein structure viewer (Mol*)',
    'Step-by-step catalytic mechanism with 3D highlight',
    'Live Michaelis-Menten kinetic simulator (RK4)',
    'Browser-native Anisotropic Network Model (ANM)',
    'Dynamic cross-correlation matrix (DCCM)',
    'Allosteric pathway finder',
    'Mutation sandbox with ΔΔG estimation',
    '100% client-side — no data leaves the browser',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
