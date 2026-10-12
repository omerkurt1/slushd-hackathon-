import Link from 'next/link';

const links = [
  { href: '/#ozellikler', label: 'Özellikler' },
  { href: '/#entegrasyonlar', label: 'Entegrasyonlar' },
  { href: '/#fiyat', label: 'Abonelik & Fiyat' },
  { href: '/#nasil-calisir', label: 'Nasıl Çalışır' },
];

export function VitrinHeader() {
  return (
    <header className="vitrin-header">
      <div className="header-inner">
        <div className="brand-lockup">
          <Link className="logo" href="/">SLUSHD</Link>
          <Link className="btn btn-login" href="/dispatcher">Giriş</Link>
        </div>
        <nav className="nav-links" aria-label="Sayfa bölümleri">
          {links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="btn btn-primary" href="/#demo">Başla</Link>
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
          <p className="lead">Mevcut araç takip cihazlarına bağlanan operasyonel istisna katmanı. Yeni donanım satılmaz.</p>
        </div>
        <div>
          <h2>Hızlı erişim</h2>
          <ul>
            <li><Link href="/dispatcher">Yönetici girişi</Link></li>
            <li><Link href="/track">Sipariş takip</Link></li>
            <li><Link href="/#fiyat">Abonelik ve fiyat</Link></li>
          </ul>
        </div>
        <div>
          <h2>Yasal</h2>
          <ul>
            <li><a href="#gizlilik">Gizlilik</a></li>
            <li><a href="#kullanim">Kullanım koşulları</a></li>
          </ul>
        </div>
      </div>
      <div className="wrap legal">
        <p id="gizlilik">Gizlilik: Demo talep formuna yazılan bilgiler bu tarayıcıda kalır ve bir sunucuya gönderilmez.</p>
        <p id="kullanim">Kullanım: Bu vitrin, aynı kurulumdaki operasyon konsolunun tanıtım sayfasıdır. Müşteri takip linki yalnızca bu tarayıcıda üretilen demo kayıtlarını gösterir.</p>
      </div>
    </footer>
  );
}
