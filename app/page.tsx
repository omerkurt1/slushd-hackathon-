import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoForm } from './demo-form';
import { VitrinFooter, VitrinHeader } from './vitrin-chrome';
import './vitrin.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Filo operasyon vitrini',
  description: 'Mevcut GPS cihazlarına bağlanan, sürücü sesini gecikme biletine çeviren ve müşteriye canlı takip linki veren operasyon katmanı.',
};

export default function Home() {
  return (
    <div className="vitrin">
      <VitrinHeader />
      <main>
        <section className="hero">
          <div className="hero-media" aria-hidden="true">
            <img src="/media/media_1791678107342.jpg" alt="" />
          </div>
          <div className="wrap hero-copy">
            <h1>Direksiyon başında telefon kullanımına son</h1>
            <p className="lead">Tek tıkla her derde deva</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/dispatcher">Demoyu incele</Link>
            </div>
          </div>
        </section>

        <section className="band band-cream" aria-labelledby="darboaz-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="darboaz-baslik">Operasyonun tıkanma noktası</h2>
              <p className="lead">Gecikme sahada başlar. Merkez haberi telefon ve mesaj gruplarından alınca cezai şart çoktan işlemiştir.</p>
            </div>
            <div className="problem-grid">
              <article>
                <span className="index">01</span>
                <h3>İletişim körlüğü</h3>
                <p>Filo yöneticileri günde ortalama 3 saatini “Yük nerede?” telefonlarına harcar.</p>
              </article>
              <article>
                <span className="index">02</span>
                <h3>Sürüş güvenliği</h3>
                <p>Sürücünün direksiyon başında mesaj yazması kaza riskini artırır.</p>
              </article>
              <article>
                <span className="index">03</span>
                <h3>Bilinmeyen gecikmeler</h3>
                <p>Rampa sıraları ve arızalar müşteriye geç ulaştığında cezai şartlar doğar.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="band band-white" id="ozellikler">
          <div className="wrap">
            <article className="feature" id="entegrasyonlar">
              <figure className="frame">
                <img src="/media/media_1791678107321.jpg" alt="Kuşbakışı konteyner terminali ve istif sahası" />
              </figure>
              <div className="feature-copy">
                <h3>Mevcut araç takip sistemleriyle doğrudan entegrasyon</h3>
                <p>Arvento, Filotürk veya standart telematik cihazlarınızı değiştirmeyin. Sistem mevcut GPS verisini anlık okur. Liman, intermodal ve kara taşımacılığındaki altyapı aynı kalır.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-cream" id="nasil-calisir">
          <div className="wrap">
            <article className="feature reverse">
              <figure className="frame">
                <img src="/media/media_1791678107311.jpg" alt="Minibüs yanında koli taşıyan kurye" />
              </figure>
              <div className="feature-copy">
                <h3>Bas-konuş sürücü arayüzü</h3>
                <p>Sürücü mikrofona basar, “Rampa kapalı, 40 dakika sıra var” der. Ses çözümlenir ve panele gecikme bileti olarak işlenir. Direksiyon başında mesaj yazılmaz.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <article className="feature">
              <figure className="frame">
                <img src="/media/media_1791678123622.webp" alt="Kamyon kasasından koli indiren dağıtımcı" />
              </figure>
              <div className="feature-copy">
                <h3>Telefonları susturan canlı müşteri takibi</h3>
                <p>Olay bildirildiğinde müşteriye tek tıkla giden takip linki, teslimat saatini ve gecikme nedenini canlı gösterir. Son teslimat anı da aynı kayıtta kalır.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-cream" id="fiyat" aria-labelledby="fiyat-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="fiyat-baslik">Araç başına abonelik</h2>
              <p className="lead">Donanım bedeli yok. Paket, filo büyüklüğüne ve sesli bildirim ihtiyacına göre ayrılır.</p>
            </div>
            <div className="price-grid">
              <article className="price">
                <p className="plan-label">1–10 araç</p>
                <h3>Starter</h3>
                <p className="amount">15 $ <small>/ araç / ay</small></p>
                <ul>
                  <li>Mevcut GPS entegrasyonu</li>
                  <li>Web dispatcher</li>
                  <li>Manuel bildirimler</li>
                </ul>
              </article>
              <article className="price featured">
                <p className="plan-label">10–50 araç <span className="plan-mark">· Öne çıkan</span></p>
                <h3>Pro</h3>
                <p className="amount">12 $ <small>/ araç / ay</small></p>
                <ul>
                  <li>Sesli olay raporlama</li>
                  <li>Sınırsız müşteri takip linki</li>
                  <li>Rampa sayacı</li>
                </ul>
              </article>
              <article className="price">
                <p className="plan-label">50+ araç</p>
                <h3>Enterprise</h3>
                <p className="amount">Özel fiyat <small>filo ve entegrasyon kapsamına göre</small></p>
                <ul>
                  <li>ERP/TMS entegrasyonu</li>
                  <li>7/24 SLA</li>
                  <li>Özel sunucu</li>
                </ul>
              </article>
            </div>
            <p className="fine">Fiyatlar araç başına aylıktır. Mevcut telematik cihaz değişmeden kalır.</p>
          </div>
        </section>

        <section className="band band-white" id="demo" aria-labelledby="demo-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="demo-baslik">Demo talep edin</h2>
              <p className="lead">Filodaki araç sayısı paketi belirler. Kısa not, rampa ve gecikme ihtiyacını netleştirir.</p>
            </div>
            <DemoForm />
          </div>
        </section>
      </main>
      <VitrinFooter />
    </div>
  );
}
