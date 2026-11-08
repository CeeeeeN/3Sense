import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./Navbar";
import { getMemberProfile, updateMemberProfile } from "../services/profile";
import { fetchUserTransactions } from "../services/services";
import QRCode from "qrcode";

import TransferHouseholdModal from "../components/TransferHouseholdModal";
import TransferHeadModal from "../components/TransferHeadModal";
import TransferBranchHeadModal from "../components/TransferBranchHeadModal";
import RemoveMemberModal from "../components/RemoveMemberModal";
import { useLanguage } from "../context/LanguageContext";

const CATS = ["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"];

const BLANK = {
  firstName: "", middleName: "", lastName: "", suffix: "",
  birthDate: "", birthPlace: "", sex: "Male", gender: "", genderOther: "", civilStatus: "",
  citizenship: "", religion: "", contactNumber: "", email: "", residingSinceYear: "",
  houseNumber: "", street: "", region: "NCR", province: "Metro Manila", city: "Valenzuela City", barangay: "Malanday",
  sameAddress: false,
  categories: [],
  pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
  educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
  totalMembers: "", householdClassification: "",
};

// ── UID GENERATOR FALLBACK ──
const generateResidentUID = () => {
  const year = new Date().getFullYear();
  const timeSlice = Date.now().toString().slice(-4);
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  return `MAL-${year}-${timeSlice}${random4}`;
};

// ── Icons ──
const IconCamera = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const IconUpload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const IconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const ProfileIconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const ProfileIconPin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconTag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
const IconGrad = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
const IconHome2 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const ProfileIconShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IconHistory = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4.08" /><polyline points="3 3 3 9 9 9" /></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconDl = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const ProfileIconX = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const ProfileIconArrow = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const IconSave = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconAlert = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IconCalSmall = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;

// Settings Icons
const IconSettings = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconBell = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const IconSupport = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>;
const IconHelp = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const IconMessage = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const IconInfo = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const IconShield2 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const IconTransfer = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="14" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="20" y1="10" x2="3" y2="21"></line></svg>;
const IconGlobe = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const IconChevronRight = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const IconPhone = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const IconMail = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
const IconClock = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;

// ── Small components ──
function InfoItem({ label, value }) {
  const { t } = useLanguage();
  return (
    <div className="pf-info-item">
      <div className="pf-info-label">{label}</div>
      <div className={`pf-info-val${!value ? " empty" : ""}`}>{value || t('profile_not_provided', 'Not provided')}</div>
    </div>
  );
}

function Card({ icon: Icon, title, tag, flush, children }) {
  return (
    <section className={`pf-card${flush ? " pf-card--flush" : ""}`}>
      <div className="pf-card-header">
        <div className="pf-card-icon"><Icon /></div>
        <h2 className="pf-card-title">{title}</h2>
        {tag && <span className="pf-section-tag">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, req, children }) {
  return (
    <div className="pf-field">
      <label className="pf-lbl">{label}{req && <span className="req"> *</span>}</label>
      {children}
    </div>
  );
}

// One big, easy-to-tap settings row
function SettingRow({ icon: Icon, title, description, action, onClick, danger }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={`pf-setting${onClick ? " is-link" : ""}${danger ? " is-danger" : ""}`}
      onClick={onClick}
    >
      <span className="pf-setting__icon"><Icon /></span>
      <span className="pf-setting__text">
        <span className="pf-setting__title">{title}</span>
        {description && <span className="pf-setting__desc">{description}</span>}
      </span>
      <span className="pf-setting__action">{action || (onClick && <IconChevronRight />)}</span>
    </Tag>
  );
}

/** Format an ISO date string for display */
function formatHistoryDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return isoString;
  }
}

// ── Action Modals ──

function HelpFaqModal({ onClose }) {
  const { t } = useLanguage();
  const faqs = [
    { q: t('help_faq_q1'), a: t('help_faq_a1') },
    { q: t('help_faq_q2'), a: t('help_faq_a2') },
    { q: t('help_faq_q3'), a: t('help_faq_a3') },
  ];

  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pf-modal--sm">
        <div className="pf-modal-head">
          <div>
            <h3>{t('profile_settings_help', 'Help & FAQ')}</h3>
            <p>{t('help_faq_sub', 'Frequently asked questions')}</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} aria-label={t('close', 'Close')}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body pf-modal-body--plain">
          <h4 className="pf-sub-heading">{t('help_faq_heading', 'Frequently Asked Questions')}</h4>
          <div className="pf-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="pf-faq">
                <div className="pf-faq__q">{faq.q}</div>
                <div className="pf-faq__a">{faq.a}</div>
              </div>
            ))}
          </div>

          <div className="pf-note pf-note--teal">
            <strong>{t('help_still_need', 'Still need help?')}</strong>
            <span>
              {t('help_visit_hall')}<br />
              {t('help_office_hours', 'Mon - Fri, 8:00 AM - 5:00 PM')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose }) {
  const { t } = useLanguage();
  const contacts = [
    { icon: <ProfileIconPin />, label: t('contact_address_label', 'Address'), value: "MH Del Pilar St. Malanday, 1444 Valenzuela, Philippines" },
    { icon: <IconPhone />, label: t('contact_hotline_label', 'Hotline'), value: "(02) 8-962-7327", href: "tel:+63289627327" },
    { icon: <IconMail />, label: t('contact_email_label', 'Email'), value: "malanday.valenzuelacity@gmail.com", href: "mailto:malanday.valenzuelacity@gmail.com" },
    { icon: <IconClock />, label: t('contact_hours_label', 'Office Hours'), value: "Monday – Friday, 8:00 AM – 5:00 PM" },
  ];

  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pf-modal--sm">
        <div className="pf-modal-head">
          <div>
            <h3>{t('contact_title', 'Contact Barangay')}</h3>
            <p>{t('contact_sub', 'Get in touch with the local office')}</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} aria-label={t('close', 'Close')}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body pf-modal-body--plain">
          <h4 className="pf-sub-heading">{t('contact_heading', 'Get in Touch')}</h4>
          <div className="pf-contact-list">
            {contacts.map((row, i) => {
              const Inner = (
                <>
                  <span className="pf-contact__icon">{row.icon}</span>
                  <span className="pf-contact__text">
                    <span className="pf-contact__label">{row.label}</span>
                    <span className="pf-contact__value">{row.value}</span>
                  </span>
                </>
              );
              return row.href
                ? <a key={i} href={row.href} className="pf-contact is-link">{Inner}</a>
                : <div key={i} className="pf-contact">{Inner}</div>;
            })}
          </div>

          <div className="pf-note pf-note--amber">
            <strong>{t('contact_emergency_label', 'For Emergencies')}</strong>
            <span>{t('contact_emergency_desc')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutModal({ onClose }) {
  const { t } = useLanguage();
  const details = [
    { label: t('about_developer_label', 'Developer'), value: "3S+ Sense Dev" },
    { label: t('about_jurisdiction_label', 'Jurisdiction'), value: "Brgy. Malanday, Valenzuela City" },
    { label: t('about_build_label', 'Build'), value: "2026 Release" },
    { label: t('about_platform_label', 'Platform'), value: "Web & PWA" },
  ];

  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pf-modal--sm">
        <div className="pf-modal-head">
          <div>
            <h3>{t('about_title', 'About 3S+ Malanday')}</h3>
            <p>{t('about_sub', 'System information and version')}</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} aria-label={t('close', 'Close')}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body pf-modal-body--plain">
          <div className="pf-about-hero">
            <div className="pf-about-hero__icon">
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="pf-about-hero__name">3S+ Sense</div>
            <div className="pf-about-hero__sub">{t('about_system', 'Barangay Service Management System')}</div>
            <div className="pf-about-hero__ver">Version 1.0.0</div>
          </div>

          <div className="pf-about-rows">
            {details.map((row, i) => (
              <div key={i} className="pf-about-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <p className="pf-legal">{t('about_copyright')}</p>
        </div>
      </div>
    </div>
  );
}

function PrivacyModal({ onClose }) {
  const { t } = useLanguage();
  const sections = [
    { title: t('privacy_notice_title', 'Data Privacy Notice'), body: t('privacy_notice_desc') },
    { title: t('privacy_collect_title', 'What We Collect'), body: t('privacy_collect_desc') },
    { title: t('privacy_use_title', 'How We Use It'), body: t('privacy_use_desc') },
    { title: t('privacy_rights_title', 'Your Rights'), body: t('privacy_rights_desc') },
  ];
  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal pf-modal--sm">
        <div className="pf-modal-head">
          <div>
            <h3>{t('profile_settings_privacy', 'Privacy Policy')}</h3>
            <p>{t('privacy_sub', 'How we handle your data')}</p>
          </div>
          <button className="pf-modal-close" onClick={onClose} aria-label={t('close', 'Close')}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body pf-modal-body--plain">
          {sections.map((s, i) => (
            <div key={i} className="pf-policy">
              <h4>{s.title}</h4>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Profile({ onBack, onNavigate, householdID, memberID, userRole, userID }) {
  const { t, language, setLanguage } = useLanguage();
  const [data, setData] = useState({ ...BLANK });
  const [draft, setDraft] = useState({ ...BLANK });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 8;

  // Profile picture state
  const [profilePic, setProfilePic] = useState(null);
  const [picMenuOpen, setPicMenuOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef(null);

  // Live Camera Modal states
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Settings State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'transfer', 'help', 'contact', 'about', 'privacy'

  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(" ");
  const addressFields = ["houseNumber", "street", "barangay", "city", "province", "region"];

  const isHead = userRole === "Household Head" || userRole === "head";
  const isBranchHead = userRole === "Branch Head";

  // Load member profile from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    if (!householdID || !memberID) {
      setLoading(false);
      return;
    }

    getMemberProfile(householdID, memberID)
      .then(async profile => {
        if (!isMounted) return;

        let loadedProfile = profile || { ...BLANK };

        // ── LAZY PATCH: Generate and save UID if the resident doesn't have one yet ──
        if (!loadedProfile.UID) {
          const newUID = generateResidentUID();
          loadedProfile.UID = newUID;
          try {
            await updateMemberProfile(householdID, memberID, { ...loadedProfile, UID: newUID });

            // Sync with local storage
            const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
            session.UID = newUID;
            localStorage.setItem("brgy_session", JSON.stringify(session));
          } catch (e) {
            console.error("Failed to apply Lazy Patch UID:", e);
          }
        }

        setData(loadedProfile);
        if (loadedProfile?.profilePhoto) {
          setProfilePic(loadedProfile.profilePhoto);
        }
      })
      .catch(err => {
        console.error("[Profile] Error:", err);

        // Auto-logout if profile was transferred to a new household
        if (err.message.includes("not found")) {
          alert(t('profile_transferred_relogin', 'Your profile has been transferred. Please log in again using your new Household ID.'));
          localStorage.removeItem("brgy_session"); // Wipe the dead session
          if (onNavigate) onNavigate("logout");    // Kick back to login screen
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [householdID, memberID]);

  // Fetch transaction history
  useEffect(() => {
    let isMounted = true;
    if (!householdID) {
      setTxLoading(false);
      return;
    }

    // Include data.UID to securely fetch their individual history
    fetchUserTransactions(householdID, memberID, userID, userRole, data.UID)
      .then(txData => {
        if (!isMounted) return;
        setTransactions(txData || []);
      })
      .catch(err => {
        console.error("[Profile] Transaction fetch error:", err);
      })
      .finally(() => {
        if (isMounted) setTxLoading(false);
      });

    return () => { isMounted = false; };
  }, [householdID, memberID, userID, userRole, data.UID]);

  useEffect(() => {
    let uid = data.UID;
    if (!uid) {
      try {
        const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
        uid = session.UID;
      } catch {}
    }
    const residentIdentifier = uid || (memberID && memberID !== "head" ? memberID : null);
    if (!residentIdentifier) return;

    QRCode.toDataURL(residentIdentifier, { width: 180, margin: 1, color: { dark: "#0d7a55", light: "#ffffff" } })
      .then(url => setQrUrl(url))
      .catch(console.error);
  }, [data.UID, memberID]);

  // Camera cleanup & control
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const openCamera = async () => {
    setPicMenuOpen(false);
    setCameraError(null);
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError("Camera access denied or unavailable. Please check your browser permissions.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraModalOpen(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const uploadBase64ToCloudinary = async (base64Image) => {
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("file", base64Image);
      formData.append("upload_preset", "3Sense+_ProfilePic");
      const cloudName = "dfnqeiksu";

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload to Cloudinary");
      const cloudinaryData = await res.json();
      const secureUrl = cloudinaryData.secure_url;

      await updateMemberProfile(householdID, memberID, {
        ...data,
        profilePhoto: secureUrl,
      });

      setData(prev => ({ ...prev, profilePhoto: secureUrl }));
      setProfilePic(secureUrl);
    } catch (err) {
      console.error("Error saving profile pic:", err);
      alert(t('profile_pic_save_failed', 'Failed to save profile picture permanently. Please try again.'));
    } finally {
      setUploadingPic(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg", 0.9);

    closeCamera();
    setProfilePic(base64Image);
    await uploadBase64ToCloudinary(base64Image);
  };

  const openModal = () => {
    setDraft({ ...data });
    setTab(0);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const computeSameAddress = () => {
    if (userRole !== "Household Head" && data.sameAddress) {
      return addressFields.every(field => draft[field] === data[field]);
    }
    return false;
  };

  const save = async () => {
    if (!householdID || !memberID) {
      alert(t('profile_missing_info', 'Missing household or member info.'));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, sameAddress: computeSameAddress() };
      // ensure we don't accidentally overwrite the UID with empty if draft missed it
      payload.UID = data.UID;
      await updateMemberProfile(householdID, memberID, payload);
      setData(payload);
      setOpen(false);
    } catch (err) {
      alert(t('profile_failed_save', err.message));
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.download = `${householdID}-${fullName || "member"}-QR.png`;
    link.href = qrUrl;
    link.click();
  };

  const normalizeCategories = (cats) => {
    let list = [];
    if (Array.isArray(cats)) list = cats;
    else if (typeof cats === "string") list = cats.split(",").map(s => s.trim()).filter(Boolean);

    return list.map(c => {
      let cln = c.replace(/[^\w\s-]/gi, '').trim();
      if (cln === "Indigenous") cln = "Indigenous People";
      return cln;
    });
  };

  const set = f => e => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDraft(d => ({
      ...d,
      [f]: value,
      sameAddress: addressFields.includes(f) ? false : d.sameAddress,
    }));
  };

  const toggleCat = cat => setDraft(d => {
    const current = normalizeCategories(d.categories);
    return {
      ...d,
      categories: current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat],
    };
  });

  const normalizedDataCategories = normalizeCategories(data.categories);
  const normalizedDraftCategories = normalizeCategories(draft.categories);
  const isPwd = normalizedDataCategories.includes("PWD");
  const draftPwd = normalizedDraftCategories.includes("PWD");
  const tabs = [t('profile_tab_personal'), t('profile_tab_address'), t('profile_tab_category'), t('profile_tab_education'), t('profile_tab_household')];

  const currentStatus = data.adminStatus || "Clear Case";
  const getStatusInfo = (status) => {
    switch (status) {
      case "Pending Case":
        return {
          label: t('profile_status_pending', 'Pending Case'),
          cls: "pending",
          color: "#b07800",
          desc: t('profile_status_desc_pending', 'This resident has a case currently under review.')
        };
      case "Violation":
        return {
          label: t('profile_status_violation', 'Violation'),
          cls: "violation",
          color: "#c0392b",
          desc: t('profile_status_desc_violation', 'This resident has a recorded violation.')
        };
      case "Clear Case":
      default:
        return {
          label: t('profile_status_clear', 'Clear Case'),
          cls: "clear",
          color: "#0d7a55",
          desc: t('profile_status_desc_clear', 'This resident has no pending cases or violations on record.')
        };
    }
  };
  const getRoleLabel = (r) => {
    if (r === "Household Head" || r === "head") return t('profile_household_head');
    if (r === "Branch Head") return t('profile_branch_head');
    if (r === "Member" || !r) return t('profile_member');
    return r;
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case "Student": return t('reg_cat_student');
      case "Senior Citizen": return t('reg_cat_senior');
      case "Solo Parent": return t('reg_cat_solo_parent');
      case "OFW": return t('reg_cat_ofw');
      case "LGBT": return t('reg_cat_lgbt');
      case "Indigenous People": return t('reg_cat_ip');
      case "PWD": return t('reg_cat_pwd');
      default: return cat;
    }
  };

  const sInfo = getStatusInfo(currentStatus);
  const statusHistory = Array.isArray(data.statusHistory) ? data.statusHistory : [];

  const handlePicFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image locally immediately
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setProfilePic(base64);
      setPicMenuOpen(false);
      await uploadBase64ToCloudinary(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePic = async () => {
    if (!window.confirm(t('profile_remove_pic_confirm', 'Are you sure you want to remove your profile picture?'))) return;

    setPicMenuOpen(false);
    setUploadingPic(true);

    try {
      await updateMemberProfile(householdID, memberID, {
        ...data,
        profilePhoto: null,
      });

      setProfilePic(null);
      setData(prev => ({ ...prev, profilePhoto: null }));
    } catch (err) {
      console.error("Error removing profile pic:", err);
      alert(t('profile_remove_pic_failed', 'Failed to remove profile picture.'));
    } finally {
      setUploadingPic(false);
    }
  };

  const totalPages = Math.ceil(transactions.length / txPerPage) || 1;
  const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="pf-root" onClick={(e) => { if (picMenuOpen && !e.target.closest('.pf-avatar-wrap')) setPicMenuOpen(false); }}>
      <Navbar
        activePage="profile"
        householdID={householdID}
        onNavigate={onNavigate}
        userName={[data.firstName, data.lastName].filter(Boolean).join(" ") || ""}
        userRole={userRole}
        memberID={memberID}
        userID={userID}
      />

      {loading && (
        <div className="pf-loading">{t('profile_loading')}</div>
      )}

      {!loading && (
        <div className="pf-page">
          <div className="pf-page-header">
            <div>
              <h1>{t('profile_page_heading')}</h1>
              <p>{t('profile_page_sub')}</p>
            </div>
            <button className="pf-btn-primary" onClick={openModal}>
              <IconEdit /> {t('profile_edit_btn')}
            </button>
          </div>

          {/* ── HERO ── */}
          <div className="pf-hero-card">
            <div className="pf-hero-avatar-col">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar-ring">
                  {uploadingPic ? (
                    <div className="pf-avatar-placeholder pf-avatar-saving">{t('profile_saving_pic')}</div>
                  ) : profilePic ? (
                    <img src={profilePic} alt="Profile" className="pf-avatar-img" />
                  ) : (
                    <div className="pf-avatar-placeholder"><IconUser /></div>
                  )}
                </div>
                <button
                  className="pf-avatar-cam-btn"
                  onClick={() => setPicMenuOpen(v => !v)}
                  aria-label={t('profile_change_photo_aria', 'Change profile picture')}
                >
                  <IconCamera />
                </button>

                {picMenuOpen && (
                  <div className="pf-pic-menu">
                    <input
                      ref={picInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handlePicFile}
                    />
                    <button className="pf-pic-menu-item" onClick={() => picInputRef.current?.click()}>
                      <IconUpload /> {t('profile_pic_upload')}
                    </button>
                    <button className="pf-pic-menu-item" onClick={openCamera}>
                      <IconCamera /> {t('profile_pic_take')}
                    </button>
                    {profilePic && (
                      <button className="pf-pic-menu-item danger" onClick={handleRemovePic}>
                        <IconTrash /> {t('profile_pic_remove')}
                      </button>
                    )}
                    <div className="pf-pic-menu-divider" />
                    <button className="pf-pic-menu-item muted" onClick={() => setPicMenuOpen(false)}>
                      {t('cancel')}
                    </button>
                  </div>
                )}
              </div>
              <div className="pf-avatar-hint">{t('profile_pic_hint')}</div>
            </div>

            <div className="pf-hero-identity">
              <div className="pf-hero-name">{fullName || t('profile_full_name_fallback')}</div>
              <div className="pf-hero-id">{householdID || "MAL-XXXX-XXXXX"} &bull; {getRoleLabel(userRole)}</div>

              {data.UID && (
                <div className="pf-hero-uid">{t('profile_uid_prefix')}{data.UID}</div>
              )}

              {data.familyNumber && (
                <div className="pf-hero-family-number">
                  {t('profile_family_number_prefix')}{data.familyNumber}
                </div>
              )}

              <div className="pf-hero-verified"><span className="pf-hero-dot" /> {t('profile_verified_resident')}</div>
              <div className="pf-hero-divider" />
              <div className="pf-hero-meta">
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">{t('profile_meta_barangay')}</div>
                  <div className="pf-hero-mv">{data.barangay || "—"}</div>
                </div>
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">{t('profile_meta_city')}</div>
                  <div className="pf-hero-mv">{data.city || "—"}</div>
                </div>
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">{t('profile_meta_record')}</div>
                  <div className="pf-hero-mv" style={{ color: sInfo.color }}>{sInfo.label}</div>
                </div>
              </div>
            </div>

            <div className="pf-hero-qr-col">
              <div className="pf-hero-qr-panel">
                <div className="pf-hero-qr-img-wrap">
                  {qrUrl
                    ? <img src={qrUrl} alt="Personal QR Code" className="pf-hero-qr-img" />
                    : <div className="pf-hero-qr-generating">{t('profile_qr_generating')}</div>
                  }
                </div>
                <div className="pf-hero-qr-label">{t('profile_qr_scan_label')}</div>
                <button className="pf-btn-dl" onClick={downloadQR} disabled={!qrUrl}>
                  <IconDl /> {t('profile_download_qr_btn')}
                </button>
              </div>
            </div>
          </div>

          {/* ── INFORMATION CARDS ── */}
          <Card icon={ProfileIconUser} title={t('profile_card_personal')}>
            <div className="pf-stack">
              <div className="pf-info-grid c3">
                <InfoItem label={t('profile_lbl_first_name')} value={data.firstName} />
                <InfoItem label={t('profile_lbl_middle_name')} value={data.middleName} />
                <InfoItem label={t('profile_lbl_last_name')} value={data.lastName} />
              </div>
              <div className="pf-info-grid c3">
                <InfoItem label={t('profile_lbl_dob')} value={data.birthDate} />
                <InfoItem label={t('profile_lbl_birth_place')} value={data.birthPlace} />
                <InfoItem label={t('profile_lbl_sex')} value={data.sex === "Male" ? t('reg_sex_male', 'Male') : data.sex === "Female" ? t('reg_sex_female', 'Female') : data.sex} />
                <InfoItem label={t('profile_lbl_gender')} value={data.gender === "Others" ? (data.genderOther || "Others") : data.gender} />
                <InfoItem label={t('profile_lbl_civil_status')} value={data.civilStatus} />
                <InfoItem label={t('profile_lbl_citizenship')} value={data.citizenship} />
                <InfoItem label={t('profile_lbl_religion')} value={data.religion} />
                <InfoItem label={t('profile_lbl_residing_since')} value={data.residingSinceYear} />
                <InfoItem label={t('profile_lbl_contact')} value={data.contactNumber} />
                <InfoItem label={t('profile_lbl_email')} value={data.email} />
              </div>
            </div>
          </Card>

          <Card icon={ProfileIconPin} title={t('profile_card_address')}>
            <div className="pf-info-grid c3">
              <InfoItem label={t('profile_lbl_house_unit')} value={data.houseNumber} />
              <InfoItem label={t('profile_lbl_street')} value={data.street} />
              <InfoItem label={t('profile_lbl_barangay')} value={data.barangay} />
              <InfoItem label={t('profile_lbl_city')} value={data.city} />
              <InfoItem label={t('profile_lbl_province')} value={data.province} />
              <InfoItem label={t('profile_lbl_region')} value={data.region} />
            </div>
          </Card>

          <Card icon={IconTag} title={t('profile_card_category')}>
            <div className="pf-stack">
              <div className="pf-cat-grid">
                {data.categories && data.categories.length > 0
                  ? data.categories.map(cat => (
                    <div key={cat} className="pf-chip on">
                      {getCategoryLabel(cat)}
                    </div>
                  ))
                  : <div className="pf-chip off">{t('profile_no_categories')}</div>
                }
              </div>
              {isPwd && (
                <div className="pf-subfields">
                  <div className="pf-subtitle">{t('profile_pwd_details')}</div>
                  <div className="pf-info-grid">
                    <InfoItem label={t('profile_lbl_pwd_status')} value={data.pwdStatus} />
                    <InfoItem label={t('profile_lbl_disability_type')} value={data.disabilityType === "Others" ? (data.disabilityTypeOther || "Others") : data.disabilityType} />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card icon={IconGrad} title={t('profile_card_education')}>
            <div className="pf-info-grid">
              <InfoItem label={t('profile_lbl_edu_attainment')} value={data.educationAttainment} />
              <InfoItem label={t('profile_lbl_edu_status')} value={data.educationStatus} />
              <InfoItem label={t('profile_lbl_occupation')} value={data.occupation} />
              <InfoItem label={t('profile_lbl_employment_status')} value={data.employmentStatus} />
            </div>
          </Card>

          <Card icon={IconHome2} title={t('profile_card_household')}>
            <div className="pf-info-grid c3">
              <InfoItem label={t('profile_lbl_hh_number')} value={householdID} />
              {data.familyNumber && <InfoItem label={t('profile_lbl_family_number')} value={data.familyNumber} />}
              <InfoItem label={t('profile_lbl_total_members')} value={data.totalMembers} />
              <InfoItem label={t('profile_lbl_hh_classification')} value={data.householdClassification} />
            </div>
          </Card>

          {/* ── RECORD STATUS ── */}
          <Card icon={ProfileIconShield} title={t('profile_card_status')} tag={t('profile_card_status_tag')}>
            <div className="pf-status-row">
              <div className={`pf-status-badge ${sInfo.cls}`}>
                <span className="pf-sdot" />{sInfo.label}
              </div>
              <div className="pf-status-desc">
                <strong>{t('profile_current_standing')}</strong>
                {sInfo.desc}
              </div>
            </div>

            {(data.adminRemarks || data.adminIncident) && (
              <div className="pf-remarks">
                {data.adminRemarks && (
                  <div><strong>{t('profile_remarks_prefix')}</strong>{data.adminRemarks}</div>
                )}
                {data.adminIncident && (
                  <div className="pf-remarks__muted"><strong>{t('profile_incident_prefix')}</strong>{data.adminIncident}</div>
                )}
              </div>
            )}

            {data.adminLastUpdatedBy && (
              <div className="pf-updated-by">
                {t('profile_last_updated_by')}<strong>{data.adminLastUpdatedBy}</strong>
                {data.adminLastUpdatedByPosition ? ` (${data.adminLastUpdatedByPosition})` : ""}
                {data.adminLastUpdatedAt ? ` · ${data.adminLastUpdatedAt}` : ""}
              </div>
            )}

            <div className="pf-history">
              <div className="pf-history__title">{t('profile_case_history')}</div>

              {statusHistory.length > 0 ? (
                statusHistory.map((entry, i) => {
                  const dotColor = entry.status === "Clear Case"
                    ? "#0d7a55"
                    : entry.status === "Pending Case"
                      ? "#e8a020"
                      : "#e03e3e";
                  const byLine = [
                    entry.setBy,
                    entry.setByPosition ? `(${entry.setByPosition})` : null,
                  ].filter(Boolean).join(" ");

                  return (
                    <div key={i} className="pf-history__item">
                      <span className="pf-history__dot" style={{ background: dotColor }} />
                      <div>
                        <div className="pf-history__main">
                          {t('profile_status_set_to')}"{entry.status}"
                          {entry.remarks ? ` — ${entry.remarks}` : ""}
                        </div>
                        {entry.incident && <div className="pf-history__sub">{entry.incident}</div>}
                        <div className="pf-history__by">
                          {formatHistoryDate(entry.setAt)}{t('profile_by_prefix')}{byLine}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="pf-history__empty">{t('profile_no_status_changes')}</div>
              )}
            </div>
          </Card>

          {/* ── TRANSACTIONS (cards, no sideways scrolling) ── */}
          <Card icon={IconHistory} title={t('profile_card_transactions')}>
            {txLoading ? (
              <div className="pf-tx-empty">{t('profile_tx_loading')}</div>
            ) : transactions.length === 0 ? (
              <div className="pf-tx-empty">{t('profile_tx_empty')}</div>
            ) : (
              <div className="pf-tx-list">
                {transactions.slice((txPage - 1) * txPerPage, txPage * txPerPage).map((tx, i) => {
                  const dateStr = tx.date?.toDate
                    ? fmtShort(tx.date.toDate())
                    : tx.date ? fmtShort(new Date(tx.date)) : "—";

                  const statusLower = (tx.status || "pending").toLowerCase().replace(/\s+/g, "-");
                  const isOverdue = tx.status === "Overdue";
                  const isUnreturned = tx.status === "Unreturned";

                  const returnDateStr = tx.category === "Equipment" && tx.returnDate
                    ? fmtShort(new Date(tx.returnDate + "T00:00:00"))
                    : null;

                  return (
                    <div key={tx.id || i} className={`pf-tx${isUnreturned ? " is-unreturned" : isOverdue ? " is-overdue" : ""}`}>
                      <div className="pf-tx__top">
                        <div className="pf-tx__name">{tx.serviceName}</div>
                        <span className={`pf-tx-badge ${statusLower}`}>
                          <span className="pf-tx-bdot" />
                          {isUnreturned ? t('status_unreturned') : isOverdue ? t('status_overdue') : tx.status}
                        </span>
                      </div>

                      <div className="pf-tx__meta">
                        <div><span>{t('profile_tx_col_ref')}</span><strong className="pf-tx__ref">{tx.refNum || "—"}</strong></div>
                        <div><span>{t('profile_tx_col_date')}</span><strong>{dateStr}</strong></div>
                        <div><span>{t('profile_tx_col_category')}</span><strong>{tx.category || "—"}</strong></div>
                      </div>

                      {returnDateStr && (
                        <div className="pf-tx__return">
                          {(isOverdue || isUnreturned) ? <IconAlert /> : <IconCalSmall />}
                          <span>{t('profile_tx_return_prefix')}{returnDateStr}</span>
                        </div>
                      )}
                      {isUnreturned && <div className="pf-tx__hint">{t('profile_tx_contact_brgy')}</div>}
                      {isOverdue && <div className="pf-tx__hint">{t('profile_tx_past_due')}</div>}
                    </div>
                  );
                })}
              </div>
            )}

            {!txLoading && transactions.some(tx => tx.status === "Unreturned") && (
              <div className="pf-alert pf-alert--orange">
                <IconAlert />
                <div>
                  <strong>{t('profile_unreturned_banner_title')}</strong>
                  {t('profile_unreturned_banner_text')}
                </div>
              </div>
            )}

            {!txLoading && transactions.some(tx => tx.status === "Overdue") && (
              <div className="pf-alert pf-alert--red">
                <IconAlert />
                <div>
                  <strong>{t('profile_overdue_banner_title')}</strong>
                  {t('profile_overdue_banner_text')}
                </div>
              </div>
            )}

            {transactions.length > txPerPage && (
              <div className="pf-pager">
                <button type="button" onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}>
                  {t('profile_tx_prev')}
                </button>
                <div className="pf-pager__info">{t('profile_tx_page_info', txPage, totalPages)}</div>
                <button type="button" onClick={() => setTxPage(p => Math.min(totalPages, p + 1))} disabled={txPage === totalPages}>
                  {t('profile_tx_next')}
                </button>
              </div>
            )}
          </Card>

          {/* ── PREFERENCES ── */}
          <Card icon={IconSettings} title={t('profile_settings_title', 'Preferences')} flush>
            <SettingRow
              icon={IconGlobe}
              title={t('profile_settings_language', 'Language')}
              description={t('profile_settings_language_desc', 'Choose your preferred interface language.')}
              action={
                <div className="pf-seg" role="group" aria-label={t('profile_settings_language', 'Language')}>
                  <button type="button" className={`pf-seg__btn${language === 'en' ? " is-on" : ""}`} onClick={() => setLanguage('en')}>
                    {t('profile_settings_language_en', 'English')}
                  </button>
                  <button type="button" className={`pf-seg__btn${language === 'fil' ? " is-on" : ""}`} onClick={() => setLanguage('fil')}>
                    {t('profile_settings_language_fil', 'Filipino')}
                  </button>
                </div>
              }
            />
            {isHead && (
              <SettingRow
                icon={ProfileIconUser}
                title={t('profile_transfer_head', 'Transfer Head Role')}
                description={t('profile_transfer_head_desc')}
                onClick={() => setActiveModal('transferHead')}
              />
            )}
            {isHead && (
              <SettingRow
                icon={IconTrash}
                title={t('profile_remove_member', 'Remove Member')}
                description={t('profile_remove_member_desc')}
                onClick={() => setActiveModal('removeMember')}
                danger
              />
            )}
            {isBranchHead && (
              <SettingRow
                icon={ProfileIconUser}
                title={t('profile_transfer_branch', 'Transfer Branch Head Role')}
                description={t('profile_transfer_branch_desc')}
                onClick={() => setActiveModal('transferBranchHead')}
              />
            )}
            <SettingRow
              icon={IconBell}
              title={t('profile_settings_notif', 'Push Notifications')}
              description={t('profile_settings_notif_desc')}
              action={
                <label className="pf-toggle">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={e => setPushEnabled(e.target.checked)}
                    aria-label={t('profile_settings_notif', 'Push Notifications')}
                  />
                  <span className="pf-toggle__track"><span className="pf-toggle__knob" /></span>
                </label>
              }
            />
            <SettingRow
              icon={IconTransfer}
              title={t('profile_transfer_household', 'Transfer Household')}
              description={t('profile_transfer_household_desc')}
              onClick={() => setActiveModal('transfer')}
            />
          </Card>

          <Card icon={IconSupport} title={t('profile_settings_support', 'Support')} flush>
            <SettingRow icon={IconHelp} title={t('profile_settings_help', 'Help & FAQ')} onClick={() => setActiveModal('help')} />
            <SettingRow icon={IconMessage} title={t('profile_settings_contact', 'Contact Barangay')} onClick={() => setActiveModal('contact')} />
            <SettingRow icon={IconInfo} title={t('profile_settings_about', 'About')} onClick={() => setActiveModal('about')} />
            <SettingRow icon={IconShield2} title={t('profile_settings_privacy', 'Privacy Policy')} onClick={() => setActiveModal('privacy')} />
          </Card>

          <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      )}

      {/* ── SETTINGS ACTION MODALS ── */}
      {activeModal === 'transfer' && (
        <TransferHouseholdModal
          onClose={() => setActiveModal(null)}
          currentHouseholdID={householdID}
          userData={data}
          memberID={memberID}
        />
      )}

      {activeModal === 'removeMember' && (
        <RemoveMemberModal
          householdID={householdID}
          currentHeadID={memberID}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'transferHead' && (
        <TransferHeadModal
          onClose={() => setActiveModal(null)}
          householdID={householdID}
          currentHeadID={memberID}
          onLogout={() => {
            localStorage.removeItem("brgy_session");
            if (onNavigate) onNavigate("logout");
          }}
        />
      )}

      {activeModal === 'transferBranchHead' && (
        <TransferBranchHeadModal
          onClose={() => setActiveModal(null)}
          householdID={householdID}
          currentBranchID={data.branchID} // Pass their current branch so it filters correctly
          currentHeadID={memberID}
          onLogout={() => {
            localStorage.removeItem("brgy_session");
            if (onNavigate) onNavigate("logout");
          }}
        />
      )}

      {activeModal === 'help' && <HelpFaqModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'contact' && <ContactModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'privacy' && <PrivacyModal onClose={() => setActiveModal(null)} />}

      {/* ── LIVE CAMERA MODAL ── */}
      {cameraModalOpen && (
        <div className="pf-overlay pf-overlay--top" onClick={(e) => { if (e.target === e.currentTarget) closeCamera(); }}>
          <div className="pf-modal pf-modal--sm">
            <div className="pf-modal-head">
              <div>
                <h3>{t('profile_cam_title')}</h3>
                <p>{t('profile_cam_desc')}</p>
              </div>
              <button className="pf-modal-close" onClick={closeCamera} aria-label={t('close', 'Close')}><ProfileIconX /></button>
            </div>
            <div className="pf-modal-body pf-cam-body">
              {cameraError ? (
                <div className="pf-cam-error">{cameraError}</div>
              ) : (
                <div className="pf-cam-frame">
                  <video ref={videoRef} playsInline muted />
                </div>
              )}
            </div>
            <div className="pf-modal-foot pf-modal-foot--end">
              <button className="pf-btn-ghost" onClick={closeCamera}>{t('cancel')}</button>
              {!cameraError && (
                <button className="pf-btn-primary" onClick={capturePhoto}>
                  <IconCamera /> {t('profile_cam_capture')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {open && (
        <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <div>
                <h3>{t('profile_edit_btn')}</h3>
                <p>{t('profile_edit_sub')}</p>
              </div>
              <button className="pf-modal-close" onClick={closeModal} aria-label={t('close', 'Close')}><ProfileIconX /></button>
            </div>

            <div className="pf-modal-tabs">
              {tabs.map((tabLabel, i) => (
                <div key={i} className={`pf-modal-tab${i === tab ? " active" : i < tab ? " done" : ""}`} onClick={() => setTab(i)}>
                  <div className="pf-tab-num">{i < tab ? "✓" : i + 1}</div>
                  <span className="pf-tab-label">{tabLabel}</span>
                </div>
              ))}
            </div>

            <div className="pf-modal-body">
              {tab === 0 && <>
                <div className="fg c3">
                  <Field label={t('profile_lbl_first_name')} req><input className="pf-inp" placeholder="Maria" value={draft.firstName} onChange={set("firstName")} /></Field>
                  <Field label={t('profile_lbl_middle_name')}><input className="pf-inp" placeholder="Santos" value={draft.middleName} onChange={set("middleName")} /></Field>
                  <Field label={t('profile_lbl_last_name')} req><input className="pf-inp" placeholder="Dela Cruz" value={draft.lastName} onChange={set("lastName")} /></Field>
                </div>
                <div className="fg c3">
                  <Field label={t('profile_lbl_suffix')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.suffix} onChange={set("suffix")}><option value="">{t('none', 'None')}</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option></select></div>
                  </Field>
                  <Field label={t('profile_lbl_religion')}><input className="pf-inp" placeholder="Roman Catholic" value={draft.religion} onChange={set("religion")} /></Field>
                  <Field label={t('profile_lbl_civil_status')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.civilStatus} onChange={set("civilStatus")}><option value="">{t('select', 'Select')}</option><option value="Single">{t('reg_civil_single', 'Single')}</option><option value="Married">{t('reg_civil_married', 'Married')}</option><option value="Widowed">{t('reg_civil_widowed', 'Widowed')}</option><option value="Separated">{t('reg_civil_separated', 'Separated')}</option></select></div>
                  </Field>
                </div>
                <div className="fg c3">
                  <Field label={t('profile_lbl_dob')} req><input className="pf-inp" type="date" value={draft.birthDate} onChange={set("birthDate")} /></Field>
                  <Field label={t('profile_lbl_birth_place')}><input className="pf-inp" placeholder="Valenzuela City" value={draft.birthPlace} onChange={set("birthPlace")} /></Field>
                  <Field label={t('profile_lbl_citizenship')}><input className="pf-inp" placeholder="Filipino" value={draft.citizenship} onChange={set("citizenship")} /></Field>
                </div>
                <div className="fg">
                  <Field label={t('profile_lbl_sex')} req>
                    <div className="pf-radio-row">
                      {["Male", "Female"].map(v => (
                        <label key={v} className="pf-radio-opt">
                          <input type="radio" name="sex" value={v} checked={draft.sex === v} onChange={set("sex")} />
                          <span className="pf-radio-lbl">{v === "Male" ? t('reg_sex_male', 'Male') : t('reg_sex_female', 'Female')}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label={t('profile_lbl_gender')}>
                    <div className="pf-sel-wrap">
                      <select className="pf-sel" value={draft.gender} onChange={set("gender")}>
                        <option value="">{t('reg_select_gender', 'Select gender')}</option>
                        <option value="Man">{t('reg_gender_man', 'Man')}</option>
                        <option value="Woman">{t('reg_gender_woman', 'Woman')}</option>
                        <option value="Non-binary">{t('reg_gender_non_binary', 'Non-binary')}</option>
                        <option value="Prefer not to say">{t('reg_gender_prefer_not', 'Prefer not to say')}</option>
                      </select>
                    </div>
                  </Field>
                </div>
                {draft.gender === "Others" && (
                  <div className="fg c1">
                    <Field label={t('profile_lbl_specify_gender')}>
                      <input className="pf-inp" placeholder="Please specify" value={draft.genderOther || ""} onChange={set("genderOther")} />
                    </Field>
                  </div>
                )}
                <div className="fg">
                  <Field label={t('profile_lbl_contact')}><input className="pf-inp" type="tel" placeholder="09XX XXX XXXX" value={draft.contactNumber} onChange={set("contactNumber")} /></Field>
                  <Field label={t('profile_lbl_email')}><input className="pf-inp" type="email" placeholder="email@example.com" value={draft.email} onChange={set("email")} /></Field>
                </div>
                <div className="fg">
                  <Field label={t('profile_lbl_residing_since_year')} req><input className="pf-inp" type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={draft.residingSinceYear} onChange={set("residingSinceYear")} /></Field>
                </div>
              </>}

              {tab === 1 && <>
                <div className="fg">
                  <Field label={t('profile_lbl_house_unit')} req><input className="pf-inp" placeholder="123" value={draft.houseNumber} onChange={set("houseNumber")} /></Field>
                  <Field label={t('profile_lbl_street')} req><input className="pf-inp" placeholder="Malanday Street" value={draft.street} onChange={set("street")} /></Field>
                </div>
                <div className="fg">
                  <Field label={t('profile_lbl_region')}>
                    <input className="pf-inp" value="NCR" readOnly />
                  </Field>
                  <Field label={t('profile_lbl_province')}><input className="pf-inp" placeholder="Metro Manila" value={draft.province} onChange={set("province")} readOnly={draft.sameAddress} /></Field>
                </div>
                <div className="fg">
                  <Field label={t('profile_lbl_city')}><input className="pf-inp" value="Valenzuela City" readOnly /></Field>
                  <Field label={t('profile_lbl_barangay')}><input className="pf-inp" value="Malanday" readOnly /></Field>
                </div>
              </>}

              {tab === 2 && <>
                {(() => {
                  const draftCategories = Array.isArray(draft.categories) ? draft.categories : [];
                  return (
                    <div className="pf-chk-grid">
                      {CATS.map(cat => (
                        <label key={cat} className="pf-chk-opt">
                          <input type="checkbox" checked={draftCategories.includes(cat)} onChange={() => toggleCat(cat)} />
                          <span className="pf-chk-lbl">
                            <span className="pf-chk-box">{draftCategories.includes(cat) ? "✓" : ""}</span>
                            {getCategoryLabel(cat)}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })()}
                {draftPwd && (
                  <div className="pf-subfields">
                    <div className="pf-subtitle">{t('profile_pwd_details')}</div>
                    <div className="fg">
                      <Field label={t('profile_lbl_pwd_status')}>
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.pwdStatus} onChange={set("pwdStatus")}><option value="">{t('select', 'Select')}</option><option value="Children with Disabilities">{t('reg_pwd_child', 'Children with Disabilities')}</option><option value="Person with Disabilities">{t('reg_pwd_person', 'Person with Disabilities')}</option></select></div>
                      </Field>
                      <Field label={t('profile_lbl_disability_type')}>
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.disabilityType} onChange={set("disabilityType")}>
                          <option value="">{t('select', 'Select')}</option>
                          <option value="Physical Disability">{t('reg_dis_physical', 'Physical Disability')}</option>
                          <option value="Visual Disability">{t('reg_dis_visual', 'Visual Disability')}</option>
                          <option value="Hearing Disability">{t('reg_dis_hearing', 'Hearing Disability')}</option>
                          <option value="Speech Impairment">{t('reg_dis_speech', 'Speech Impairment')}</option>
                          <option value="Intellectual Disability">{t('reg_dis_intellectual', 'Intellectual Disability')}</option>
                          <option value="Learning Disability">{t('reg_dis_learning', 'Learning Disability')}</option>
                          <option value="Psychosocial Disability">{t('reg_dis_psychosocial', 'Psychosocial Disability')}</option>
                          <option value="Multiple Disabilities">{t('reg_dis_multiple', 'Multiple Disabilities')}</option>
                          <option value="Chronic Illness">{t('reg_dis_chronic', 'Chronic Illness')}</option>
                          <option value="Rare Disease">{t('reg_dis_rare', 'Rare Disease')}</option>
                          <option value="Others">{t('others', 'Others')}</option>
                        </select></div>
                      </Field>
                    </div>
                    {draft.disabilityType === "Others" && (
                      <div className="fg c1">
                        <Field label={t('profile_lbl_specify_disability')}>
                          <input className="pf-inp" placeholder="Please specify" value={draft.disabilityTypeOther || ""} onChange={set("disabilityTypeOther")} />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </>}

              {tab === 3 && <>
                <div className="fg">
                  <Field label={t('profile_lbl_edu_attainment')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationAttainment} onChange={set("educationAttainment")}><option value="">{t('select', 'Select')}</option><option value="Elementary">{t('reg_edu_elem', 'Elementary')}</option><option value="High School">{t('reg_edu_hs', 'High School')}</option><option value="College">{t('reg_edu_college', 'College')}</option><option value="Post Graduate">{t('reg_edu_post_grad', 'Post Graduate')}</option><option value="Vocational">{t('reg_edu_vocational', 'Vocational')}</option></select></div>
                  </Field>
                  <Field label={t('profile_lbl_edu_status')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationStatus} onChange={set("educationStatus")}><option value="">{t('select', 'Select')}</option><option value="In School">{t('reg_edu_in_school', 'In School')}</option><option value="Out of School Youth (OSY)">{t('reg_edu_osy', 'Out of School Youth (OSY)')}</option><option value="Graduate">{t('reg_edu_grad', 'Graduate')}</option></select></div>
                  </Field>
                </div>
                <div className="fg">
                  <Field label={t('profile_lbl_occupation')}><input className="pf-inp" placeholder="e.g. Teacher, Student" value={draft.occupation} onChange={set("occupation")} /></Field>
                  <Field label={t('profile_lbl_employment_status')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.employmentStatus} onChange={set("employmentStatus")}><option value="">{t('select', 'Select')}</option><option value="Employed">{t('reg_emp_employed', 'Employed')}</option><option value="Unemployed">{t('reg_emp_unemployed', 'Unemployed')}</option><option value="Self-employed">{t('reg_emp_self', 'Self-employed')}</option><option value="Student">{t('reg_emp_student', 'Student')}</option></select></div>
                  </Field>
                </div>
              </>}

              {tab === 4 && <>
                <div className="fg">
                  <Field label={t('profile_lbl_total_members')}><input className="pf-inp" type="number" min="1" placeholder="e.g. 4" value={draft.totalMembers} onChange={set("totalMembers")} /></Field>
                  <Field label={t('profile_lbl_household_classification')}>
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.householdClassification} onChange={set("householdClassification")}><option value="">{t('select', 'Select')}</option><option value="Owner">{t('reg_class_owned', 'Owner')}</option><option value="Rental">{t('reg_class_rented', 'Rental')}</option><option value="Co-habit / Shared">{t('reg_class_rent_free_owner', 'Co-habit / Shared')}</option><option value="Informal Settler">{t('reg_class_informal', 'Informal Settler')}</option></select></div>
                  </Field>
                </div>
              </>}
            </div>

            <div className="pf-modal-foot">
              <button className="pf-btn-ghost" onClick={tab === 0 ? closeModal : () => setTab(n => n - 1)}>
                {tab === 0 ? t('cancel') : t('profile_btn_back')}
              </button>
              <div className="pf-modal-foot__right">
                {tab < tabs.length - 1
                  ? <button className="pf-btn-primary" onClick={() => setTab(n => n + 1)}>{t('profile_btn_next')} <ProfileIconArrow /></button>
                  : <button className="pf-btn-primary" onClick={save} disabled={saving}><IconSave /> {saving ? t('profile_btn_saving') : t('profile_save_changes')}</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}