import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Catalytic Atlas — Enzyme Dynamics Explorer',
    short_name: 'Catalytic Atlas',
    description:
      'An open, browser-native explorer for enzyme structure, catalytic mechanism, kinetics and molecular dynamics.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0c12',
    theme_color: '#0a0c12',
    categories: ['education', 'science', 'productivity'],
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
