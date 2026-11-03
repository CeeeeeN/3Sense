import barangayLogo from "./barangay-logo.jpg";
import { useEffect, useRef } from "react";
import { useLanguage } from "../context/LanguageContext";

// ── DATA ────────────────────────────────────────────────────────────────────

const QR_PATTERN = [
  true,  true,  true,  false, true,
  true,  false, true,  true,  false,
  true,  true,  false, true,  true,
  false, true,  true,  false, true,
  true,  false, true,  true,  true,
];

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function FeatureCard({ icon, bg, title, desc, delay }) {
  return (
    <div
      className="lp-feature-card lp-reveal"
      style={{ transitionDelay: `${delay}s` }}
    >
      <div className="lp-feature-icon" style={{ background: bg }}>
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function HowItWorksStep({ n, title, desc, delay }) {
  return (
    <div
      className="lp-step lp-reveal"
      style={{ transitionDelay: `${delay}s` }}
    >
      <div className="lp-step-num">{n}</div>
      <div className="lp-step-text">
        <h4>{title}</h4>
        <p>{desc}</p>
      </div>
    </div>
  );
}

function AnnouncementItem({ color, text, time }) {
  return (
    <div className="lp-mockup-ann-item">
      <div className="lp-ann-dot" style={{ background: color }} />
      <div>
        <p>{text}</p>
        <span>{time}</span>
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ onLoginClick, onRegisterClick }) {
  const { lang, setLang, t } = useLanguage();
  const navRef = useRef(null);

  const features = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
      bg: "rgba(49,125,137,0.08)",
      title: t("landing_household_mgmt"),
      desc: t("landing_household_mgmt_desc"),
      delay: 0,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#b07800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      bg: "#fff8e6",
      title: t("landing_doc_requests"),
      desc: t("landing_doc_requests_desc"),
      delay: 0.1,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d7a55" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <path d="M14 14h.01M14 17h.01M17 14h.01M20 14h.01M17 17h3v3h-3zM20 17h.01"/>
        </svg>
      ),
      bg: "#edfaf5",
      title: t("landing_qr_verification"),
      desc: t("landing_qr_verification_desc"),
      delay: 0.2,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#703381" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      bg: "#f3eeff",
      title: t("landing_facility_res"),
      desc: t("landing_facility_res_desc"),
      delay: 0.05,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e03e3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
      ),
      bg: "#ffe8e8",
      title: t("landing_emergency_access"),
      desc: t("landing_emergency_access_desc"),
      delay: 0.15,
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a4f8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/>
          <path d="M14 21a2 2 0 0 1-4 0"/>
        </svg>
      ),
      bg: "rgba(26,79,138,0.07)",
      title: t("landing_announcements"),
      desc: t("landing_announcements_desc"),
      delay: 0.25,
    },
  ];

  const announcements = [
    { color: "#317D89", text: t("landing_mockup_ann1"), time: t("landing_mockup_ann1_time") },
    { color: "#e8a020", text: t("landing_mockup_ann2"), time: t("landing_mockup_ann2_time") },
    { color: "#0d7a55", text: t("landing_mockup_ann3"), time: t("landing_mockup_ann3_time") },
  ];

  const howItWorksSteps = [
    {
      n: "1",
      title: t("landing_hiw_step1_title"),
      desc: t("landing_hiw_step1_desc"),
      delay: 0,
    },
    {
      n: "2",
      title: t("landing_hiw_step2_title"),
      desc: t("landing_hiw_step2_desc"),
      delay: 0.1,
    },
    {
      n: "3",
      title: t("landing_hiw_step3_title"),
      desc: t("landing_hiw_step3_desc"),
      delay: 0.2,
    },
    {
      n: "4",
      title: t("landing_hiw_step4_title"),
      desc: t("landing_hiw_step4_desc"),
      delay: 0.3,
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle("scrolled", window.scrollY > 20);
      }
    };
    window.addEventListener("scroll", handleScroll);

    const reveals = document.querySelectorAll(".lp-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleRegister = () => {
    if (onRegisterClick) onRegisterClick();
    else alert(t("register_coming_soon", "Registration coming soon!"));
  };

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav
        className="lp-nav"
        ref={navRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: "#10292D",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2.5rem",
          height: "64px",
        }}
      >
        <div
          className="lp-nav-logo"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <img
            src={barangayLogo}
            alt="Barangay Logo"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
          <div className="lp-nav-logo-text">
            Barangay 3S+ Malanday
            <span className="lp-nav-logo-sub">{t("landing_community_system")}</span>
          </div>
        </div>
        <div className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a className="lp-hide-mobile" onClick={() => scrollTo("features")}>
            {t("landing_features", "Features")}
          </a>
          <a className="lp-hide-mobile" onClick={() => scrollTo("how-it-works")}>
            {t("landing_how_it_works", "How It Works")}
          </a>
          <button
            type="button"
            className="lp-lang-toggle"
            onClick={() => setLang(lang === "en" ? "fil" : "en")}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: "1.5px solid rgba(255, 255, 255, 0.3)",
              background: "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            title="Switch Language / Magpalit ng Wika"
          >
            <span>🌐</span>
            <span>{lang === "en" ? "FIL" : "EN"}</span>
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <h1>
            {t("landing_hero_title")}{" "}
            <span className="highlight">{t("landing_community_system")}</span>
          </h1>
          <p>{t("landing_hero_sub")}</p>
          <div className="lp-hero-cta">
            <button className="lp-btn-primary" onClick={handleRegister}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              {t("landing_register_btn")}
            </button>
            <button className="lp-btn-secondary" onClick={onLoginClick}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {t("landing_login_btn")}
            </button>
          </div>
        </div>

        {/* ── Dashboard Mockup ── */}
        <div className="lp-hero-visual">
          <div style={{ position: "relative", padding: "20px" }}>
            <div className="lp-dashboard-mockup">
              <div className="lp-mockup-topbar">
                <div className="lp-mockup-topbar-left">{t("landing_mockup_dashboard")}</div>
                <div className="lp-mockup-dots">
                  <span /><span /><span />
                </div>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-greeting">{t("landing_mockup_greeting")}</div>
                <div className="lp-mockup-sub">{t("landing_mockup_sub")}</div>
                <div className="lp-mockup-cards">
                  <div className="lp-mockup-card teal">
                    <div className="lp-mockup-card-label">{t("landing_mockup_verified")}</div>
                    <div className="lp-mockup-card-value">12</div>
                  </div>
                  <div className="lp-mockup-card amber">
                    <div className="lp-mockup-card-label">{t("landing_mockup_docs")}</div>
                    <div className="lp-mockup-card-value">3</div>
                  </div>
                  <div className="lp-mockup-card green">
                    <div className="lp-mockup-card-label">{t("landing_mockup_feedback")}</div>
                    <div className="lp-mockup-card-value">5</div>
                  </div>
                  <div className="lp-mockup-card light">
                    <div className="lp-mockup-card-label" style={{ color: "var(--muted)" }}>
                      {t("landing_mockup_status")}
                    </div>
                    <div
                      className="lp-mockup-card-value"
                      style={{ fontSize: "0.85rem", color: "#0d7a55", fontWeight: 700, marginTop: 4 }}
                    >
                      {t("landing_mockup_clear")}
                    </div>
                  </div>
                </div>
                <div className="lp-mockup-announcements">
                  <div className="lp-mockup-ann-header">{t("landing_mockup_announcements")}</div>
                  {announcements.map((item, i) => (
                    <AnnouncementItem key={i} {...item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: "var(--bg)" }}>
        <div className="lp-features">
          <div className="lp-reveal">
            <div className="lp-section-tag">{t("landing_platform_features")}</div>
            <h2 className="lp-section-title">
              {t("landing_features_heading")}
              <br />
              {t("landing_features_heading2")}
            </h2>
            <p className="lp-section-sub">{t("landing_features_sub")}</p>
          </div>
          <div className="lp-features-grid">
            {features.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-hiw">
        <div className="lp-hiw-inner">
          <div>
            <div className="lp-section-tag lp-reveal">{t("landing_how_it_works")}</div>
            <h2 className="lp-section-title lp-reveal">
              {t("landing_hiw_heading")}
            </h2>
            <p className="lp-section-sub lp-reveal">
              {t("landing_hiw_sub")}
            </p>
            <div className="lp-steps">
              {howItWorksSteps.map((s, i) => (
                <HowItWorksStep key={i} {...s} />
              ))}
            </div>
          </div>

          {/* ── QR Profile Mockup ── */}
          <div className="lp-reveal" style={{ display: "flex", justifyContent: "center" }}>
            <div className="lp-qr-mockup">
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  marginBottom: "1.25rem",
                }}
              >
                {t("landing_mockup_qr_title")}
              </div>
              <div className="lp-qr-box">
                {QR_PATTERN.map((filled, i) => (
                  <div key={i} className={`lp-qr-cell${filled ? "" : " empty"}`} />
                ))}
              </div>
              <div className="lp-qr-name">{t("landing_mockup_hh_head")}</div>
              <div className="lp-qr-id">MAL-XXXX-XXXXX · {t("landing_mockup_hh_head")}</div>
              <div className="lp-qr-status">
                <span></span> {t("landing_mockup_verified_resident")}
              </div>
              <div className="lp-qr-meta">
                <div>
                  <div className="lp-qr-meta-label">{t("reg_barangay", "Barangay")}</div>
                  <div className="lp-qr-meta-val">Malanday</div>
                </div>
                <div>
                  <div className="lp-qr-meta-label">{t("landing_mockup_status", "Status")}</div>
                  <div className="lp-qr-meta-val" style={{ color: "#0d7a55" }}>
                    {t("landing_mockup_clear_case")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="db-footer">
        <div className="db-footer-inner">
          <div className="db-footer-top">
            <div className="db-footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Barangay 3S+ Malanday</span>
              <span className="db-footer-divider">|</span>
              <span className="db-footer-tagline">{t("landing_community_system")}</span>
            </div>
            <nav className="db-footer-links">
              <a className="db-footer-link" href="#">{t("footer_privacy")}</a>
              <a className="db-footer-link" href="#">{t("footer_terms")}</a>
              <a className="db-footer-link" href="#">{t("footer_support")}</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>{t("footer_rights", 2026)}</p>
            <p>{t("footer_powered")}</p>
          </div>
        </div>
      </footer>
    </>
  );
}