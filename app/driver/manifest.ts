import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SLUSHD Driver',
    short_name: 'SLUSHD',
    description: 'In-cab task console. Phone location is not used.',
    start_url: '/driver',
    scope: '/driver',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#F8FAFC',
    lang: 'en',
    icons: [{ src: '/driver-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
