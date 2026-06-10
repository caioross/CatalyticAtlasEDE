import { MetadataRoute } from 'next';
import { ENZYME_IDS } from '@/lib/enzymes';

const BASE = 'https://catalytic-atlas.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const enzymes: MetadataRoute.Sitemap = ENZYME_IDS.map((id) => ({
    url: `${BASE}/enzyme/${id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE}/workbench`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...enzymes,
  ];
}
