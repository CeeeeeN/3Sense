import barangayLogo from "./barangay-logo.jpg";
import { useEffect, useRef } from "react";

// ── DATA ────────────────────────────────────────────────────────────────────

const QR_PATTERN = [
  true,  true,  true,  false, true,
  true,  false, true,  true,  false,
  true,  true,  false, true,  true,
  false, true,  true,  false, true,
  true,  false, true,  true,  true,
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    bg: "rgba(49,125,137,0.08)",
    title: "Household Management",
    desc: "Register and manage your household profile. Add members, update information, and maintain a complete household record.",
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
    title: "Document Requests",
    desc: "Request barangay clearances, certificates, and other documents online. Track status in real time without visiting the office.",
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
    title: "QR Verification",
    desc: "Scan official barangay QR codes to verify your visit and unlock the feedback system for continuous service improvement.",
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
    title: "Facility Reservations",
    desc: "Book the Barangay Multi-Purpose Hall and other facilities. Check real-time availability and submit reservations for approval.",
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
    title: "Emergency Access",
    desc: "One-tap access to emergency hotlines, evacuation guidelines, and disaster protocols whenever you need them most.",
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
    title: "Category-Based Announcements",
    desc: "Receive personalized announcements based on your category. Stay informed about relevant news, events, and updates in your community.",
    delay: 0.25,
  },
];

const ANNOUNCEMENTS = [
  { color: "#317D89", text: "Free Medical Mission – Feb 22",    time: "2 hours ago" },
  { color: "#e8a020", text: "Scholarship Applications Open",    time: "Yesterday"   },
  { color: "#0d7a55", text: "Barangay Clean-Up Drive",          time: "Feb 17"      },
];

const HOW_IT_WORKS_STEPS = [
  {
    n: "1",
    title: "Register Your Household",
    desc: "Fill out the household registration form with your personal and address details. Submit for Barangay review and approval.",
    delay: 0,
  },
  {
    n: "2",
    title: "Activate Your Account",
    desc: "Once approved, use your assigned Household ID to activate your account, set your password, and add household members.",
    delay: 0.1,
  },
  {
    n: "3",
    title: "Login & Set Your PIN",
    desc: "Log in with your Household ID and password, then set a secure 4-digit PIN for quick and easy access.",
    delay: 0.2,
  },
  {
    n: "4",
    title: "Access All Barangay Services",
    desc: "Request documents, reserve facilities, scan QR codes, submit feedback, and stay updated — all from your dashboard.",
    delay: 0.3,
  },
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
  const navRef = useRef(null);

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
    else alert("Registration coming soon!");
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
            <span className="lp-nav-logo-sub">Community Management System</span>
          </div>
        </div>
        <div className="lp-nav-links">
          <a className="lp-hide-mobile" onClick={() => scrollTo("features")}>
            Features
          </a>
          <a className="lp-hide-mobile" onClick={() => scrollTo("how-it-works")}>
            How It Works
          </a>
          <button className="lp-btn-nav" onClick={onLoginClick}>
            Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <h1>
            Welcome to 3S Sense{" "}
            <span className="highlight">Community Management System</span>
          </h1>
          <p>
            Manage your household profile, access barangay services, and monitor
            your records securely.
          </p>
          <div className="lp-hero-cta">
            <button className="lp-btn-primary" onClick={handleRegister}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Register Household
            </button>
            <button className="lp-btn-secondary" onClick={onLoginClick}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Login to Account
            </button>
          </div>
        </div>

        {/* ── Dashboard Mockup ── */}
        <div className="lp-hero-visual">
          <div style={{ position: "relative", padding: "20px" }}>
            <div className="lp-dashboard-mockup">
              <div className="lp-mockup-topbar">
                <div className="lp-mockup-topbar-left">My Dashboard</div>
                <div className="lp-mockup-dots">
                  <span /><span /><span />
                </div>
              </div>
              <div className="lp-mockup-body">
                <div className="lp-mockup-greeting">Good Morning!</div>
                <div className="lp-mockup-sub">
                  Here's what's happening in your barangay today.
                </div>
                <div className="lp-mockup-cards">
                  <div className="lp-mockup-card teal">
                    <div className="lp-mockup-card-label">Verified Visits</div>
                    <div className="lp-mockup-card-value">12</div>
                  </div>
                  <div className="lp-mockup-card amber">
                    <div className="lp-mockup-card-label">Doc Requests</div>
                    <div className="lp-mockup-card-value">3</div>
                  </div>
                  <div className="lp-mockup-card green">
                    <div className="lp-mockup-card-label">Feedback</div>
                    <div className="lp-mockup-card-value">5</div>
                  </div>
                  <div className="lp-mockup-card light">
                    <div className="lp-mockup-card-label" style={{ color: "var(--muted)" }}>
                      Status
                    </div>
                    <div
                      className="lp-mockup-card-value"
                      style={{ fontSize: "0.85rem", color: "#0d7a55", fontWeight: 700, marginTop: 4 }}
                    >
                      ✓ Clear
                    </div>
                  </div>
                </div>
                <div className="lp-mockup-announcements">
                  <div className="lp-mockup-ann-header">Announcements</div>
                  {ANNOUNCEMENTS.map((item, i) => (
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
            <div className="lp-section-tag">Platform Features</div>
            <h2 className="lp-section-title">
              Everything your household needs,
              <br />
              in one place.
            </h2>
            <p className="lp-section-sub">
              3S+ brings barangay services to your fingertips — from document
              requests to emergency alerts.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={i} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-hiw">
        <div className="lp-hiw-inner">
          <div>
            <div className="lp-section-tag lp-reveal">How It Works</div>
            <h2 className="lp-section-title lp-reveal">
              Get started in a few simple steps.
            </h2>
            <p className="lp-section-sub lp-reveal">
              From registration to full access — the process is designed to be
              smooth and transparent.
            </p>
            <div className="lp-steps">
              {HOW_IT_WORKS_STEPS.map((s, i) => (
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
                Personal QR Code
              </div>
              <div className="lp-qr-box">
                {QR_PATTERN.map((filled, i) => (
                  <div key={i} className={`lp-qr-cell${filled ? "" : " empty"}`} />
                ))}
              </div>
              <div className="lp-qr-name">Household Head</div>
              <div className="lp-qr-id">MAL-XXXX-XXXXX · Household Head</div>
              <div className="lp-qr-status">
                <span></span> Verified Resident
              </div>
              <div className="lp-qr-meta">
                <div>
                  <div className="lp-qr-meta-label">Barangay</div>
                  <div className="lp-qr-meta-val">Malanday</div>
                </div>
                <div>
                  <div className="lp-qr-meta-label">Status</div>
                  <div className="lp-qr-meta-val" style={{ color: "#0d7a55" }}>
                    Clear Case
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
              <span className="db-footer-tagline">Community Management System</span>
            </div>
            <nav className="db-footer-links">
              <a className="db-footer-link" href="#">Privacy Policy</a>
              <a className="db-footer-link" href="#">Terms of Use</a>
              <a className="db-footer-link" href="#">Contact Support</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>© 2026 Barangay 3S+ Malanday. All rights reserved.</p>
            <p>Powered by the Barangay 3S+ Community Management System</p>
          </div>
        </div>
      </footer>
    </>
  );
}