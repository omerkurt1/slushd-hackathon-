'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function TrackLookup() {
  const router = useRouter();
  const [id, setId] = useState('v1');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = id.trim();
    if (!value) return;
    router.push(`/track/${encodeURIComponent(value)}`);
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <label htmlFor="shipment-id">Shipment number
        <input id="shipment-id" name="id" value={id} onChange={event => setId(event.target.value)} required />
      </label>
      <button className="btn btn-primary" type="submit">Track</button>
    </form>
  );
}
