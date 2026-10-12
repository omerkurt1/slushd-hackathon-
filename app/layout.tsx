import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Operations center',
  description: 'Logistics operations console for fleet tracking and task assignment.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
