import { UsersIcon } from "../../Icons";

// ── Content ──────────────────────────────────────────────────────────────────
const FACTS = [
  { icon: "age",   label: "Who can join",   value: "Residents 60 years old and above" },
  { icon: "place", label: "Where to go",    value: "Barangay Hall, Social Welfare Desk" },
  { icon: "id",    label: "What to bring",  value: "Valid ID and proof of age" },
];

const JOIN_STEPS = [
  { title: "Go to the Barangay Hall",    desc: "Ask for the BOSCA Membership Form." },
  { title: "Bring your papers",          desc: "A valid ID and proof of age (birth certificate or senior citizen ID)." },
  { title: "Hand in the filled-out form", desc: "Give it to the Barangay Social Welfare Desk." },
  { title: "Get your cards",             desc: "You will receive your BOSCA membership card and OSCA ID." },
];

const BENEFITS = [
  { title: "20% discount",              desc: "on medicines, medical services, and basic necessities" },
  { title: "Free check-ups",            desc: "medical and dental consultations at public health centers" },
  { title: "Priority lane",             desc: "in government offices and establishments" },
  { title: "Monthly Social Pension",    desc: "for indigent senior citizens, through DSWD" },
  { title: "Income tax exemption",      desc: "on pension income" },
  { title: "Free transportation",       desc: "in government-owned public vehicles" },
  { title: "Discounts on leisure",      desc: "recreation and entertainment" },
];

// ── Small icons ──────────────────────────────────────────────────────────────
const svgProps = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

const FactIcon = ({ type }) => {
  if (type === "place") return (
    <svg {...svgProps}><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></svg>
  );
  if (type === "id") return (
    <svg {...svgProps}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16c.6-1.4 1.8-2 3-2s2.4.6 3 2" /><line x1="15" y1="10" x2="18" y2="10" /><line x1="15" y1="14" x2="18" y2="14" /></svg>
  );
  return <UsersIcon />;
};

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
);

// ── BOSCA Tab ────────────────────────────────────────────────────────────────
export default function BOSCATab() {
  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--purple">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><UsersIcon /></span>BOSCA</div>
            <h2 className="svc-hero__title">Barangay Office for Senior Citizens Association</h2>
            <p className="svc-hero__sub">Get information and assistance regarding senior citizen benefits, privileges, programs, and other services that support older persons in the community.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Legal references: RA 9994 and RA 7876 <strong> — </strong> Senior Citizens and Senior Citizens Center Acts
            </div>
          </div>
        </div>
      </div>


      <div className="bz-wrap">
        {/* At a glance */}
        <section className="bz-glance" aria-label="Quick facts">
          {FACTS.map((f) => (
            <div className="bz-fact" key={f.label}>
              <span className="bz-fact__icon"><FactIcon type={f.icon} /></span>
              <div>
                <div className="bz-fact__label">{f.label}</div>
                <div className="bz-fact__value">{f.value}</div>
              </div>
            </div>
          ))}
        </section>

        {/* How to join */}
        <section className="bz-card">
          <h3 className="bz-heading">How to join BOSCA</h3>
          <p className="bz-text">Follow these 4 steps.</p>
          <ol className="bz-steps">
            {JOIN_STEPS.map((s, i) => (
              <li className="bz-step" key={s.title}>
                <span className="bz-step__num">{i + 1}</span>
                <div>
                  <div className="bz-step__title">{s.title}</div>
                  <div className="bz-step__desc">{s.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Benefits */}
        <section className="bz-card">
          <h3 className="bz-heading">Your benefits as a senior citizen</h3>
          <p className="bz-text">Every registered senior citizen is entitled to these by law (RA 9994).</p>
          <ul className="bz-benefits">
            {BENEFITS.map((b) => (
              <li className="bz-benefit" key={b.title}>
                <span className="bz-benefit__check"><CheckIcon /></span>
                <div>
                  <div className="bz-benefit__title">{b.title}</div>
                  <div className="bz-benefit__desc">{b.desc}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="bz-note">
            <AlertIcon />
            <div>
              <strong>Always bring your OSCA ID</strong> to get these benefits. If your ID is lost or expired, you can renew it at the Barangay Hall.
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bz-card bz-card--about">
          <h3 className="bz-heading">About BOSCA</h3>
          <p className="bz-text">
            BOSCA, the Barangay Office for Senior Citizens Association, is the official senior citizens organization of Barangay 3S+ Malanday. It speaks up for the rights, welfare, and active participation of older residents in barangay life.
          </p>
          <p className="bz-text bz-text--last">
            Anyone <strong>60 years old and above</strong> can join. BOSCA works directly with the Barangay Social Welfare and Development (BSWD) officer and the Barangay Council.
          </p>
          <div className="bz-legal">Legal basis: RA 9994 (Expanded Senior Citizens Act) and RA 7876 (Senior Citizens Center Act)</div>
        </section>
      </div>
    </div>
  );
}