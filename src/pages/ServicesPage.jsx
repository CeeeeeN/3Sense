import { useState, useEffect } from "react";
import { getMemberProfile } from "../services/profile";
import { ProgramsIcon, FacilitiesIcon, DocumentsIcon, ServicesMenuIcon } from "../components/Icons";

// --- IMPORT YOUR NEW SEPARATED COMPONENTS ---
import ProgramsTab from "../components/services/ProgramsTab";
import FacilitiesTab from "../components/services/FacilitiesTab";
import DocumentsTab from "../components/services/DocumentsTab";
import ServicesTab from "../components/services/ServicesTab";

// ── Main Tabs ──
const TABS = [
  { key: "services",   label: "Services",   icon: <ServicesMenuIcon /> },
  { key: "programs",   label: "Programs",   icon: <ProgramsIcon />     },
  { key: "facilities", label: "Facilities", icon: <FacilitiesIcon />   },
  { key: "documents",  label: "Documents",  icon: <DocumentsIcon />    },
];

export default function ServicesPage({ onNavigate, householdID, memberID, userName }) {
  const [activeTab, setActiveTab] = useState("services");

  // Hold the user's profile data
  const [userData, setUserData] = useState(null);

  // Fetch profile data on mount
  useEffect(() => {
    if (householdID && memberID) {
      getMemberProfile(householdID, memberID)
        .then(data => setUserData(data))
        .catch(console.error);
    }
  }, [householdID, memberID]);

  return (
    <main className="db-page sv-page">
      {/* ── HEADER BANNER ── */}
      <div className="db-welcome-banner">
        <div className="db-welcome-banner-inner">
          <div className="db-welcome-left">
            <div className="db-welcome-eyebrow">Barangay Services</div>
            <h1 className="db-welcome-heading">What can we <span>help you with?</span></h1>
            <p className="db-welcome-sub">Access services, programs, facilities, and documents all in one place.</p>
          </div>
        </div>
      </div>

      <div className="db-content sv-content">
        <div className="sc-card sc-card--tabbed">
          
          {/* ── TAB BAR ── */}
          <div className="sv-tab-bar">
            <div className="sv-tab-bar-inner">
              {TABS.map(t => (
                <button key={t.key} className={`sv-tab${activeTab === t.key ? " sv-tab--active" : ""}`} onClick={() => setActiveTab(t.key)}>
                  <span className="sv-tab-icon">{t.icon}</span>
                  <span className="sv-tab-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── TAB CONTENT ROUTER ── */}
          {activeTab === "programs" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><ProgramsIcon /></div>
                  <div><div className="sc-card-title">Barangay Programs</div><div className="sc-card-subtitle">Active programs available to residents</div></div>
                </div>
              </div>
              <ProgramsTab userData={userData} />
            </>
          )}

          {activeTab === "facilities" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><FacilitiesIcon /></div>
                  <div><div className="sc-card-title">Barangay Facilities</div><div className="sc-card-subtitle">Check availability and reserve a facility</div></div>
                </div>
              </div>
              <FacilitiesTab userData={userData} householdID={householdID} userName={userName} userID={memberID} />
            </>
          )}

          {activeTab === "documents" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><DocumentsIcon /></div>
                  <div><div className="sc-card-title">Document Requests</div><div className="sc-card-subtitle">Request official barangay documents online</div></div>
                </div>
              </div>
              <DocumentsTab userData={userData} householdID={householdID} userName={userName} userID={memberID} />
            </>
          )}

          {activeTab === "services" && (
            <ServicesTab userData={userData} householdID={householdID} userName={userName} userID={memberID} />
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="db-footer">
        <div className="db-footer-inner">
          <div className="db-footer-top">
            <div className="db-footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
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
    </main>
  );
}