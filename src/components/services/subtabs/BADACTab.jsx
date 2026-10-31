import { useState } from "react";
import { BadgeIcon } from "../../Icons";

// ── Content (wording kept from the original page) ────────────────────────────
const PHONE = "(044) 000-0000";
const HOURS = "Monday – Friday · 8:00 AM – 5:00 PM";
const ADDRESS = "Barangay 3S+ Hall, Malanday, Valenzuela City";

const telHref = (n) => `tel:${n.replace(/[^0-9+]/g, "")}`;

// Small helper so every icon shares the same stroke style
const Ico = ({ size = 26, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ICONS = {
  lock:     <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  gift:     <><polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
  door:     <><path d="M13 4h3a2 2 0 0 1 2 2v14" /><path d="M2 20h3" /><path d="M13 20h9" /><path d="M10 12v.01" /><path d="M13 4.56v16.16a1 1 0 0 1-1.24.97L5 20V5.56a2 2 0 0 1 1.52-1.94l4-1A2 2 0 0 1 13 4.56z" /></>,
  building: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></>,
  clipboard:<><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>,
  flask:    <><path d="M9 3h6" /><path d="M10 3v6L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9V3" /><path d="M7.5 15h9" /></>,
  clinic:   <><path d="M3 21V8l9-5 9 5v13" /><path d="M12 10v6" /><path d="M9 13h6" /></>,
  heart:    <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></>,
  user:     <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  check:    <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  home:     <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  pulse:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>,
  refresh:  <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></>,
  family:   <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  phone:    <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" /></>,
  clock:    <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  pin:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  chevron:  <><polyline points="6 9 12 15 18 9" /></>,
};

const FACTS = [
  { icon: "gift", label: "Cost",    value: "All services are free" },
  { icon: "lock", label: "Privacy", value: "Strictly confidential" },
  { icon: "door", label: "Visiting", value: "Walk in, no appointment needed" },
];

const STEPS = [
  { icon: "building",  title: "Visit the BADAC Office",    desc: "Go to Barangay 3S+ Hall and look for the BADAC desk. Walk-in only — no appointment needed. All visits are strictly confidential." },
  { icon: "clipboard", title: "Interview & Profiling",     desc: "A trained BADAC officer will conduct a private, non-judgmental interview to understand your situation and needs." },
  { icon: "flask",     title: "Free Drug Testing",         desc: "Voluntary and free drug testing is available on-site. Results are confidential and will not be shared without your consent." },
  { icon: "clinic",    title: "Evaluation at VADAO",       desc: "If needed, you will be referred to VADAO (Valenzuela Anti-Drug Abuse Office) for further evaluation and support planning." },
  { icon: "heart",     title: "Rehabilitation (If Needed)", desc: "Appropriate rehabilitation programs will be recommended. These are voluntary, free, and tailored to your situation." },
];

const WHO = [
  { icon: "user",  title: "18 Years Old and Above", desc: "Services are available to adults. Minors must be accompanied by a parent or guardian." },
  { icon: "check", title: "Voluntary Only",         desc: "Participation is completely voluntary. No one will be forced to undergo testing or rehabilitation." },
  { icon: "home",  title: "Barangay Residents",     desc: "Priority is given to residents of Barangay 3S+ Malanday. Others may be referred to their local BADAC." },
];

const FREE_ITEMS = ["Counseling & Guidance", "Drug Testing", "VADAO Referral", "Rehabilitation Coordination", "Family Support"];

const EDU = [
  { icon: "pulse",   title: "It's a Health Issue",     desc: "Drug dependency is recognized as a medical condition — not a moral failure. It can happen to anyone and is treatable with proper support." },
  { icon: "refresh", title: "Recovery Is Possible",    desc: "Many residents have successfully recovered through community-based rehabilitation. Early intervention significantly improves outcomes." },
  { icon: "family",  title: "Family Support Matters",  desc: "Family involvement is one of the strongest factors in successful recovery. BADAC provides guidance for families of affected individuals." },
];

const FAQS = [
  { q: "Will my information be shared with police?",                  a: "No. BADAC strictly follows confidentiality protocols. Your visit and information will not be disclosed to law enforcement without your explicit consent, unless required by a court order." },
  { q: "Is there any fee for BADAC services?",                        a: "All BADAC services are completely FREE — including counseling, drug testing, and rehabilitation referral." },
  { q: "Can I bring someone with me?",                                a: "Yes. You may bring a trusted family member or friend for support. All persons present are required to maintain confidentiality." },
  { q: "What if I am not a drug user but concerned about someone?",   a: "You can visit the BADAC office for guidance on how to help a family member or loved one. Concerned citizens are welcome." },
  { q: "What is the difference between BADAC and the police?",        a: "BADAC is a barangay-level welfare body focused on rehabilitation and support — not law enforcement. Visiting BADAC is not the same as surrendering to police." },
];

// ── BADAC Tab ────────────────────────────────────────────────────────────────
export default function BADACTab() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--amber bz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BadgeIcon /></span>BADAC</div>
            <h2 className="svc-hero__title">Barangay Anti-Drug Abuse Council</h2>
            <p className="svc-hero__sub">Seek guidance or report concerns related to illegal drug activities and access information about community-based drug prevention and rehabilitation support.</p>
          </div>
        </div>
      </div>

      <div className="bz-wrap">
        {/* Quick facts */}
        <section className="bz-glance" aria-label="Quick facts">
          {FACTS.map((f) => (
            <div className="bz-fact" key={f.label}>
              <span className="bz-fact__icon bz-fact__icon--amber"><Ico>{ICONS[f.icon]}</Ico></span>
              <div>
                <div className="bz-fact__label">{f.label}</div>
                <div className="bz-fact__value">{f.value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Contact: the ONLY place the number, hours and address appear */}
        <section className="bz-card bd-contact">
          <div className="bd-contact__main">
            <div>
              <h3 className="bz-heading">Call or visit BADAC</h3>
              <p className="bz-text bd-contact__text">Your visit, name, and information will never be shared without your consent.</p>
            </div>
            <a href={telHref(PHONE)} className="bd-callbtn">
              <Ico size={24}>{ICONS.phone}</Ico>
              <span>
                <small>Tap to call</small>
                {PHONE}
              </span>
            </a>
          </div>
          <div className="bd-contact__rows">
            <div className="bd-contact__row"><span className="bd-contact__icon"><Ico size={22}>{ICONS.clock}</Ico></span>{HOURS}</div>
            <div className="bd-contact__row"><span className="bd-contact__icon"><Ico size={22}>{ICONS.pin}</Ico></span>{ADDRESS}</div>
          </div>
        </section>

        {/* How it works */}
        <section className="bz-card">
          <h3 className="bz-heading">How it works</h3>
          <p className="bz-text">Here is what to expect, one step at a time.</p>
          <ol className="bd-steps">
            {STEPS.map((s, i) => (
              <li className="bd-step" key={s.title}>
                <span className="bd-step__icon">
                  <Ico size={28}>{ICONS[s.icon]}</Ico>
                  <span className="bd-step__num">{i + 1}</span>
                </span>
                <div>
                  <div className="bd-step__title">{s.title}</div>
                  <div className="bd-step__desc">{s.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Who can avail */}
        <section className="bz-card">
          <h3 className="bz-heading">Who can get help?</h3>
          <div className="bd-grid bd-grid--3">
            {WHO.map((w) => (
              <div className="bd-tile" key={w.title}>
                <span className="bd-tile__icon"><Ico size={28}>{ICONS[w.icon]}</Ico></span>
                <div className="bd-tile__title">{w.title}</div>
                <div className="bd-tile__desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Free services */}
        <section className="bz-card">
          <h3 className="bz-heading">All of these services are free</h3>
          <ul className="bd-free">
            {FREE_ITEMS.map((item) => (
              <li className="bd-free__item" key={item}>
                <span className="bd-free__check">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Understanding */}
        <section className="bz-card">
          <h3 className="bz-heading">Understanding drug abuse</h3>
          <div className="bd-grid bd-grid--3">
            {EDU.map((e) => (
              <div className="bd-tile bd-tile--soft" key={e.title}>
                <span className="bd-tile__icon bd-tile__icon--teal"><Ico size={28}>{ICONS[e.icon]}</Ico></span>
                <div className="bd-tile__title">{e.title}</div>
                <div className="bd-tile__desc">{e.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bz-card">
          <h3 className="bz-heading">Common questions</h3>
          <p className="bz-text">Tap a question to see the answer.</p>
          <div className="bd-faqs">
            {FAQS.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={faq.q} className={`bd-faq${open ? " is-open" : ""}`}>
                  <button type="button" className="bd-faq__q" aria-expanded={open} onClick={() => setOpenFaq(open ? null : i)}>
                    <span>{faq.q}</span>
                    <span className="bd-faq__chev"><Ico size={22}>{ICONS.chevron}</Ico></span>
                  </button>
                  {open && <div className="bd-faq__a">{faq.a}</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Legal footnote */}
        <div className="bz-legal bd-legal">Legal reference: RA 9165, the Comprehensive Dangerous Drugs Act of 2002</div>
      </div>
    </div>
  );
}