import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SLUSHD Sürücü',
    short_name: 'SLUSHD',
    description: 'Direksiyon başı görev konsolu. Telefon konumu kullanılmaz.',
    start_url: '/driver',
    scope: '/driver',
    display: 'standalone',
    background_color: '#F8FAFC',
    theme_color: '#F8FAFC',
    lang: 'tr',
    icons: [{ src: '/driver-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
