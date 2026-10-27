import { useState, useEffect } from "react";
import { getMemberProfile } from "../services/profile";
import { ProgramsIcon, EquipmentIcon, FacilitiesIcon, DocumentsIcon, ServicesMenuIcon } from "../components/Icons";
import { useLanguage } from "../context/LanguageContext";

import ProgramsTab from "../components/services/ProgramsTab";
import FacilitiesTab from "../components/services/FacilitiesTab";
import DocumentsTab from "../components/services/DocumentsTab";
import ServicesTab from "../components/services/ServicesTab";
import EquipmentTab from "../components/services/EquipmentTab";

export default function ServicesPage({ onNavigate, householdID, memberID, userName, userID }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("services");

  const TABS = [
    { key: "services",   label: t('services_tab_services'),   icon: <ServicesMenuIcon /> },
    { key: "programs",   label: t('services_tab_programs'),   icon: <ProgramsIcon />     },
    { key: "facilities", label: t('services_tab_facilities'), icon: <FacilitiesIcon />   },
    { key: "documents",  label: t('services_tab_documents'),  icon: <DocumentsIcon />    },
    { key: "equipment",  label: t('services_tab_equipment'),  icon: <EquipmentIcon />   },
  ];

  // Hold the user's profile data
  const [userData, setUserData] = useState(null);

  // Fetch profile data on mount
  useEffect(() => {
    if (householdID && memberID) {
      getMemberProfile(householdID, memberID)
        .then(data => setUserData({
          ...data,
          residentID: memberID,   // Firestore doc ID (used for request submissions)
          // data.userID is the Firebase Auth UID already returned from getMemberProfile
        }))
        .catch(console.error);
    }
  }, [householdID, memberID, userID]);

  return (
    <main className="db-page sv-page">
      {/* ── HEADER BANNER ── */}
      <div className="db-welcome-banner">
        <div className="db-welcome-banner-inner">
          <div className="db-welcome-left">
            <div className="db-welcome-eyebrow">{t('services_eyebrow')}</div>
            <h1 className="db-welcome-heading">{t('services_heading_start')}<span>{t('services_heading_end')}</span></h1>
            <p className="db-welcome-sub">{t('services_sub')}</p>
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
                  <div><div className="sc-card-title">{t('services_programs_title')}</div><div className="sc-card-subtitle">{t('services_programs_sub')}</div></div>
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
                  <div><div className="sc-card-title">{t('services_facilities_title')}</div><div className="sc-card-subtitle">{t('services_facilities_sub')}</div></div>
                </div>
              </div>
              <FacilitiesTab userData={userData} householdID={householdID} userName={userName} userID={userID} />
            </>
          )}

          {activeTab === "documents" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><DocumentsIcon /></div>
                  <div><div className="sc-card-title">{t('services_documents_title')}</div><div className="sc-card-subtitle">{t('services_documents_sub')}</div></div>
                </div>
              </div>
              <DocumentsTab userData={userData} householdID={householdID} userName={userName} userID={userID} />
            </>
          )}

          {activeTab === "equipment" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><EquipmentIcon /></div>
                  <div><div className="sc-card-title">{t('services_equipment_title')}</div><div className="sc-card-subtitle">{t('services_equipment_sub')}</div></div>
                </div>
              </div>
              <EquipmentTab userData={userData} householdID={householdID} userName={userName} userID={userID} />
            </>
          )}

          {activeTab === "services" && (
            <ServicesTab userData={userData} householdID={householdID} userName={userName} userID={userID} />
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
              <a className="db-footer-link" href="#">{t('footer_privacy')}</a>
              <a className="db-footer-link" href="#">{t('footer_terms')}</a>
              <a className="db-footer-link" href="#">{t('footer_support')}</a>
            </nav>
          </div>
          <div className="db-footer-bottom">
            <p>{t('footer_rights', new Date().getFullYear())}</p>
            <p>{t('footer_powered')}</p>
          </div>
        </div>
      </footer>
    </main>
  );
}