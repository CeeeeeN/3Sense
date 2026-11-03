import { UsersIcon } from "../../Icons";
import { useLanguage } from "../../../context/LanguageContext";

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
  const { t } = useLanguage();

  const facts = [
    { icon: "age",   label: t("bosca_fact_who_label"),   value: t("bosca_fact_who_val") },
    { icon: "place", label: t("bosca_fact_where_label"), value: t("bosca_fact_where_val") },
    { icon: "id",    label: t("bosca_fact_bring_label"), value: t("bosca_fact_bring_val") },
  ];

  const joinSteps = [
    { title: t("bosca_step1_title"), desc: t("bosca_step1_desc") },
    { title: t("bosca_step2_title"), desc: t("bosca_step2_desc") },
    { title: t("bosca_step3_title"), desc: t("bosca_step3_desc") },
    { title: t("bosca_step4_title"), desc: t("bosca_step4_desc") },
  ];

  const benefits = [
    { title: t("bosca_b1_title"), desc: t("bosca_b1_desc") },
    { title: t("bosca_b2_title"), desc: t("bosca_b2_desc") },
    { title: t("bosca_b3_title"), desc: t("bosca_b3_desc") },
    { title: t("bosca_b4_title"), desc: t("bosca_b4_desc") },
    { title: t("bosca_b5_title"), desc: t("bosca_b5_desc") },
    { title: t("bosca_b6_title"), desc: t("bosca_b6_desc") },
    { title: t("bosca_b7_title"), desc: t("bosca_b7_desc") },
  ];

  return (
    <div className="bz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--purple bz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><UsersIcon /></span>{t("bosca_eyebrow")}</div>
            <h2 className="svc-hero__title">{t("bosca_hero_title")}</h2>
            <p className="svc-hero__sub">{t("bosca_sub")}</p>
          </div>
        </div>
      </div>

      <div className="bz-wrap">
        {/* At a glance */}
        <section className="bz-glance" aria-label={t("bosca_fact_who_label")}>
          {facts.map((f) => (
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
          <h3 className="bz-heading">{t("bosca_join_heading")}</h3>
          <p className="bz-text">{t("bosca_join_sub")}</p>
          <ol className="bz-steps">
            {joinSteps.map((s, i) => (
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
          <h3 className="bz-heading">{t("bosca_benefits_heading")}</h3>
          <p className="bz-text">{t("bosca_benefits_sub")}</p>
          <ul className="bz-benefits">
            {benefits.map((b) => (
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
              <strong>{t("bosca_osca_note_strong")}</strong> {t("bosca_osca_note_text")}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bz-card bz-card--about">
          <h3 className="bz-heading">{t("bosca_about_heading")}</h3>
          <p className="bz-text">{t("bosca_about_p1")}</p>
          <p className="bz-text bz-text--last">
            {t("bosca_about_p2_pre")}<strong>{t("bosca_about_p2_strong")}</strong>{t("bosca_about_p2_post")}
          </p>
          <div className="bz-legal">{t("bosca_legal")}</div>
        </section>
      </div>
    </div>
  );
}
