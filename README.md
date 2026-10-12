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
2. **Harita:** Leaflet/react-leaflet, OpenStreetMap açık harita katmanı, durum pinleri, acil durum nabzı, flyTo ve temsili rota. Tamamlandı; commit/push onayı bekleniyor.
3. **Operasyon:** Sentetik Türkçe ses kaydı, örnek transkript/analiz, olay bileti, depo bekleme süresi, tek seferlik ETA onayı, takip bağlantısı, telefon bağlantısı, olay kapatma ve fatura notu taslağı. Tamamlandı; commit/push onayı bekleniyor.
4. **Görev atama:** Drawer formu, doğrulama, idle → active geçişi, yeni görevin takip sayfasına bağlanması ve son kontroller. Bekliyor.

## Mevcut sınırlar

Veriler açıkça etiketlenmiş simülasyondur. Gerçek GPS, backend, sürücü bildirimi veya AI servisi bağlı değildir. Görev atama butonları faz etiketiyle devre dışıdır. Plaka araması listeyi süzer; Enter veya araç kartına tıklama seçimi ve harita odağını günceller. Pin seçimi liste filtresini temizleyip ortak araç seçimini günceller. Harita her zaman tüm filoyu tutar. Sayılar örnek araçlardan türetilir. Operasyon değişiklikleri ve depo giriş zamanı bu tarayıcının localStorage alanında saklanır; depolama engelliyse yalnızca açık sayfada kalır.

## Operasyon demosu

Ses dosyası yerel Microsoft Tolga sesiyle sentetik üretilmiştir; `scripts/create-demo-audio.ps1` PowerShell 7 ve bu ses kurulu Windows'ta yeniden üretir. Ses dosyası repoya dahildir. Oynatma/duraklatma ve 1.0x/1.2x hız desteklenir. AI transkripti/analizi demo veridir.

Depo bekleme süresi ilk açılışta 01:48:15'ten başlar, araç değiştirmede ve yenilemede sıfırlanmaz. 02:00:00'dan itibaren kırmızıya döner ve fatura notu taslağı oluşturulabilir. Gerçek fatura veya ücret hesaplanmaz.

Gecikme onayı ETA'yı 40 dakika artırır; tekrar uygulanamaz. Olay kapatma durumu, harita pinini, listeyi ve özet sayılarını günceller. Çağrı bağlantısı `tel:` kullanır; gerçek çağrı uygulama tarafından yapılmaz.

`/track/[id]` aynı tarayıcıdaki demo kayıtlarını gösterir ve diğer sekmedeki değişiklikleri takip eder; başka cihazla paylaşılabilen canlı müşteri servisi değildir. Telefon ve sürücü adı bu sayfaya aktarılmaz. Yerel demo başlangıcına dönmek için tarayıcı depolamasındaki `slushd-operations-v1` ve `slushd-tracking-v1` kayıtları temizlenebilir.

Terim standardı: `TERMINOLOGY.md`. Yeni ekranlar da bu sözlüğü takip eder.

Harita ilk açılışta tüm filoyu gösterir; seçim araca 15 zoom düzeyinde odaklanır. Tüm filo / Araca odaklan / Rotayı göster düğmeleri görünümü değiştirir. Kesikli, mat mavi rotalar örnek ara noktalardır; gerçek yol tarifi, kamyon uygunluğu veya trafik hesabı değildir. Boşta araçta rota çizilmez. Harita zemini internet gerektirir; yüklenemezse tekrar deneme uyarısı gösterilir. Azaltılmış hareket tercihinde nabız ve uçuş animasyonları durdurulur. Leaflet tarayıcıda dinamik yüklenir.

Masaüstünde ekran sabittir, liste ve detay kendi içinde kayar. Dar ekranlarda liste ve detay dikey düzenlenir; harita alanı gizlenir.
