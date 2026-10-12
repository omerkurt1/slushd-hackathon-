# SLUSHD Dispatcher

Açık temalı B2B lojistik operasyon konsolu. Next.js App Router, React, TypeScript ve Tailwind CSS.

## Yerelde çalıştırma

```sh
npm ci
npm run dev
```

http://127.0.0.1:3000/dispatcher — ana sayfa bu adrese yönlenir.

```sh
npm run build
npm run typecheck
npm run test:e2e
```

Tarayıcı testleri yerel Chrome kullanır; dev sunucusu ayrıca çalışıyor olmalıdır.

## Fazlar ve onay kapıları

Her faz uygulanır, yerelde gösterilir ve kontrol edilir. Kullanıcı açıkça onay vermeden commit veya push yapılmaz. Sonraki faza mevcut fazın değerlendirmesinden sonra geçilir.

1. **Konsol temeli:** Beş örnek araç, öncelikli liste, durum filtreleri, plaka araması, seçili araç profili, Türkiye saati, açık tema. Onaylandı; `4fdab8f` commit'i main'e gönderildi.
2. **Harita:** Leaflet/react-leaflet, OpenStreetMap açık harita katmanı, durum pinleri, acil durum nabzı ve flyTo. Faz 3 ile birlikte `1232bcb` commit'i main'e gönderildi.
3. **Operasyon:** Sentetik Türkçe ses kaydı, örnek mesaj özeti, olay kaydı, depo bekleme süresi, tek seferlik ETA onayı, takip bağlantısı, telefon bağlantısı, olay kapatma ve fatura notu taslağı. Onaylandı; `1232bcb` commit'i main'e gönderildi.
4. **Görev atama:** Çekmece formu, doğrulama, boşta araçtan yolda geçişi, koordinata bağlı yol rotası, takip kaydı ve tarayıcıda kalıcılık. Onaylandı; `a608fb7` commit'i main'e gönderildi.
5. **Kabul:** Plaka araması operasyon çubuğuna alındı. Liste, harita, olay özeti ve görev atama aynı seçimle çalışıyor. Yeni ürün kapsamı eklenmedi.

## Mevcut sınırlar

Veriler açıkça etiketlenmiş simülasyondur. Gerçek GPS, backend, sürücü bildirimi veya AI servisi bağlı değildir. Görev atama yalnızca bu tarayıcıdaki demo kaydını günceller; sürücüye SMS veya uygulama bildirimi gitmez. Plaka araması operasyon çubuğundadır ve listeyi süzer; Enter veya araç kartına tıklama seçimi ve harita odağını günceller. Pin seçimi liste filtresini temizleyip ortak araç seçimini günceller. Harita her zaman tüm filoyu tutar. Sayılar örnek araçlardan türetilir. Operasyon değişiklikleri ve depo giriş zamanı bu tarayıcının localStorage alanında saklanır; depolama engelliyse yalnızca açık sayfada kalır.

## Operasyon demosu

Ses dosyası yerel Microsoft Tolga sesiyle sentetik üretilmiştir; `scripts/create-demo-audio.ps1` PowerShell 7 ve bu ses kurulu Windows'ta yeniden üretir. Ses dosyası repoya dahildir. Oynatma/duraklatma ve 1.0x/1.2x hız desteklenir. Mesaj özeti demo metnidir. Son durum, olay açıkken **Devam ediyor**, kapatılınca **Bitti** olur.

Depo bekleme süresi ilk açılışta 01:48:15'ten başlar, araç değiştirmede ve yenilemede sıfırlanmaz. 02:00:00'dan itibaren kırmızıya döner ve fatura notu taslağı oluşturulabilir. Gerçek fatura veya ücret hesaplanmaz.

Gecikme onayı ETA'yı 40 dakika artırır; tekrar uygulanamaz. Olay kapatma durumu, harita pinini, listeyi ve özet sayılarını günceller. Çağrı bağlantısı `tel:` kullanır; gerçek çağrı uygulama tarafından yapılmaz.

`/track/[id]` aynı tarayıcıdaki demo kayıtlarını gösterir ve diğer sekmedeki değişiklikleri takip eder; başka cihazla paylaşılabilen canlı müşteri servisi değildir. Telefon ve sürücü adı bu sayfaya aktarılmaz. Yerel demo başlangıcına dönmek için tarayıcı depolamasındaki `slushd-operations-v1` ve `slushd-tracking-v1` kayıtları temizlenebilir.

Terim standardı: `TERMINOLOGY.md`. Yeni ekranlar da bu sözlüğü takip eder.

## Yol ağı rotası

Harita ekran görüntüsündeki standart renkli OpenStreetMap temasını kullanır; gri filtre kaldırılmıştır. İlk açılışta tüm filo, seçimde aracın yakın çevresi gösterilir. Tüm filo / Araca odaklan / Rotayı göster düğmeleri görünümü değiştirir.

`/api/route?vehicle=v1` örnek aracın sabit başlangıç/hedef çiftini, `/api/route?from=40.854,29.433&to=40.8242,29.442` ise görev formundaki doğrulanmış koordinatları FOSSGIS OSRM otomobil servisine gönderir. Serbest adres bu koordinatlara sessizce eşlenmez. Önbellek anahtarı koordinat çiftidir; araç kimliği yalnızca sabit demo güzergâhlarında kullanılır. `overview=full` GeoJSON geometrisi gerçek OSM yol ağını izler; elle yazılmış ara noktalar yoktur. Seçili pin rotanın yola eşlenmiş başlangıcında gösterilir; eşleme uzaklığı ayrıca belirtilir. Depo adları ve hedef koordinatları halen demo veridir; adres doğrulaması yapılmaz.

Görev formundaki çıkış ve teslimat, filoda zaten kullanılan doğrulanmış demo noktalarından seçilir. Çözülemeyen serbest metin kaydedilmez ve rastgele koordinat üretilmez. Feribot adımı içeren yanıtlar reddedilir. Rota bulunamazsa, servis hata verirse veya 12 saniyede yanıtlamazsa düz çizgi yerine hata/tekrar deneme gösterilir. Araç değişirken önceki istek iptal edilir ve eski rota gizlenir. Boşta araçta rota yoktur. Sabit dört demo güzergâh bir saat sunucu belleğinde önbelleklenir; aynı istekler birleştirilir ve tek süreçte istekler en az 1,1 saniye arayla sıraya konur.

Bu servis otomobil profilidir: kamyon tonajı/yüksekliği, ADR ve canlı trafik içermez. Gösterilen rota süresi trafik hariç tahmindir, operasyonun hedef ETA alanını değiştirmez. Üretim/çoklu sunucu kullanımından önce yönetilen veya kendi rota servisi, kimlik doğrulama ve ortak hız sınırlaması gerekir. Kaynak: https://routing.openstreetmap.de/about.html

Harita zemini internet gerektirir; yüklenemezse tekrar deneme uyarısı gösterilir. Azaltılmış hareket tercihinde nabız ve uçuş animasyonları durdurulur. Leaflet tarayıcıda dinamik yüklenir. Otomatik etkileşim testleri harita ve rota yanıtlarını taklit eder; gerçek servis bağlantısı ayrıca dört demo güzergâhta kontrol edilmiştir.

Masaüstünde ekran sabittir, liste ve detay kendi içinde kayar. Dar ekranlarda liste ve detay dikey düzenlenir; harita alanı gizlenir.
