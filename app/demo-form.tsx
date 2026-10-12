'use client';

import { useState } from 'react';

export function DemoForm() {
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const request = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      fleet: String(data.get('fleet') ?? '').trim(),
      message: String(data.get('message') ?? '').trim(),
    };
    if (!request.name || !request.email || !request.fleet || !request.message) return;
    sessionStorage.setItem('slushd-demo-request', JSON.stringify(request));
    setSent(true);
  }

  if (sent) {
    return <p className="form-note" role="status">Talebiniz bu tarayıcıda kaydedildi. Araç sayınıza göre Starter, Pro veya Enterprise paketinden değerlendirme yapılır. Bu demo form bir başvuru kuyruğuna iletmez.</p>;
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label htmlFor="demo-name">Ad soyad
        <input id="demo-name" name="name" autoComplete="name" required />
      </label>
      <label htmlFor="demo-email">Şirket e-postası
        <input id="demo-email" name="email" type="email" autoComplete="email" required />
      </label>
      <label htmlFor="demo-fleet">Filodaki araç sayısı
        <input id="demo-fleet" name="fleet" type="number" min={1} inputMode="numeric" required />
      </label>
      <label htmlFor="demo-message">Mesaj
        <textarea id="demo-message" name="message" required />
      </label>
      <button className="btn btn-primary" type="submit">Demo talep et</button>
    </form>
  );
}
