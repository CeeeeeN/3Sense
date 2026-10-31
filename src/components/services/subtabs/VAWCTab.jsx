import { useState, useEffect, useRef } from "react";
import { ServiceShieldIcon, PhoneCallIcon, ServiceAlertTriangleIcon, HeartIcon } from "../../Icons";

// Phone numbers appear in ONE place each:
//   • 911 / 117 → the red emergency bar (always visible)
//   • everything else → the "Talk to someone" screen
const SUPPORT_LINES = [
  { name: "Barangay 3S+ VAWC Desk",         number: "(044) 000-0000", desc: "Our barangay's VAWC officer" },
  { name: "Valenzuela City Social Welfare", number: "(02) 8292-9200", desc: "City social welfare office" },
  { name: "DSWD Hotline",                   number: "8-888",          desc: "Social welfare and protection" },
  { name: "DOH Mental Health Hotline",      number: "1553",           desc: "Free counseling, 24 hours a day" },
  { name: "Philippine Commission on Women", number: "(02) 8735-1654", desc: "Help with women's rights" },
];

const BPO_STEPS = [
  { title: "Go to the Barangay Hall",         desc: "Go to Barangay 3S+ Malanday Hall. Ask for the VAWC Desk or the Barangay Secretary." },
  { title: "Ask for the BPO form",            desc: "Ask for a \u201CBarangay Protection Order\u201D form. The Social Worker can help you fill it out." },
  { title: "Give the form and your ID",       desc: "You do not need to bring the other person with you." },
  { title: "Get your BPO within 24 hours",    desc: "By law, the Barangay must give it to you within 24 hours. It is free." },
  { title: "Keep your copy with you",         desc: "If the other person breaks the order, they can be jailed." },
];

const CASE_PAPERS = [
  { id: "id",        label: "Valid ID (UMID, PhilSys, Passport, or Driver's License)" },
  { id: "brgy",      label: "Barangay Clearance" },
  { id: "incident",  label: "Your written story of what happened" },
  { id: "medcert",   label: "Medical certificate from the hospital or health center" },
  { id: "photos",    label: "Photos of injuries or damage (if you have any)" },
  { id: "witness",   label: "Name and number of a witness (if there is one)" },
  { id: "affidavit", label: "Sworn complaint (the Barangay or police will help you write it)" },
];

const WHERE_TO_GO = [
  { color: "#317D89", place: "Barangay Hall",                        why: "for the Barangay Blotter and the Protection Order" },
  { color: "#703381", place: "Police Women & Children Desk",         why: "for the Police Blotter" },
  { color: "#e03e3e", place: "Hospital or Health Center",            why: "for the Medical Certificate" },
  { color: "#9a7b00", place: "City Prosecutor's Office",             why: "to file the case" },
];

const telHref = (n) => `tel:${n.replace(/[^0-9+]/g, "")}`;

const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const PaperIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
);
const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);

export default function VAWCTab() {
  const [view, setView] = useState(null); // null | "bpo" | "case" | "talk"
  const [checked, setChecked] = useState({});
  const topRef = useRef(null);

  // Bring the person back to the top of the content whenever the screen changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view]);

  const count = Object.values(checked).filter(Boolean).length;

  const BackButton = () => (
    <button type="button" className="vz-back" onClick={() => setView(null)}>
      <ArrowLeft /> Back to choices
    </button>
  );

  return (
    <div className="vz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--red vz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><ServiceShieldIcon /></span>VAWC</div>
            <h2 className="svc-hero__title">Violence Against Women and Children</h2>
            <p className="svc-hero__sub">Report cases of abuse and get help, guidance, and protection for women and children who are experiencing violence. Help is free and private.</p>
          </div>
        </div>
      </div>

      <div className="vz-wrap" ref={topRef}>
        {/* The ONLY place the emergency numbers appear */}
        <section className="vz-emergency" aria-label="Emergency">
          <div className="vz-emergency__text">
            <span className="vz-emergency__icon"><ServiceAlertTriangleIcon /></span>
            <div>
              <div className="vz-emergency__title">In danger right now?</div>
              <div className="vz-emergency__sub">Do not wait. Call for help.</div>
            </div>
          </div>
          <div className="vz-emergency__btns">
            <a href="tel:911" className="vz-emergency__btn">
              <PhoneCallIcon /> <span>Call <strong>911</strong><small>Police Emergency</small></span>
            </a>
            <a href="tel:117" className="vz-emergency__btn">
              <PhoneCallIcon /> <span>Call <strong>117</strong><small>Women &amp; Children</small></span>
            </a>
          </div>
        </section>

        {/* ── Choices ── */}
        {view === null && (
          <section className="vz-section">
            <h3 className="vz-heading">What do you need help with?</h3>
            <p className="vz-text">Tap one of the big buttons below.</p>

            <div className="vz-choices">
              <button type="button" className="vz-choice" onClick={() => setView("bpo")}>
                <span className="vz-choice__icon vz-choice__icon--teal"><ServiceShieldIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">Someone is hurting me. I need protection.</span>
                  <span className="vz-choice__desc">Get a Protection Order from the Barangay. It is free.</span>
                </span>
                <span className="vz-choice__arrow"><ArrowRight /></span>
              </button>

              <button type="button" className="vz-choice" onClick={() => setView("case")}>
                <span className="vz-choice__icon vz-choice__icon--purple"><PaperIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">I want to report it or file a case.</span>
                  <span className="vz-choice__desc">See what papers to bring and where to go.</span>
                </span>
                <span className="vz-choice__arrow"><ArrowRight /></span>
              </button>

              <button type="button" className="vz-choice" onClick={() => setView("talk")}>
                <span className="vz-choice__icon vz-choice__icon--green"><ChatIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">I want to talk to someone.</span>
                  <span className="vz-choice__desc">Phone numbers of counselors and social workers.</span>
                </span>
                <span className="vz-choice__arrow"><ArrowRight /></span>
              </button>
            </div>
          </section>
        )}

        {/* ── Protection Order ── */}
        {view === "bpo" && (
          <section className="vz-section">
            <BackButton />
            <h3 className="vz-heading">How to get a Protection Order</h3>
            <p className="vz-text">A Protection Order (BPO) is a paper from the Barangay. It orders the other person to stay away from you and not to hurt you or contact or threaten you. You do not have to go to court first. Follow these 5 steps.</p>

            <ol className="vz-steps">
              {BPO_STEPS.map((s, i) => (
                <li className="vz-step" key={s.title}>
                  <span className="vz-step__num">{i + 1}</span>
                  <div>
                    <div className="vz-step__title">{s.title}</div>
                    <div className="vz-step__desc">{s.desc}</div>
                  </div>
                </li>
              ))}
            </ol>

            <div className="vz-note vz-note--good">
              <strong>It is free.</strong> Under RA 9262 (the Anti-VAWC Act of 2004), breaking a BPO is punishable by 30 days in jail.
            </div>
            <BackButton />
          </section>
        )}

        {/* ── File a case ── */}
        {view === "case" && (
          <section className="vz-section">
            <BackButton />
            <h3 className="vz-heading">Papers to bring</h3>
            <p className="vz-text">Tap each paper when you have it. Do not worry if you do not have everything yet. The Barangay Hall can guide you.</p>

            <div className="vz-checklist">
              {CASE_PAPERS.map((r) => (
                <label key={r.id} className={`vz-check${checked[r.id] ? " is-done" : ""}`}>
                  <input
                    type="checkbox"
                    className="vz-check__box"
                    checked={!!checked[r.id]}
                    onChange={(e) => setChecked((p) => ({ ...p, [r.id]: e.target.checked }))}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            <div className="vz-count">{count} of {CASE_PAPERS.length} ready</div>

            <h3 className="vz-heading vz-heading--spaced">Where to go</h3>
            <ul className="vz-where">
              {WHERE_TO_GO.map((w) => (
                <li key={w.place} className="vz-where__item">
                  <span className="vz-where__dot" style={{ background: w.color }} />
                  <span><strong>{w.place}</strong> {w.why}</span>
                </li>
              ))}
            </ul>
            <BackButton />
          </section>
        )}

        {/* ── Talk to someone ── */}
        {view === "talk" && (
          <section className="vz-section">
            <BackButton />
            <h3 className="vz-heading">You are not alone</h3>
            <p className="vz-text">These people are ready to listen. What you tell them is private. Tap a number to call.</p>

            <div className="vz-calls">
              {SUPPORT_LINES.map((h) => (
                <a key={h.name} href={telHref(h.number)} className="vz-call">
                  <span className="vz-call__icon"><HeartIcon /></span>
                  <span className="vz-call__body">
                    <span className="vz-call__name">{h.name}</span>
                    <span className="vz-call__desc">{h.desc}</span>
                  </span>
                  <span className="vz-call__num">
                    {h.number}
                    <small>Tap to call</small>
                  </span>
                </a>
              ))}
            </div>
            <BackButton />
          </section>
        )}

        <div className="bz-legal bd-legal">Legal reference: RA 9262, the Anti-Violence Against Women and Their Children Act of 2004</div>
      </div>
    </div>
  );
}