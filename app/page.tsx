import type { Metadata } from 'next';
import Link from 'next/link';
import { DemoForm } from './demo-form';
import { VitrinFooter, VitrinHeader } from './vitrin-chrome';
import './vitrin.css';

export const metadata: Metadata = {
  title: 'SLUSHD | Fleet operations',
  description: 'An operations layer that reads your existing GPS devices, turns a driver’s voice into a delay ticket, and sends customers a live tracking link.',
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
            <h1>No more phone use behind the wheel</h1>
            <p className="lead">One click for every problem</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/dispatcher">View the demo</Link>
            </div>
          </div>
        </section>

        <section className="band band-cream" aria-labelledby="darboaz-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="darboaz-baslik">Where operations stall</h2>
              <p className="lead">The delay starts in the field. By the time the office hears it through calls and chat groups, the penalty is already running.</p>
            </div>
            <div className="problem-grid">
              <article>
                <span className="index">01</span>
                <h3>Communication blackout</h3>
                <p>Fleet managers spend about three hours a day on “Where is the load?” calls.</p>
              </article>
              <article>
                <span className="index">02</span>
                <h3>Driving safety</h3>
                <p>Typing at the wheel raises the crash risk.</p>
              </article>
              <article>
                <span className="index">03</span>
                <h3>Unknown delays</h3>
                <p>Dock queues and breakdowns reach the customer too late, and penalties follow.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="band band-white" id="ozellikler">
          <div className="wrap">
            <article className="feature" id="entegrasyonlar">
              <figure className="frame">
                <img src="/media/media_1791678107321.jpg" alt="Aerial view of a container terminal and stacking yard" />
              </figure>
              <div className="feature-copy">
                <h3>Direct integration with the tracking systems you already run</h3>
                <p>Keep Arvento, Filoturk, or your standard telematics devices. The system reads the existing GPS feed live. Port, intermodal, and road fleets stay on the same hardware.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-cream" id="nasil-calisir">
          <div className="wrap">
            <article className="feature reverse">
              <figure className="frame">
                <img src="/media/media_1791678107311.jpg" alt="Courier carrying parcels beside a van" />
              </figure>
              <div className="feature-copy">
                <h3>Push-to-talk driver interface</h3>
                <p>The driver holds the mic and says, “Dock is closed, 40 minutes in queue.” The voice becomes a delay ticket on the board. No typing at the wheel.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-white">
          <div className="wrap">
            <article className="feature">
              <figure className="frame">
                <img src="/media/media_1791678123622.webp" alt="Driver unloading parcels from the back of a truck" />
              </figure>
              <div className="feature-copy">
                <h3>Live customer tracking that stops the phone calls</h3>
                <p>When an event is reported, one link shows the customer the delivery time and the reason for the delay. The final handoff stays on the same record.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="band band-cream" id="fiyat" aria-labelledby="fiyat-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="fiyat-baslik">Subscription per vehicle</h2>
              <p className="lead">No hardware fee. The plan follows fleet size and whether you need voice reports.</p>
            </div>
            <div className="price-grid">
              <article className="price">
                <p className="plan-label">1–10 vehicles</p>
                <h3>Starter</h3>
                <p className="amount">15 $ <small>/ vehicle / month</small></p>
                <ul>
                  <li>Existing GPS integration</li>
                  <li>Web dispatcher</li>
                  <li>Manual notifications</li>
                </ul>
              </article>
              <article className="price featured">
                <p className="plan-label">10–50 vehicles <span className="plan-mark">· Featured</span></p>
                <h3>Pro</h3>
                <p className="amount">12 $ <small>/ vehicle / month</small></p>
                <ul>
                  <li>Voice incident reporting</li>
                  <li>Unlimited customer tracking links</li>
                  <li>Dock dwell timer</li>
                </ul>
              </article>
              <article className="price">
                <p className="plan-label">50+ vehicles</p>
                <h3>Enterprise</h3>
                <p className="amount">Custom price <small>based on fleet and integration scope</small></p>
                <ul>
                  <li>ERP/TMS integration</li>
                  <li>24/7 SLA</li>
                  <li>Dedicated server</li>
                </ul>
              </article>
            </div>
            <p className="fine">Prices are per vehicle, per month. Your current telematics device stays in place.</p>
          </div>
        </section>

        <section className="band band-white" id="demo" aria-labelledby="demo-baslik">
          <div className="wrap">
            <div className="band-head">
              <h2 id="demo-baslik">Request a demo</h2>
              <p className="lead">Vehicle count sets the plan. A short note makes the dock and delay need clear.</p>
            </div>
            <DemoForm />
          </div>
        </section>
      </main>
      <VitrinFooter />
    </div>
  );
}
