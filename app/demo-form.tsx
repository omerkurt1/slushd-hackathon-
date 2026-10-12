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
    return <p className="form-note" role="status">Your request is saved in this browser. It is reviewed against Starter, Pro, or Enterprise based on fleet size. This demo form does not send the request to a queue.</p>;
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label htmlFor="demo-name">Full name
        <input id="demo-name" name="name" autoComplete="name" required />
      </label>
      <label htmlFor="demo-email">Company email
        <input id="demo-email" name="email" type="email" autoComplete="email" required />
      </label>
      <label htmlFor="demo-fleet">Vehicles in the fleet
        <input id="demo-fleet" name="fleet" type="number" min={1} inputMode="numeric" required />
      </label>
      <label htmlFor="demo-message">Message
        <textarea id="demo-message" name="message" required />
      </label>
      <button className="btn btn-primary" type="submit">Request a demo</button>
    </form>
  );
}
