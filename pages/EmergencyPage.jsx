import { useState } from "react";
import { PhoneIcon, AlertTriangleIcon, MapPinIcon, ShieldAlertIcon, ListIcon, CheckIcon, ChevronDownIcon, InfoIcon, AlertCallIcon, EvacuateIcon, EvacCenterIcon, RadioIcon, CooperateIcon } from "../components/Icons";
// DATA

const HOTLINES = [
  { id: "brgy",     name: "Barangay Office Hotline",          number: "0927-373-6727",  sub: "Available 24/7 for barangay emergencies", variant: "red", primary: true },
  { id: "brgy",     name: "Barangay Office Landline",         number: "02-8926-7327",   sub: "Available 24/7 for barangay emergencies"},
  { id: "city",     name: "City Hall",                        number: "02-8352-1000"},
  { id: "brgy",     name: "Barangay Tanod",                   number: "02-8962-7325",  sub: "Available 24/7 for barangay emergencies"},
  { id: "brgy",     name: "Task Force Disiplina",             number: "02-8352-8000",  sub: "Available 24/7 for barangay emergencies"},
  { id: "health",   name: "Valenzuela Medical Center",        number: "02-8294-6711",  sub: "Medical assistance & first aid"},
  { id: "fire",     name: "Valenzuela Fire Station",          number: "02-8292-3519",  sub: "Bureau of Fire Protection"},
  { id: "police",   name: "Valenzuela Police Station",        number: "02-8352-4000",  sub: "PNP"},
  { id: "ndrrmc",   name: "Valenzuela DRRMO",                 number: "02-8352-5000",  sub: "National Disaster Risk Reduction & Management"},
];

const EVACUATION_CENTERS = [
  { id: "ev1", name: "Andres Fernando Malanday Evacuation Site",  address: "Malanday, Valenzuela City",            capacity: "5000 people",},

];

const SAFETY_REMINDERS = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    ),
    color: "#e03e3e",
    bg: "rgba(224,62,62,0.10)",
    title: "Fire Emergency",
    items: [
      "Stay low and crawl under smoke",
      "Feel doors before opening — if hot, use another exit",
      "Never use elevators during a fire",
      "Meet at the designated assembly point outside",
    ],
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h20M2 12c2-4 4-6 10-6s8 2 10 6M2 12c2 4 4 6 10 6s8-2 10-6"/>
        <path d="M6 18c0 1.5 1.5 3 3 3M15 18c0 1.5 1.5 3 3 3"/>
      </svg>
    ),
    color: "#1a56a0",
    bg: "rgba(26,86,160,0.10)",
    title: "Flood / Typhoon",
    items: [
      "Avoid walking through floodwater, it could be electrically charged.",
      "Move to higher ground immediately",
      "Bring emergency kit: IDs, medicines, water",
      "Monitor updates via local radio & PAGASA",
    ],
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
    color: "#317D89",
    bg: "rgba(49,125,137,0.10)",
    title: "Earthquake",
    items: [
      "Drop, Cover, and Hold On",
      "Stay away from windows and heavy furniture",
      "After shaking stops, exit carefully — watch for debris",
      "Expect aftershocks; do not re-enter damaged buildings",
    ],
  },
];

const DISASTER_PROTOCOLS = [
  { step: 1, Icon: AlertCallIcon,  color: "#e03e3e", bg: "rgba(224,62,62,0.08)",   border: "rgba(224,62,62,0.18)",   title: "Alert & Notify",      desc: "Call the barangay emergency hotline immediately. Notify neighbors and family members of the situation." },
  { step: 2, Icon: EvacuateIcon,   color: "#b07800", bg: "rgba(232,160,32,0.08)",  border: "rgba(232,160,32,0.18)",  title: "Evacuate Safely",     desc: "Follow designated evacuation routes. Bring only essential items — documents, medicines, emergency kit." },
  { step: 3, Icon: EvacCenterIcon, color: "#317D89", bg: "rgba(49,125,137,0.08)",  border: "rgba(49,125,137,0.18)",  title: "Go to Evac Center",   desc: "Proceed to the nearest operational evacuation center. Register upon arrival." },
  { step: 4, Icon: RadioIcon,      color: "#703381", bg: "rgba(112,51,129,0.08)",  border: "rgba(112,51,129,0.18)",  title: "Stay Informed",       desc: "Monitor official updates via radio (DZRH 666 kHz, DZMM 630 kHz) or the barangay public announcement system." },
  { step: 5, Icon: CooperateIcon,  color: "#1a56a0", bg: "rgba(26,86,160,0.08)",   border: "rgba(26,86,160,0.18)",   title: "Follow Instructions", desc: "Cooperate fully with the Barangay Emergency Response Team (BERT) and all local government responders." },
];

// SUB-COMPONENTS

function PrimaryHotline({ hotline }) {
  return (
    <a href={`tel:${hotline.number}`} className="em-hotline-primary">
      <span className="em-hotline-primary__pulse" />
      <div className="em-hotline-primary__icon"><PhoneIcon size={22} /></div>
      <div className="em-hotline-primary__text">
        <div className="em-hotline-primary__label">Emergency Hotline</div>
        <div className="em-hotline-primary__number">{hotline.number}</div>
        <div className="em-hotline-primary__name">{hotline.name}</div>
      </div>
    </a>
  );
}

function SecondaryHotline({ hotline }) {
  return (
    <a href={`tel:${hotline.number}`} className={`em-hotline-card em-hotline-card--${hotline.variant}`}>
      <div className="em-hotline-card__icon"><PhoneIcon size={16} /></div>
      <div style={{ flex: 1 }}>
        <div className="em-hotline-card__name">{hotline.name}</div>
        <div className="em-hotline-card__number">{hotline.number}</div>
        <div className="em-hotline-card__sub">{hotline.sub}</div>
      </div>
    </a>
  );
}

function EvacuationCard({ center }) {
  const isOperational = center.status === "operational";
  return (
    <div className="em-evac-card">
      <div className="em-evac-card__left">
        <div className="em-evac-card__icon"><MapPinIcon size={18} /></div>
        <div>
          <div className="em-evac-card__name">{center.name}</div>
          <div className="em-evac-card__address">{center.address}</div>
          <div className="em-evac-card__meta">
            <span className="em-evac-card__meta-text">{center.floor}</span>
            <span className="em-evac-card__meta-dot" />
            <span className="em-evac-card__meta-text">
              Capacity: <strong style={{ color: "#0f1f35" }}>{center.capacity}</strong>
            </span>
          </div>
        </div>
      </div>
      <div className="em-evac-card__right">
        <span className={`em-evac-status em-evac-status--${isOperational ? "operational" : "standby"}`}>
          <span className="em-evac-status__dot" />
          {isOperational ? "Operational" : "Standby"}
        </span>
      </div>
    </div>
  );
}

function SafetyAccordion({ item }) {
  const { icon, color, bg, title, items } = item;
  return (
    <div className="em-accordion em-accordion--open">
      <div className="em-accordion__trigger" style={{ cursor: "default" }}>
        <div className="em-accordion__trigger-left">
          <span
            className="em-accordion__emoji"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: bg,
              color: color,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <span className="em-accordion__title">{title}</span>
        </div>
      </div>
      <div className="em-accordion__body">
        <div className="em-accordion__tips">
          {items.map((tip, i) => (
            <div key={i} className="em-accordion__tip">
              <span className="em-accordion__tip-icon">
                <CheckIcon size={10} />
              </span>
              {tip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// MAIN

export default function EmergencyPage({ onNavigate, userName = "Juan Dela Cruz" }) {
  return (
    <main className="em-page">

      {/* ── Banner ── */}
      <div className="em-banner">
        <div className="em-banner__inner">
          <div className="em-banner__eyebrow">Emergency Assistance</div>
          <h1 className="em-banner__title">
            <AlertTriangleIcon size={28} />
            Emergency <span>Assistance</span>
          </h1>
          <p className="em-banner__sub">
            Quick access to emergency hotlines, evacuation centers, and safety protocols for Barangay Malanday residents.
          </p>
        </div>
      </div>

      {/* ── Urgent Notice Bar ── */}
      <div className="em-notice">
        <InfoIcon size={14} />
        <span>For life-threatening emergencies, call immediately. Do not delay.</span>
      </div>

      {/* ── Content ── */}
      <div className="em-content">

        {/* ── Emergency Hotlines ── */}
        <div className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="sc-card-header">
            <div className="sc-card-header-left">
              <div className="sc-card-icon-wrap" style={{ background: "rgba(220,38,38,0.09)", color: "#e03e3e" }}>
                <PhoneIcon size={16} />
              </div>
              <div>
                <div className="sc-card-title">Emergency Hotlines</div>
                <div className="sc-card-subtitle">Tap any card to call directly</div>
              </div>
            </div>
          </div>
          <div className="em-card-body">
            <PrimaryHotline hotline={HOTLINES[0]} />
            <div className="em-hotlines-grid">
              {HOTLINES.slice(1).map(h => <SecondaryHotline key={h.id} hotline={h} />)}
            </div>
          </div>
        </div>

        {/* ── Evacuation Centers ── */}
        <div className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="sc-card-header">
            <div className="sc-card-header-left">
              <div className="sc-card-icon-wrap">
                <MapPinIcon size={16} />
              </div>
              <div>
                <div className="sc-card-title">Evacuation Centers</div>
                <div className="sc-card-subtitle">Nearest designated safe zones in Malanday</div>
              </div>
            </div>
          </div>
          <div className="em-card-body">
            <div className="em-info-box" style={{ marginBottom: "0.75rem" }}>
              <InfoIcon size={14} />
              <span>Always bring a valid ID, 3-day food supply, medicines, and important documents when evacuating.</span>
            </div>
            <div className="em-evac-list">
              {EVACUATION_CENTERS.map(c => <EvacuationCard key={c.id} center={c} />)}
            </div>
          </div>
        </div>

        {/* ── Guidelines two-column grid ── */}
        <div className="em-guidelines-grid">

          {/* Safety Reminders */}
          <div className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="sc-card-header">
              <div className="sc-card-header-left">
                <div className="sc-card-icon-wrap" style={{ background: "rgba(232,160,32,0.09)", color: "#b07800" }}>
                  <ShieldAlertIcon size={16} />
                </div>
                <div>
                  <div className="sc-card-title">Safety Reminders</div>
                </div>
              </div>
            </div>
            <div className="em-accordion-list">
              {SAFETY_REMINDERS.map(item => <SafetyAccordion key={item.title} item={item} />)}
            </div>
          </div>

          {/* Disaster Protocols */}
          <div className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="sc-card-header">
              <div className="sc-card-header-left">
                <div className="sc-card-icon-wrap" style={{ background: "rgba(26,86,160,0.09)", color: "#1a56a0" }}>
                  <ListIcon size={16} />
                </div>
                <div>
                  <div className="sc-card-title">Disaster Protocols</div>
                  <div className="sc-card-subtitle">What to do during a disaster</div>
                </div>
              </div>
            </div>
            <div className="em-protocols-body">
              {DISASTER_PROTOCOLS.map((item, idx) => {
                const { Icon, color, bg, border, step, title, desc } = item;
                return (
                  <div key={step} className="em-protocol-step">
                    <div className="em-protocol-step__left">
                      {/* SVG icon badge replaces the emoji */}
                      <div
                        className="em-protocol-step__icon-wrap"
                        style={{ background: bg, border: `1.5px solid ${border}`, color }}
                      >
                        <Icon size={20} />
                        <span className="em-protocol-step__num" style={{ background: color }}>{step}</span>
                      </div>
                      {idx < DISASTER_PROTOCOLS.length - 1 && (
                        <div className="em-protocol-step__connector" style={{ background: border }} />
                      )}
                    </div>
                    <div className={`em-protocol-step__body${idx < DISASTER_PROTOCOLS.length - 1 ? " em-protocol-step__body--spaced" : ""}`}>
                      <div className="em-protocol-step__title">{title}</div>
                      <div className="em-protocol-step__desc">{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── DRRM Resources note ── */}
        <div className="em-drrm-note">
          <div className="em-drrm-note__icon"><InfoIcon size={16} /></div>
          <div>
            <div className="em-drrm-note__title">Barangay DRRM Resources</div>
            <div className="em-drrm-note__desc">
              Barangay 3S+ Malanday maintains an emergency preparedness team available 24/7. Emergency supply kits are stored at the Barangay Hall. For non-urgent concerns, visit the office during business hours (Mon–Fri, 8AM–5PM).
            </div>
          </div>
        </div>

      </div>

      {/* ── Footer ── */}
      <footer className="db-footer" style={{ marginTop: "auto" }}>
        <div className="db-footer-inner">
          <div className="db-footer-top">
            <div className="db-footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Barangay 3S+ Malanday</span>
              <span className="db-footer-divider">|</span>
              <span className="db-footer-tagline">Community Management System</span>
            </div>
            <nav className="db-footer-links">
              <a className="db-footer-link" href="#">Privacy Policy</a>
              <a className="db-footer-link" href="#">Terms of Use</a>
              <a className="db-footer-link" href="#">Contact Support</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>© 2026 Barangay 3S+ Malanday. All rights reserved.</p>
            <p>Powered by the Barangay 3S+ Community Management System</p>
          </div>
        </div>
      </footer>

    </main>
  );
}