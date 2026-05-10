import React, { useState } from "react";

// 1. Import all the Icons this specific tab uses!
import { 
  ServiceShieldIcon, 
  SirenIcon, 
  BadgeIcon, 
  UsersIcon, 
  HeartIcon, 
  BriefcaseIcon, 
  ServicesMenuIcon 
} from "../Icons";

// 2. Import the actual sub-components you created
import VAWCTab from "./subtabs/VAWCTab";
import BOSCATab from "./subtabs/BOSCATab";
import BSWDTab from "./subtabs/BSWDTab";
import PeaceOrderTab from "./subtabs/PeaceOrderTab";
import LivelihoodTab from "./subtabs/LivelihoodTab";
import BADACTab from "./subtabs/BADACTab";

// ── Services Sub-Tab Data ──
const SERVICES_SUBTABS = [
  { key: "vawc",       label: "VAWC",          color: "#e03e3e", icon: <ServiceShieldIcon />,    category: "legal"     },
  { key: "peace",      label: "Peace & Order", color: "#1a56a0", icon: <SirenIcon />,      category: "legal"     },
  { key: "badac",      label: "BADAC",         color: "#92400e", icon: <BadgeIcon />,      category: "legal"     },
  { key: "bosca",      label: "BOSCA",         color: "#703381", icon: <UsersIcon />,      category: "community" },
  { key: "bswd",       label: "BSWD",          color: "#317D89", icon: <HeartIcon />,      category: "community" },
  { key: "livelihood", label: "Livelihood",    color: "#1e8a5e", icon: <BriefcaseIcon />, category: "community" },
];

const SVC_CARD_META = {
  vawc:       { fullName: "Violence Against Women & Children",        desc: "Hotlines, protection orders, and guided support for VAWC cases.",              bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.18)",  text: "#b91c1c" },
  bosca:      { fullName: "Barangay Office for Senior Citizens Assoc.",desc: "Senior citizen membership, benefits, welfare programs and how to join.",      bg: "rgba(112,51,129,0.06)", border: "rgba(112,51,129,0.18)", text: "#703381" },
  bswd:       { fullName: "Barangay Social Welfare and Development",   desc: "Report homeless individuals, send tips, and access social welfare services.", bg: "rgba(49,125,137,0.06)", border: "rgba(49,125,137,0.18)", text: "#317D89" },
  peace:      { fullName: "Peace & Order",                             desc: "Emergency hotline, file an incident report, and track your report status.",   bg: "rgba(26,86,160,0.06)",  border: "rgba(26,86,160,0.18)",  text: "#1a56a0" },
  livelihood: { fullName: "Livelihood Skills Training",               desc: "Register for free skills training programs and track your enrollment status.", bg: "rgba(30,138,94,0.06)",  border: "rgba(30,138,94,0.18)",  text: "#1e8a5e" },
  badac:      { fullName: "Barangay Anti-Drug Abuse Council",         desc: "Confidential assistance, free drug testing, and rehabilitation referral.",     bg: "rgba(146,64,14,0.06)",  border: "rgba(146,64,14,0.18)",  text: "#92400e" },
};

const FILTERS = [
  { key: "all",       label: "All Services" },
  { key: "legal",     label: "Legal" },
  { key: "community", label: "Community" },
];

export default function ServicesTab({ userData, householdID, userName }) {
  const [sub, setSub]       = useState(null);
  const [filter, setFilter] = useState("all");

  if (sub) {
    return (
      <div className="svc-detail-wrap">
        <button className="svc-detail-back" onClick={() => setSub(null)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Services
        </button>
        {/* Pass userData to the tabs that need it */}
        {sub === "vawc"       && <VAWCTab />}
        {sub === "bosca"      && <BOSCATab />}
        {sub === "bswd"       && <BSWDTab userData={userData} householdID={householdID} />}
        {sub === "peace"      && <PeaceOrderTab userData={userData} householdID={householdID} />}
        {sub === "livelihood" && <LivelihoodTab userData={userData} householdID={householdID} userName={userName} />}
        {sub === "badac"      && <BADACTab />}
      </div>
    );
  }

  const filtered = filter === "all" ? SERVICES_SUBTABS : SERVICES_SUBTABS.filter(s => s.category === filter);

  return (
    <div className="svc-picker">
      <div className="sc-card-header">
        <div className="sc-card-header-left">
          <div className="sc-card-icon-wrap"><ServicesMenuIcon /></div>
          <div>
            <div className="sc-card-title">Community Services</div>
            <div className="sc-card-subtitle">Select a service to learn more or take action.</div>
         </div>
        </div>
      </div>
      <div className="svc-filter-tabbar">
        {FILTERS.map(f => (
          <button key={f.key} className={`svc-filter-tab${filter === f.key ? " svc-filter-tab--active" : ""}`} onClick={() => setFilter(f.key)}>
            {f.label}
            {f.key !== "all" && (
              <span className="svc-filter-tab__count">{SERVICES_SUBTABS.filter(s => s.category === f.key).length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="svc-picker__grid">
        {filtered.map(s => {
          const meta = SVC_CARD_META[s.key];
          return (
            <button key={s.key} className="svc-picker-card" onClick={() => setSub(s.key)}
              style={{ "--card-color": meta.text, "--card-bg": meta.bg, "--card-border": meta.border }}>
              <div className="svc-picker-card__icon" style={{ background: meta.bg, color: meta.text, border: `1.5px solid ${meta.border}` }}>{s.icon}</div>
              <div className="svc-picker-card__body">
                <div className="svc-picker-card__label-row">
                  <span className="svc-picker-card__label">{s.label}</span>
                  <span className="svc-picker-card__cat" style={{ background: s.category === "legal" ? "rgba(26,86,160,0.08)" : "rgba(49,125,137,0.08)", color: s.category === "legal" ? "#1a56a0" : "#317D89" }}>{s.category === "legal" ? "Legal" : "Community"}</span>
                </div>
                <div className="svc-picker-card__name">{meta.fullName}</div>
                <div className="svc-picker-card__desc">{meta.desc}</div>
              </div>
              <div className="svc-picker-card__arrow" style={{ color: meta.text }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}