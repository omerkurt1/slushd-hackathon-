import Link from 'next/link';

const links = [
  { href: '/#ozellikler', label: 'Features' },
  { href: '/#entegrasyonlar', label: 'Integrations' },
  { href: '/#fiyat', label: 'Pricing' },
  { href: '/#nasil-calisir', label: 'How it works' },
];

export function VitrinHeader() {
  return (
    <header className="vitrin-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <Link className="logo" href="/">SLUSHD</Link>
          <Link className="btn btn-login" href="/dispatcher">Log in</Link>
        </div>
        <nav className="nav-links" aria-label="Page sections">
          {links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="btn btn-primary" href="/#demo">Get started</Link>
        </div>
      </div>
    </header>
  );
}

export function VitrinFooter() {
  return (
    <footer className="vitrin-footer">
      <div className="wrap footer-grid">
        <div>
          <h2>SLUSHD</h2>
          <p className="lead">An operational exception layer that connects to the tracking devices you already have. No new hardware is sold.</p>
        </div>
        <div>
          <h2>Quick links</h2>
          <ul>
            <li><Link href="/dispatcher">Dispatcher login</Link></li>
            <li><Link href="/track">Shipment tracking</Link></li>
            <li><Link href="/#fiyat">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <h2>Legal</h2>
          <ul>
            <li><a href="#gizlilik">Privacy</a></li>
            <li><a href="#kullanim">Terms of use</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap legal">
        <p id="gizlilik">Privacy: Details entered in the demo form stay in this browser and are not sent to a server.</p>
        <p id="kullanim">Terms: This page introduces the operations console in the same installation. A customer tracking link only shows demo records written in this browser.</p>
      </div>
    </footer>
  );
}
