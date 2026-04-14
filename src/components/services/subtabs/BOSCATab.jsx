import { useState, useEffect } from "react";

// ── BOSCA Tab ──
export default function BOSCATab() {
  const BENEFITS = [
    "20% discount on medicines, medical services, and basic necessities",
    "Free medical and dental consultations at public health centers",
    "Priority lane in government offices and establishments",
    "Monthly Social Pension (for indigent senior citizens through DSWD)",
    "Income tax exemption on pension income",
    "Free transportation in government-owned public conveyances",
    "Discounts on leisure, recreation, and entertainment",
  ];

  return (
    <div className="bosca-page">
      <div className="svc-hero svc-hero--purple">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><UsersIcon /></span>Senior Citizens Association</div>
            <h2 className="svc-hero__title">Barangay Office for Senior Citizens Association</h2>
            <p className="svc-hero__abbr">BOSCA</p>
            <p className="svc-hero__sub">Serving and uplifting the dignity, rights, and welfare of senior citizens in our barangay community.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Governed by <strong>RA 9994</strong> & <strong>RA 7876</strong> — Senior Citizens Acts
            </div>
          </div>
        </div>
      </div>
      <div className="bosca-section">
        <div className="bosca-section__title">What is BOSCA?</div>
        <p className="bosca-section__body">BOSCA (Barangay Office for Senior Citizens Association) is the official senior citizens organization of Barangay 3S+ Malanday. It serves as the primary body that advocates for the rights, welfare, and active participation of elderly residents in barangay life.</p>
        <p className="bosca-section__body">Membership is open to all residents who are <strong>60 years old and above</strong>. The association coordinates directly with the Barangay Social Welfare and Development (BSWD) officer and the Barangay Council.</p>
        <div className="bosca-how-join">
          <div className="bosca-how-join__title">How to Join BOSCA</div>
          <div className="bosca-join-steps">
            <div className="bosca-join-step"><span className="bosca-join-num">1</span><span>Visit the Barangay Hall and ask for the BOSCA Membership Form</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">2</span><span>Bring a valid ID and proof of age (birth certificate or senior citizen ID)</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">3</span><span>Submit the completed form to the Barangay Social Welfare Desk</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">4</span><span>Receive your BOSCA membership card and OSCA ID</span></div>
          </div>
        </div>
      </div>
      <div className="bosca-section">
        <div className="bosca-section__title">Senior Citizen Benefits Under RA 9994</div>
        <p className="bosca-section__body">All registered senior citizens are entitled to the following benefits by law:</p>
        <ul className="bosca-benefits-list">
          {BENEFITS.map((b, i) => (
            <li key={i} className="bosca-benefit-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {b}
            </li>
          ))}
        </ul>
        <div className="bosca-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          To avail benefits, senior citizens must carry their OSCA ID. Lost or expired IDs may be renewed at the Barangay Hall.
        </div>
      </div>
    </div>
  );
}

