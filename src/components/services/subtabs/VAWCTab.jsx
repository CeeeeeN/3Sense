import { useState, useEffect } from "react";

// ── VAWC Decision Tree ──
function VAWCDecisionTree() {
  const [step, setStep]               = useState(null);
  const [caseChecked, setCaseChecked] = useState({});

  const CASE_REQS = [
    { id: "id",        label: "Valid Government-Issued ID (UMID, PhilSys, Passport, Driver's License)" },
    { id: "brgy",      label: "Barangay Clearance" },
    { id: "incident",  label: "Incident Report / Narrative (written account of what happened)" },
    { id: "medcert",   label: "Medical Certificate / Medico-Legal Report (from hospital or RHU)" },
    { id: "photos",    label: "Photos of injuries or damaged property (if available)" },
    { id: "witness",   label: "Witness statement or contact information (if applicable)" },
    { id: "affidavit", label: "Sworn Affidavit of Complaint (prepared at the barangay or police station)" },
  ];

  const BPO_STEPS = [
    { n: "1", title: "Go to the Barangay Hall",         desc: "Visit Barangay 3S+ Malanday during office hours. Look for the VAWC Desk or Barangay Secretary." },
    { n: "2", title: "Request a BPO Application Form",  desc: "Ask for a Barangay Protection Order (BPO) form. Fill it out completely. You may ask for assistance from the Barangay Social Worker." },
    { n: "3", title: "Submit the Application",          desc: "Submit the filled-out form along with your valid ID. The BPO is issued ex-parte — the other party does not need to be present." },
    { n: "4", title: "BPO is Issued Within 24 Hours",   desc: "By law (RA 9262), the Punong Barangay must issue the BPO within 24 hours of your application." },
    { n: "5", title: "Keep a Copy Safe",                desc: "Keep your BPO copy on you at all times. Violation of the BPO is punishable by imprisonment." },
  ];

  const HOTLINES = [
    { name: "PNP Emergency Hotline",              number: "911",              type: "emergency" },
    { name: "PNP Women & Children Protection",    number: "117",              type: "emergency" },
    { name: "DSWD Hotline",                       number: "8-888",            type: "support"   },
    { name: "PCW (Philippine Commission on Women)", number: "(02) 8735-1654", type: "support"   },
    { name: "DOH Mental Health Hotline",          number: "1553",             type: "support"   },
    { name: "Barangay 3S+ VAWC Desk",             number: "(044) 000-0000",   type: "local"     },
    { name: "Valenzuela City Social Welfare",     number: "(02) 8292-9200",   type: "local"     },
  ];

  const reset = () => { setStep(null); setCaseChecked({}); };

  if (step === null) return (
    <div className="vawc-tree">
      <div className="vawc-tree__start">
        <div className="vawc-q-icon vawc-q-icon--red"><ServiceAlertTriangleIcon /></div>
        <h3 className="vawc-q-title">Let us help you find the right support.</h3>
        <p className="vawc-q-sub">Answer a few quick questions and we will guide you to the right resources. Your answers are private and not stored.</p>
        <button className="vawc-start-btn" onClick={() => setStep("q1")}>Start ›</button>
      </div>
    </div>
  );

  if (step === "q1") return (
    <div className="vawc-tree">
      <div className="vawc-q-card vawc-q-card--urgent">
        <div className="vawc-q-icon vawc-q-icon--red"><ServiceAlertTriangleIcon /></div>
        <h3 className="vawc-q-title">Are you in immediate danger right now?</h3>
        <p className="vawc-q-sub">If you or your child is being hurt or threatened <strong>right now</strong>, please call for help immediately.</p>
        <div className="vawc-q-choices">
          <div className="vawc-danger-box">
            <div className="vawc-danger-label"><span className="vawc-dot vawc-dot--red" />YES — I am in danger right now</div>
            <div className="vawc-call-buttons">
              <a href="tel:911" className="vawc-call-btn vawc-call-btn--red"><PhoneCallIcon /> Call 911 — PNP Emergency</a>
              <a href="tel:117" className="vawc-call-btn vawc-call-btn--red vawc-call-btn--outline"><PhoneCallIcon /> Call 117 — PNP Women & Children</a>
            </div>
          </div>
          <button className="vawc-choice-btn vawc-choice-btn--safe" onClick={() => setStep("q2")}>
            <span className="vawc-dot vawc-dot--green" />No, I am currently safe — continue
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "q2") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q1")}>‹ Back</button>
      <div className="vawc-q-card">
        <div className="vawc-q-icon vawc-q-icon--teal"><ServiceShieldIcon /></div>
        <h3 className="vawc-q-title">What kind of help do you need?</h3>
        <p className="vawc-q-sub">Choose the option that best describes your situation.</p>
        <div className="vawc-q-choices">
          <button className="vawc-choice-btn" onClick={() => setStep("bpo")}>
            <span className="vawc-choice-letter">A</span>
            <div><div className="vawc-choice-title">I want them to stop hurting me (BPO)</div><div className="vawc-choice-desc">Get a Barangay Protection Order to keep the abuser away</div></div>
          </button>
          <button className="vawc-choice-btn" onClick={() => setStep("case")}>
            <span className="vawc-choice-letter">B</span>
            <div><div className="vawc-choice-title">I want to file a case</div><div className="vawc-choice-desc">Learn requirements for Medical-Legal & Police Blotter</div></div>
          </button>
          <button className="vawc-choice-btn" onClick={() => setStep("talk")}>
            <span className="vawc-choice-letter">C</span>
            <div><div className="vawc-choice-title">I need someone to talk to</div><div className="vawc-choice-desc">Connect with a social worker or counselor</div></div>
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "bpo") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--teal">
          <ServiceShieldIcon />
          <div><div className="vawc-result-title">Barangay Protection Order (BPO)</div><div className="vawc-result-sub">Issued within 24 hours · Free of charge · RA 9262</div></div>
        </div>
        <p className="vawc-result-note">A BPO is a legal order that prohibits the abuser from contacting, threatening, or harming you. It can be issued by the Barangay without needing to go to court first.</p>
        <div className="vawc-steps-list">
          {BPO_STEPS.map(s => (
            <div className="vawc-step-item" key={s.n}>
              <div className="vawc-step-num" style={{ background: "#317D89" }}>{s.n}</div>
              <div><div className="vawc-step-title">{s.title}</div><div className="vawc-step-desc">{s.desc}</div></div>
            </div>
          ))}
        </div>
        <div className="vawc-law-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Under <strong>RA 9262 (Anti-VAWC Act of 2004)</strong>, violation of a BPO is punishable by 30 days imprisonment. This protection is FREE.
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  if (step === "case") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div><div className="vawc-result-title">Filing a Case — Requirements Checklist</div><div className="vawc-result-sub">For Medical-Legal Report & Police Blotter</div></div>
        </div>
        <p className="vawc-result-note">Prepare the following before going to the police station or prosecutor's office.</p>
        <div className="vawc-checklist">
          {CASE_REQS.map(r => (
            <label key={r.id} className={`vawc-check-item${caseChecked[r.id] ? " vawc-check-item--done" : ""}`}>
              <input type="checkbox" checked={!!caseChecked[r.id]} onChange={e => setCaseChecked(p => ({ ...p, [r.id]: e.target.checked }))} className="vawc-checkbox" />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        <div className="vawc-checklist-progress">
          <div className="vawc-checklist-bar">
            <div className="vawc-checklist-fill" style={{ width: `${(Object.values(caseChecked).filter(Boolean).length / CASE_REQS.length) * 100}%` }} />
          </div>
          <span className="vawc-checklist-count">{Object.values(caseChecked).filter(Boolean).length} of {CASE_REQS.length} gathered</span>
        </div>
        <div className="vawc-where-to">
          <div className="vawc-where-title">Where to go:</div>
          <div className="vawc-where-items">
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#317D89" }} />Barangay Hall — for Barangay Blotter & BPO</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#703381" }} />PNP Women & Children Protection Desk — for Police Blotter</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#e03e3e" }} />Nearest Public Hospital / RHU — for Medico-Legal Certificate</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#BDBD64" }} />City Prosecutor's Office — for filing the criminal complaint</div>
          </div>
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  if (step === "talk") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--green">
          <HeartIcon />
          <div><div className="vawc-result-title">You are not alone.</div><div className="vawc-result-sub">Trained counselors and social workers are here for you</div></div>
        </div>
        <p className="vawc-result-note">Reaching out takes courage. The following people and organizations are ready to listen and help — all conversations are confidential.</p>
        <div className="vawc-hotlines-list">
          {HOTLINES.filter(h => h.type === "support" || h.type === "local").map(h => (
            <div className="vawc-hotline-row" key={h.name}>
              <div className="vawc-hotline-icon" style={{ background: h.type === "local" ? "rgba(49,125,137,0.1)" : "rgba(45,177,123,0.1)", color: h.type === "local" ? "#317D89" : "#1e8a5e" }}>
                <PhoneCallIcon />
              </div>
              <div>
                <div className="vawc-hotline-name">{h.name}</div>
                <a href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} className="vawc-hotline-number">{h.number}</a>
              </div>
            </div>
          ))}
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  return null;
}

// ── VAWC Tab ──
export default function VAWCTab() {
  const HOTLINES_ALL = [
    { name: "PNP Emergency",               number: "911",              type: "emergency", desc: "For immediate life-threatening situations" },
    { name: "PNP Women & Children Desk",   number: "117",              type: "emergency", desc: "Specialized assistance for women and children" },
    { name: "DSWD Hotline",                number: "8-888",            type: "support",   desc: "Social welfare and protection services" },
    { name: "DOH Mental Health Hotline",   number: "1553",             type: "support",   desc: "Free mental health counseling, 24/7" },
    { name: "PCW (Phil. Commission on Women)", number: "(02) 8735-1654", type: "support", desc: "Women's rights and gender-based violence" },
    { name: "Barangay 3S+ VAWC Desk",      number: "(044) 000-0000",   type: "local",     desc: "Our barangay's dedicated VAWC officer" },
  ];

  return (
    <div className="vawc-page">
      <div className="svc-hero svc-hero--red">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><ServiceShieldIcon /></span>VAWC Protection</div>
            <h2 className="svc-hero__title">Violence Against Women & Children</h2>
            <p className="svc-hero__abbr">VAWC</p>
            <p className="svc-hero__sub">You deserve to be safe. If you or someone you know is experiencing abuse, help is available — confidentially and for free.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Protected under <strong>RA 9262</strong> — Anti-VAWC Act of 2004
            </div>
          </div>
        </div>
      </div>
      <div className="vawc-hotlines-strip">
        <div className="vawc-hotlines-strip__label"><PhoneCallIcon /> Emergency & Support Hotlines</div>
        <div className="vawc-hotlines-strip__grid">
          {HOTLINES_ALL.map(h => (
            <a key={h.name} href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} className={`vawc-hotline-card vawc-hotline-card--${h.type}`}>
              <div className="vawc-hotline-card__icon"><PhoneCallIcon /></div>
              <div>
                <div className="vawc-hotline-card__number">{h.number}</div>
                <div className="vawc-hotline-card__name">{h.name}</div>
                <div className="vawc-hotline-card__desc">{h.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
      <div className="vawc-section">
        <div className="vawc-section__header">
          <div className="vawc-section__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Guided Help — What Do You Need?
          </div>
          <p className="vawc-section__sub">Answer two short questions and we will show you exactly what to do next.</p>
        </div>
        <VAWCDecisionTree />
      </div>
    </div>
  );
}