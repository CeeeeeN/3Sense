import { useState, useEffect } from "react";

// ── BADAC Tab ──
const BADAC_STEPS_DATA = [
  { n: "1", icon: "🏛️", title: "Visit the BADAC Office",     desc: "Go to Barangay 3S+ Hall and look for the BADAC desk. Walk-in only — no appointment needed. All visits are strictly confidential." },
  { n: "2", icon: "📋", title: "Interview & Profiling",       desc: "A trained BADAC officer will conduct a private, non-judgmental interview to understand your situation and needs." },
  { n: "3", icon: "🔬", title: "Free Drug Testing",           desc: "Voluntary and free drug testing is available on-site. Results are confidential and will not be shared without your consent." },
  { n: "4", icon: "🏥", title: "Evaluation at VADAO",         desc: "If needed, you will be referred to VADAO (Valenzuela Anti-Drug Abuse Office) for further evaluation and support planning." },
  { n: "5", icon: "🤝", title: "Rehabilitation (If Needed)",  desc: "Appropriate rehabilitation programs will be recommended. These are voluntary, free, and tailored to your situation." },
];

const BADAC_FAQS_DATA = [
  { q: "Will my information be shared with police?",            a: "No. BADAC strictly follows confidentiality protocols. Your visit and information will not be disclosed to law enforcement without your explicit consent, unless required by a court order." },
  { q: "Is there any fee for BADAC services?",                  a: "All BADAC services are completely FREE — including counseling, drug testing, and rehabilitation referral." },
  { q: "Can I bring someone with me?",                          a: "Yes. You may bring a trusted family member or friend for support. All persons present are required to maintain confidentiality." },
  { q: "What if I am not a drug user but concerned about someone?", a: "You can visit the BADAC office for guidance on how to help a family member or loved one. Concerned citizens are welcome." },
  { q: "What is the difference between BADAC and the police?",  a: "BADAC is a barangay-level welfare body focused on rehabilitation and support — not law enforcement. Visiting BADAC is not the same as surrendering to police." },
];

export default function BADACTab() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="badac-page">
      <div className="svc-hero svc-hero--amber">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BadgeIcon /></span>Barangay Anti-Drug Abuse Council</div>
            <h2 className="svc-hero__title">BADAC — We're Here to Help</h2>
            <p className="svc-hero__abbr">BADAC</p>
            <p className="svc-hero__sub">All information shared with BADAC is strictly confidential. We are here to support, not to judge.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Governed by RA 9165 (Comprehensive Dangerous Drugs Act) · Voluntary participation only
            </div>
          </div>
        </div>
      </div>

      <div className="badac-confidential-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <div>
          <div className="badac-confidential-banner__title">ALL INFORMATION IS STRICTLY CONFIDENTIAL</div>
          <div className="badac-confidential-banner__sub">Your visit, identity, and personal information will never be disclosed without your consent.</div>
        </div>
      </div>

      <div className="badac-hotline-section">
        <div className="badac-hotline-label">BADAC Hotline</div>
        <a href="tel:09000000000" className="badac-hotline-number">(044) 000-0000</a>
        <div className="badac-hotline-sub">Available Monday – Friday · 8:00 AM – 5:00 PM</div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Who Can Avail of BADAC Services?</div>
        <div className="badac-who-grid">
          <div className="badac-who-card"><span className="badac-who-icon">🔞</span><div className="badac-who-title">18 Years Old and Above</div><div className="badac-who-desc">Services are available to adults. Minors must be accompanied by a parent or guardian.</div></div>
          <div className="badac-who-card"><span className="badac-who-icon">🙋</span><div className="badac-who-title">Voluntary Only</div><div className="badac-who-desc">Participation is completely voluntary. No one will be forced to undergo testing or rehabilitation.</div></div>
          <div className="badac-who-card"><span className="badac-who-icon">🏘️</span><div className="badac-who-title">Barangay Residents</div><div className="badac-who-desc">Priority is given to residents of Barangay 3S+ Malanday. Others may be referred to their local BADAC.</div></div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">How It Works — Step by Step</div>
        <div className="badac-steps">
          {BADAC_STEPS_DATA.map((s, i) => (
            <div key={i} className="badac-step">
              <div className="badac-step__left">
                <div className="badac-step__icon-wrap"><span className="badac-step__emoji">{s.icon}</span><div className="badac-step__num">{s.n}</div></div>
                {i < BADAC_STEPS_DATA.length - 1 && <div className="badac-step__connector" />}
              </div>
              <div className="badac-step__body"><div className="badac-step__title">{s.title}</div><div className="badac-step__desc">{s.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-free-banner">
          <div className="badac-free-banner__icon">✅</div>
          <div>
            <div className="badac-free-banner__title">All Services Are FREE</div>
            <div className="badac-free-banner__items">
              {["Counseling & Guidance", "Drug Testing", "VADAO Referral", "Rehabilitation Coordination", "Family Support"].map(item => (
                <span key={item} className="badac-free-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Understanding Drug Abuse</div>
        <div className="badac-edu-grid">
          <div className="badac-edu-card"><div className="badac-edu-card__icon">🧠</div><div className="badac-edu-card__title">It's a Health Issue</div><div className="badac-edu-card__desc">Drug dependency is recognized as a medical condition — not a moral failure. It can happen to anyone and is treatable with proper support.</div></div>
          <div className="badac-edu-card"><div className="badac-edu-card__icon">🔄</div><div className="badac-edu-card__title">Recovery Is Possible</div><div className="badac-edu-card__desc">Many residents have successfully recovered through community-based rehabilitation. Early intervention significantly improves outcomes.</div></div>
          <div className="badac-edu-card"><div className="badac-edu-card__icon">👨‍👩‍👧</div><div className="badac-edu-card__title">Family Support Matters</div><div className="badac-edu-card__desc">Family involvement is one of the strongest factors in successful recovery. BADAC provides guidance for families of affected individuals.</div></div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Frequently Asked Questions</div>
        <div className="badac-faqs">
          {BADAC_FAQS_DATA.map((faq, i) => (
            <div key={i} className={`badac-faq${openFaq === i ? " badac-faq--open" : ""}`}>
              <button className="badac-faq__q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openFaq === i && <div className="badac-faq__a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="badac-section badac-section--last">
        <div className="badac-section__title">Contact & Location</div>
        <div className="badac-contact-card">
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Barangay 3S+ Hall, Malanday, Valenzuela City</span></div>
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Monday – Friday · 8:00 AM – 5:00 PM</span></div>
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg><span>(044) 000-0000</span></div>
        </div>
      </div>
    </div>
  );
}