import React, { useState } from "react";
import { useLanguage } from "../../context/LanguageContext";

// 1. Import all the Icons this specific tab uses
import {
  ServiceShieldIcon,
  SirenIcon,
  BadgeIcon,
  UsersIcon,
  HeartIcon,
  BriefcaseIcon,
  ServicesMenuIcon
} from "../Icons";

// 2. Import the sub-components
import VAWCTab from "./subtabs/VAWCTab";
import BOSCATab from "./subtabs/BOSCATab";
import BSWDTab from "./subtabs/BSWDTab";
import PeaceOrderTab from "./subtabs/PeaceOrderTab";
import LivelihoodTab from "./subtabs/LivelihoodTab";
import BADACTab from "./subtabs/BADACTab";

// ── Services Sub-Tab Data ──
// Order matters: Legal first, then Community (the grouped grid fills column by column)
// Colours now come from the category (see services CSS: data-category), not from each service.
const SERVICES_SUBTABS = [
  { key: "vawc",       label: "VAWC",          icon: <ServiceShieldIcon />, category: "legal"     },
  { key: "peace",      label: "Peace & Order", icon: <SirenIcon />,         category: "legal"     },
  { key: "badac",      label: "BADAC",         icon: <BadgeIcon />,         category: "legal"     },
  { key: "bosca",      label: "BOSCA",         icon: <UsersIcon />,         category: "community" },
  { key: "bswd",       label: "BSWD",          icon: <HeartIcon />,         category: "community" },
  { key: "livelihood", label: "Livelihood",    icon: <BriefcaseIcon />,     category: "community" },
];

const SVC_CARD_META = {
  vawc:       { fullName: "Violence Against Women and Children",  desc: "Get help for cases of abuse, learn about available protection, or ask for assistance for yourself or someone you know." },
  bosca:      { fullName: "Senior Citizens' Services",            desc: "Get information about senior citizen benefits, membership, and available programs. Ask for help if you are unsure how to apply." },
  bswd:       { fullName: "Barangay Social Welfare and Development", desc: "Ask about social assistance and available welfare services for individuals and families who need help." },
  peace:      { fullName: "Peace and Order",                      desc: "Report safety concerns, ask for help from the barangay tanod, or report incidents in your community." },
  livelihood: { fullName: "Livelihood Skills Training",           desc: "Learn about skills training and livelihood programs that can help you find work, develop new skills, or start a small business." },
  badac:      { fullName: "Barangay Anti-Drug Abuse Council",     desc: "Ask for guidance about drug-related concerns, learn about prevention programs, or seek help for someone who needs support." },
};

const CATEGORY_LABEL = {
  legal: "Legal",
  community: "Community",
};

const FILTERS = [
  { key: "all",       labelKey: "svtab_all_services", defaultLabel: "All Services" },
  { key: "legal",     labelKey: "svtab_legal",        defaultLabel: "Legal" },
  { key: "community", labelKey: "svtab_community",    defaultLabel: "Community" },
];

export default function ServicesTab({ userData, householdID, userName }) {
  const { t } = useLanguage();
  const [sub, setSub]       = useState(null);
  const [filter, setFilter] = useState("all");

  if (sub) {
    return (
      <div className="svc-detail-wrap">
        <button className="svc-detail-back" onClick={() => setSub(null)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          {t("svtab_back_to_services")}
        </button>
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
            <div className="sc-card-title">{t("svtab_community_services")}</div>
            <div className="sc-card-subtitle">{t("svtab_community_services_sub")}</div>
          </div>
        </div>
      </div>

      <div className="svc-filter-tabbar">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`svc-filter-tab${filter === f.key ? " svc-filter-tab--active" : ""}`}
            data-category={f.key}
            onClick={() => setFilter(f.key)}
          >
            {t(f.labelKey, f.defaultLabel)}
            {f.key !== "all" && (
              <span className="svc-filter-tab__count">{SERVICES_SUBTABS.filter(s => s.category === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className={`svc-picker__grid${filter === "all" ? " svc-picker__grid--grouped" : ""}`}>
        {filtered.map(s => {
          const meta = SVC_CARD_META[s.key];
          const cardName = t(`svtab_${s.key}_name`, meta?.fullName || s.label);
          const cardDesc = t(`svtab_${s.key}_desc`, meta?.desc || "");
          const catLabel = t(`svtab_${s.category}`, CATEGORY_LABEL[s.category]);
          return (
            <button
              key={s.key}
              type="button"
              className="svc-picker-card"
              data-category={s.category}
              onClick={() => setSub(s.key)}
            >
              <div className="svc-picker-card__icon">{s.icon}</div>

              <div className="svc-picker-card__body">
                <div className="svc-picker-card__label-row">
                  <span className="svc-picker-card__label">{t(`svtab_${s.key}`, s.label)}</span>
                  <span className="svc-picker-card__cat">{catLabel}</span>
                </div>
                <div className="svc-picker-card__name">{cardName}</div>
                <div className="svc-picker-card__desc">{cardDesc}</div>
              </div>

              <div className="svc-picker-card__arrow" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}