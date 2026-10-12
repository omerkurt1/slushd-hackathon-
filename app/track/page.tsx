import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackLookup } from './lookup';
import { VitrinFooter, VitrinHeader } from '../vitrin-chrome';
import '../vitrin.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Sipariş takip',
  description: 'Müşteri takip linki. Gönderi numarasıyla teslimat saati ve gecikme nedeni.',
};

export default function TrackIndexPage() {
  return (
    <div className="vitrin">
      <VitrinHeader />
      <main className="band">
        <div className="wrap">
          <div className="band-head">
            <h1>Sipariş takip</h1>
            <p className="lead">Müşteri linki /track/gönderi-no biçimindedir. Saat ve gecikme nedeni, operasyon konsolunun aynı tarayıcıda yazdığı demo kaydından okunur.</p>
          </div>
          <TrackLookup />
          <p className="fine">Örnek kayıt için önce <Link href="/dispatcher">yönetici girişini</Link> açın, ardından gönderi numarası olarak v1 kullanın. v1, 34 LOG 101 plakalı gecikme kaydıdır.</p>
        </div>
      </main>
      <VitrinFooter />
    </div>
  );
}
