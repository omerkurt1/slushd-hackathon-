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

1. **Konsol temeli:** Beş örnek araç, öncelikli liste, durum filtreleri, plaka araması, seçili araç profili, Türkiye saati, açık tema. Tamamlandı; commit/push onayı bekleniyor.
2. **Harita:** Leaflet/react-leaflet, açık harita katmanı, durum pinleri, acil durum nabzı, flyTo, tahmini rota. Bekliyor.
3. **Operasyon:** Örnek ses kaydı, transkript, olay bileti, canlı rampa sayacı, gecikme onayı, bağlantı kopyalama, arama ve olay kapatma. Bekliyor.
4. **Görev atama:** Drawer formu, doğrulama, idle → active geçişi, takip sayfası ve son kontroller. Bekliyor.

## Mevcut sınırlar

Veriler açıkça etiketlenmiş simülasyondur. Gerçek GPS, backend, sürücü bildirimi veya AI servisi bağlı değildir. Faz 1'de harita yer tutucudur ve görev atama butonları faz etiketiyle devre dışıdır. Plaka araması listeyi süzer; Enter veya araç kartına tıklama seçimi günceller. Sayılar örnek araçlardan türetilir. Henüz değişiklikler kalıcı olarak saklanmaz.

Masaüstünde ekran sabittir, liste ve detay kendi içinde kayar. Dar ekranlarda liste ve detay dikey düzenlenir; harita alanı gizlenir.
