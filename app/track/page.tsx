import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackLookup } from './lookup';
import { VitrinFooter, VitrinHeader } from '../vitrin-chrome';
import '../vitrin.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Shipment tracking',
  description: 'Customer tracking link. Delivery time and delay reason by shipment number.',
};

export default function TrackIndexPage() {
  return (
    <div className="vitrin">
      <VitrinHeader />
      <main className="band">
        <div className="wrap">
          <div className="band-head">
            <h1>Shipment tracking</h1>
            <p className="lead">The customer link uses the form /track/shipment-number. Time and delay reason come from the demo record the operations console wrote in this browser.</p>
          </div>
          <TrackLookup />
          <p className="fine">For a sample record, open the <Link href="/dispatcher">dispatcher</Link> first, then use v1 as the shipment number. v1 is the delay record for plate 34 LOG 101.</p>
        </div>
      </main>
      <VitrinFooter />
    </div>
  );
}
