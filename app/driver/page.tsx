import type { Metadata, Viewport } from 'next';
import DriverConsole from './driver';

export const metadata: Metadata = {
  title: 'SLUSHD | Sürücü',
  description: 'Direksiyon başı görev konsolu. Telefon konumu kullanılmaz.',
  appleWebApp: { capable: true, title: 'SLUSHD Sürücü', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#F8FAFC',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function DriverPage() {
  return <DriverConsole />;
}
