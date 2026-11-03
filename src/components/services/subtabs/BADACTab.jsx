import { useState } from "react";
import { BadgeIcon } from "../../Icons";
import { useLanguage } from "../../../context/LanguageContext";

const PHONE = "(044) 000-0000";
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

// ── BADAC Tab ────────────────────────────────────────────────────────────────
export default function BADACTab() {
  const { t } = useLanguage();
  const [openFaq, setOpenFaq] = useState(null);

  const facts = [
    { icon: "gift", label: t("badac_fact_cost_label"), value: t("badac_fact_cost_val") },
    { icon: "lock", label: t("badac_fact_privacy_label"), value: t("badac_fact_privacy_val") },
    { icon: "door", label: t("badac_fact_visit_label"), value: t("badac_fact_visit_val") },
  ];

  const steps = [
    { icon: "building", title: t("badac_step1_title"), desc: t("badac_step1_desc") },
    { icon: "clipboard", title: t("badac_step2_title"), desc: t("badac_step2_desc") },
    { icon: "flask", title: t("badac_step3_title"), desc: t("badac_step3_desc") },
    { icon: "clinic", title: t("badac_step4_title"), desc: t("badac_step4_desc") },
    { icon: "heart", title: t("badac_step5_title"), desc: t("badac_step5_desc") },
  ];

  const who = [
    { icon: "user", title: t("badac_who1_title"), desc: t("badac_who1_desc") },
    { icon: "check", title: t("badac_who2_title"), desc: t("badac_who2_desc") },
    { icon: "home", title: t("badac_who3_title"), desc: t("badac_who3_desc") },
  ];

  const freeItems = [
    t("badac_free_counseling"),
    t("badac_free_drug_test"),
    t("badac_free_vadao"),
    t("badac_free_rehab"),
    t("badac_free_family"),
  ];

  const edu = [
    { icon: "pulse", title: t("badac_edu1_title"), desc: t("badac_edu1_desc") },
    { icon: "refresh", title: t("badac_edu2_title"), desc: t("badac_edu2_desc") },
    { icon: "family", title: t("badac_edu3_title"), desc: t("badac_edu3_desc") },
  ];

  const faqs = [
    { q: t("badac_faq1_q"), a: t("badac_faq1_a") },
    { q: t("badac_faq2_q"), a: t("badac_faq2_a") },
    { q: t("badac_faq3_q"), a: t("badac_faq3_a") },
    { q: t("badac_faq4_q"), a: t("badac_faq4_a") },
    { q: t("badac_faq5_q"), a: t("badac_faq5_a") },
  ];

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--amber bz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BadgeIcon /></span>{t("badac_eyebrow")}</div>
            <h2 className="svc-hero__title">{t("badac_hero_title")}</h2>
            <p className="svc-hero__sub">{t("badac_sub")}</p>
          </div>
        </div>
      </div>

      <div className="bz-wrap">
        {/* Quick facts */}
        <section className="bz-glance" aria-label={t("badac_facts_title")}>
          {facts.map((f, i) => (
            <div className="bz-fact" key={i}>
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
              <h3 className="bz-heading">{t("badac_contact_heading")}</h3>
              <p className="bz-text bd-contact__text">{t("badac_contact_sub")}</p>
            </div>
            <a href={telHref(PHONE)} className="bd-callbtn">
              <Ico size={24}>{ICONS.phone}</Ico>
              <span>
                <small>{t("badac_contact_tap")}</small>
                {PHONE}
              </span>
            </a>
          </div>
          <div className="bd-contact__rows">
            <div className="bd-contact__row"><span className="bd-contact__icon"><Ico size={22}>{ICONS.clock}</Ico></span>{t("badac_contact_hours")}</div>
            <div className="bd-contact__row"><span className="bd-contact__icon"><Ico size={22}>{ICONS.pin}</Ico></span>{t("badac_contact_address")}</div>
          </div>
        </section>

        {/* How it works */}
        <section className="bz-card">
          <h3 className="bz-heading">{t("badac_steps_heading")}</h3>
          <p className="bz-text">{t("badac_steps_sub")}</p>
          <ol className="bd-steps">
            {steps.map((s, i) => (
              <li className="bd-step" key={i}>
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
          <h3 className="bz-heading">{t("badac_who_heading")}</h3>
          <div className="bd-grid bd-grid--3">
            {who.map((w, i) => (
              <div className="bd-tile" key={i}>
                <span className="bd-tile__icon"><Ico size={28}>{ICONS[w.icon]}</Ico></span>
                <div className="bd-tile__title">{w.title}</div>
                <div className="bd-tile__desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Free services */}
        <section className="bz-card">
          <h3 className="bz-heading">{t("badac_free_heading")}</h3>
          <ul className="bd-free">
            {freeItems.map((item, i) => (
              <li className="bd-free__item" key={i}>
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
          <h3 className="bz-heading">{t("badac_edu_heading")}</h3>
          <div className="bd-grid bd-grid--3">
            {edu.map((e, i) => (
              <div className="bd-tile bd-tile--soft" key={i}>
                <span className="bd-tile__icon bd-tile__icon--teal"><Ico size={28}>{ICONS[e.icon]}</Ico></span>
                <div className="bd-tile__title">{e.title}</div>
                <div className="bd-tile__desc">{e.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bz-card">
          <h3 className="bz-heading">{t("badac_faq_heading")}</h3>
          <p className="bz-text">{t("badac_faq_sub")}</p>
          <div className="bd-faqs">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className={`bd-faq${open ? " is-open" : ""}`}>
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
        <div className="bz-legal bd-legal">{t("badac_legal")}</div>
      </div>
    </div>
  );
}
