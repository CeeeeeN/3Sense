import { useState, useEffect, useRef } from "react";
import { ServiceShieldIcon, PhoneCallIcon, ServiceAlertTriangleIcon, HeartIcon } from "../../Icons";
import { useLanguage } from "../../../context/LanguageContext";

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
  const { t } = useLanguage();
  const [view, setView] = useState(null); // null | "bpo" | "case" | "talk"
  const [checked, setChecked] = useState({});
  const topRef = useRef(null);

  // Bring the person back to the top of the content whenever the screen changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view]);

  const count = Object.values(checked).filter(Boolean).length;

  const bpoSteps = [
    { title: t("vawc_bpo_step1_title"), desc: t("vawc_bpo_step1_desc") },
    { title: t("vawc_bpo_step2_title"), desc: t("vawc_bpo_step2_desc") },
    { title: t("vawc_bpo_step3_title"), desc: t("vawc_bpo_step3_desc") },
    { title: t("vawc_bpo_step4_title"), desc: t("vawc_bpo_step4_desc") },
    { title: t("vawc_bpo_step5_title"), desc: t("vawc_bpo_step5_desc") },
  ];

  const casePapers = [
    { id: "id", label: t("vawc_case_paper_id") },
    { id: "brgy", label: t("vawc_case_paper_brgy") },
    { id: "incident", label: t("vawc_case_paper_incident") },
    { id: "medcert", label: t("vawc_case_paper_medcert") },
    { id: "photos", label: t("vawc_case_paper_photos") },
    { id: "witness", label: t("vawc_case_paper_witness") },
    { id: "affidavit", label: t("vawc_case_paper_affidavit") },
  ];

  const whereToGo = [
    { color: "#317D89", place: t("vawc_where_brgy_hall"), why: t("vawc_where_brgy_hall_why") },
    { color: "#703381", place: t("vawc_where_police"), why: t("vawc_where_police_why") },
    { color: "#e03e3e", place: t("vawc_where_hospital"), why: t("vawc_where_hospital_why") },
    { color: "#9a7b00", place: t("vawc_where_prosecutor"), why: t("vawc_where_prosecutor_why") },
  ];

  const supportLines = [
    { name: t("vawc_line_vawc_desk"), number: "(044) 000-0000", desc: t("vawc_line_vawc_desc") },
    { name: t("vawc_line_valenzuela_sw"), number: "(02) 8292-9200", desc: t("vawc_line_valenzuela_desc") },
    { name: t("vawc_line_dswd"), number: "8-888", desc: t("vawc_line_dswd_desc") },
    { name: t("vawc_line_doh"), number: "1553", desc: t("vawc_line_doh_desc") },
    { name: t("vawc_line_pcw"), number: "(02) 8735-1654", desc: t("vawc_line_pcw_desc") },
  ];

  const BackButton = () => (
    <button type="button" className="vz-back" onClick={() => setView(null)}>
      <ArrowLeft /> {t("vawc_back_choices")}
    </button>
  );

  return (
    <div className="vz-page">
      {/* Title */}
      <div className="svc-hero svc-hero--red vz-hero">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><ServiceShieldIcon /></span>{t("vawc_eyebrow")}</div>
            <h2 className="svc-hero__title">{t("vawc_hero_title")}</h2>
            <p className="svc-hero__sub">{t("vawc_sub")}</p>
          </div>
        </div>
      </div>

      <div className="vz-wrap" ref={topRef}>
        {/* The ONLY place the emergency numbers appear */}
        <section className="vz-emergency" aria-label="Emergency">
          <div className="vz-emergency__text">
            <span className="vz-emergency__icon"><ServiceAlertTriangleIcon /></span>
            <div>
              <div className="vz-emergency__title">{t("vawc_emg_title")}</div>
              <div className="vz-emergency__sub">{t("vawc_emg_sub")}</div>
            </div>
          </div>
          <div className="vz-emergency__btns">
            <a href="tel:911" className="vz-emergency__btn">
              <PhoneCallIcon /> <span>{t("vawc_call_911")}<small>{t("vawc_call_911_sub")}</small></span>
            </a>
            <a href="tel:117" className="vz-emergency__btn">
              <PhoneCallIcon /> <span>{t("vawc_call_117")}<small>{t("vawc_call_117_sub")}</small></span>
            </a>
          </div>
        </section>

        {/* ── Choices ── */}
        {view === null && (
          <section className="vz-section">
            <h3 className="vz-heading">{t("vawc_help_title")}</h3>
            <p className="vz-text">{t("vawc_help_sub")}</p>

            <div className="vz-choices">
              <button type="button" className="vz-choice" onClick={() => setView("bpo")}>
                <span className="vz-choice__icon vz-choice__icon--teal"><ServiceShieldIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">{t("vawc_choice_bpo_title")}</span>
                  <span className="vz-choice__desc">{t("vawc_choice_bpo_desc")}</span>
                </span>
                <span className="vz-choice__arrow"><ArrowRight /></span>
              </button>

              <button type="button" className="vz-choice" onClick={() => setView("case")}>
                <span className="vz-choice__icon vz-choice__icon--purple"><PaperIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">{t("vawc_choice_case_title")}</span>
                  <span className="vz-choice__desc">{t("vawc_choice_case_desc")}</span>
                </span>
                <span className="vz-choice__arrow"><ArrowRight /></span>
              </button>

              <button type="button" className="vz-choice" onClick={() => setView("talk")}>
                <span className="vz-choice__icon vz-choice__icon--green"><ChatIcon /></span>
                <span className="vz-choice__body">
                  <span className="vz-choice__title">{t("vawc_choice_talk_title")}</span>
                  <span className="vz-choice__desc">{t("vawc_choice_talk_desc")}</span>
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
            <h3 className="vz-heading">{t("vawc_bpo_heading")}</h3>
            <p className="vz-text">{t("vawc_bpo_desc")}</p>

            <ol className="vz-steps">
              {bpoSteps.map((s, i) => (
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
              <strong>{t("vawc_bpo_free_title")}</strong> {t("vawc_bpo_free_desc")}
            </div>
            <BackButton />
          </section>
        )}

        {/* ── File a case ── */}
        {view === "case" && (
          <section className="vz-section">
            <BackButton />
            <h3 className="vz-heading">{t("vawc_case_heading")}</h3>
            <p className="vz-text">{t("vawc_case_desc")}</p>

            <div className="vz-checklist">
              {casePapers.map((r) => (
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
            <div className="vz-count">
              {typeof t("vawc_case_count") === "function" ? t("vawc_case_count")(count, casePapers.length) : `${count} of ${casePapers.length} ready`}
            </div>

            <h3 className="vz-heading vz-heading--spaced">{t("vawc_where_heading")}</h3>
            <ul className="vz-where">
              {whereToGo.map((w) => (
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
            <h3 className="vz-heading">{t("vawc_talk_heading")}</h3>
            <p className="vz-text">{t("vawc_talk_desc")}</p>

            <div className="vz-calls">
              {supportLines.map((h) => (
                <a key={h.name} href={telHref(h.number)} className="vz-call">
                  <span className="vz-call__icon"><HeartIcon /></span>
                  <span className="vz-call__body">
                    <span className="vz-call__name">{h.name}</span>
                    <span className="vz-call__desc">{h.desc}</span>
                  </span>
                  <span className="vz-call__num">
                    {h.number}
                    <small>{t("vawc_talk_tap")}</small>
                  </span>
                </a>
              ))}
            </div>
            <BackButton />
          </section>
        )}

        <div className="bz-legal bd-legal">{t("vawc_legal")}</div>
      </div>
    </div>
  );
}
