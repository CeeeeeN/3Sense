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
// Order matters: Legal first, then Community (the grouped grid fills column by column)
const SERVICES_SUBTABS = [
  { key: "vawc",       label: "VAWC",          color: "#e03e3e", icon: <ServiceShieldIcon />, category: "legal"     },
  { key: "peace",      label: "Peace & Order", color: "#1a56a0", icon: <SirenIcon />,         category: "legal"     },
  { key: "badac",      label: "BADAC",         color: "#92400e", icon: <BadgeIcon />,         category: "legal"     },
  { key: "bosca",      label: "BOSCA",         color: "#703381", icon: <UsersIcon />,         category: "community" },
  { key: "bswd",       label: "BSWD",          color: "#317D89", icon: <HeartIcon />,         category: "community" },
  { key: "livelihood", label: "Livelihood",    color: "#1e8a5e", icon: <BriefcaseIcon />,     category: "community" },
];

const SVC_CARD_META = {
  vawc:       { fullName: "Violence Against Women and Children",         desc: "Get help for cases of abuse, learn about available protection, or ask for assistance for yourself or someone you know." },
  bosca:      { fullName: "Senior Citizens' Services", desc: "Report safety concerns, ask for help from the barangay tanod, or report incidents in your community." },
  bswd:       { fullName: "Barangay Social Welfare and Development",    desc: "Ask for guidance about drug-related concerns, learn about prevention programs, or seek help for someone who needs support." },
  peace:      { fullName: "Peace and Order",                              desc: "Get information about senior citizen benefits, membership, and available programs. Ask for help if you are unsure how to apply." },
  livelihood: { fullName: "Livelihood Skills Training",                desc: "Ask about social assistance and available welfare services for individuals and families who need help." },
  badac:      { fullName: "Barangay Anti-Drug Abuse Council",          desc: "Learn about skills training and livelihood programs that can help you find work, develop new skills, or start a small business." },
};

// ── Category theme: card tint, border, accent bar ──
const CATEGORY_THEME = {
  legal: {
    label: "Legal",
    color: "#1a56a0",
    bg: "linear-gradient(135deg, rgba(26,86,160,0.16) 0%, rgba(26,86,160,0.07) 100%)",
    border: "rgba(26,86,160,0.38)",
    pillBg: "rgba(26,86,160,0.16)",
  },
  community: {
    label: "Community",
    color: "#317D89",
    bg: "linear-gradient(135deg, rgba(49,125,137,0.16) 0%, rgba(49,125,137,0.07) 100%)",
    border: "rgba(49,125,137,0.38)",
    pillBg: "rgba(49,125,137,0.16)",
  },
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

      <div className={`svc-picker__grid${filter === "all" ? " svc-picker__grid--grouped" : ""}`}>
        {filtered.map(s => {
          const meta = SVC_CARD_META[s.key];
          const cat  = CATEGORY_THEME[s.category];
          return (
            <button
              key={s.key}
              className="svc-picker-card"
              onClick={() => setSub(s.key)}
              style={{
                "--card-color": cat.color,
                "--card-bg": cat.bg,
                "--card-border": cat.border,
                background: cat.bg,
                border: `1.5px solid ${cat.border}`,
                borderLeft: `5px solid ${cat.color}`,
              }}
            >
              <div
                className="svc-picker-card__icon"
                style={{
                  background: "#fff",
                  color: s.color,
                  border: `1.5px solid ${cat.border}`,
                  boxShadow: `0 2px 8px ${cat.border}`,
                }}
              >
                {s.icon}
              </div>

              <div className="svc-picker-card__body">
                <div className="svc-picker-card__label-row">
                  <span className="svc-picker-card__label">{s.label}</span>
                  <span
                    className="svc-picker-card__cat"
                    style={{ background: cat.pillBg, color: cat.color, fontWeight: 700 }}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="svc-picker-card__name">{meta.fullName}</div>
                <div className="svc-picker-card__desc">{meta.desc}</div>
              </div>

              <div className="svc-picker-card__arrow" style={{ color: cat.color }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}