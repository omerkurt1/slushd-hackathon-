import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Operasyon Merkezi',
  description: 'Filo takibi ve görev atama için lojistik operasyon konsolu.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}
