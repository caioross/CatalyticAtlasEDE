import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: 'https://catalytic-atlas.vercel.app/sitemap.xml',
    host: 'https://catalytic-atlas.vercel.app',
  };
}
