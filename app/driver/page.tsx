import type { Metadata, Viewport } from 'next';
import DriverConsole from './driver';

export const metadata: Metadata = {
  title: 'SLUSHD | Driver',
  description: 'In-cab task console. Phone location is not used.',
  appleWebApp: { capable: true, title: 'SLUSHD Driver', statusBarStyle: 'default' },
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
