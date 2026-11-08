import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, getDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { submitDocumentRequest } from "../../services/services";
import { createNotification } from "../../services/notifications";
import { useLanguage } from "../../context/LanguageContext";
import {
  localizePurpose,
  localizeFee,
  localizeDays,
  localizeReminder,
} from "../../utils/serviceTranslations";

// Keeps digits only, max 11. Converts +63 / 63 / 9XXXXXXXXX into 09XXXXXXXXX
const normalizePHMobile = (value) => {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("63") && d.length >= 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return d.slice(0, 11);
};

// Exactly 11 digits, starting with 09
const isValidPHMobile = (value) => /^09\d{9}$/.test(String(value || ""));

const CIVIL_STATUS_OPTIONS = [
  { value: "Single", labelKey: "status_single" },
  { value: "Married", labelKey: "status_married" },
  { value: "Widowed", labelKey: "status_widowed" },
  { value: "Separated", labelKey: "status_separated" },
];

const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

const formatSize = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Turns "50", 50, "₱50", "PHP 50.00", "Free", 0 into a number (or 0 for free).
// Returns null when there is no fee info, or the raw string if it isn't numeric.
const parseFee = (fee) => {
  if (fee === undefined || fee === null || fee === "") return null;
  if (typeof fee === "number") return fee;
  const raw = String(fee).trim();
  if (/free|libre|walang/i.test(raw)) return 0;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ""));
  return Number.isNaN(n) ? raw : n;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ico = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  doc:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>,
  warning: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  upload:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  check:   <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  phone:   <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" /></>,
  clock:   <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  close:   <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
};
const ArrowRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
);
const ArrowLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
);
const BigCheck = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

// ── Fee + processing time pills (shared by Step 1 cards and Step 2 box) ───────
function DocMeta({ doc, className }) {
  const { t, language } = useLanguage();
  const noteSaysFree = /free of charge|libre|walang bayad/i.test(doc?.reminder || doc?.note || "");
  const parsed = noteSaysFree ? 0 : parseFee(doc?.fee);
  const days = doc?.processingTime || doc?.days;
  if (parsed === null && !days) return null;

  let feePill = null;
  if (parsed === 0) {
    feePill = <span className="dz-pill dz-pill--free">{t("doc_free", "Free")}</span>;
  } else if (typeof parsed === "string") {
    feePill = <span className="dz-pill dz-pill--fee">{localizeFee(parsed, language)}</span>;
  } else if (typeof parsed === "number") {
    const amount = parsed.toLocaleString("en-PH", {
      minimumFractionDigits: Number.isInteger(parsed) ? 0 : 2,
      maximumFractionDigits: 2,
    });
    feePill = (
      <span className="dz-pill dz-pill--fee" aria-label={`${amount} pesos`}>
        <span className="dz-peso" aria-hidden="true">₱</span>{amount}
      </span>
    );
  }

  return (
    <span className={className}>
      {feePill}
      {days ? <span className="dz-pill">{localizeDays(days, language)}</span> : null}
    </span>
  );
}

// ── Validity reminder (big yellow notice, can be dismissed) ───────────────────
function ValidityReminderBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLanguage();
  if (dismissed) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px",
      background: "#fffbeb", border: "1px solid #fcd34d",
      borderRadius: "10px", padding: "10px 14px",
      // The wizard already has a 1rem gap between items, so pull the bottom
      // in by 0.25rem to get the same 0.75rem as the Equipment alert.
      margin: "0.1rem 0 -0.25rem",
      fontSize: "14px", color: "#92400e",
    }}>
      <svg style={{ flexShrink: 0, marginTop: "1px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div style={{ flex: 1 }}>
        <strong style={{ display: "block", marginBottom: "2px", color: "#78350f" }}>
          {t("doc_validity_title", "Document Validity Reminder")}
        </strong>
        {t("doc_validity_desc", "Barangay documents issued through this system are valid for 6 months from the date of issuance. Please ensure you use your document within this period. After expiry, a new request will be required.")}
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("close", "Dismiss reminder")}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#92400e",
          padding: "0",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────────
function StepIndicator({ step, onStepClick }) {
  const { t } = useLanguage();
  const stepLabels = [
    t("doc_step1", "Select Document"),
    t("doc_step2", "Personal Details"),
    t("doc_step3", "Review"),
    t("doc_step4", "Done")
  ];

  return (
    <ol className="lv-steps lv-steps--4" aria-label={t("doc_request_progress", "Request progress")}>
      {stepLabels.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;

        const clickable = done;
        const Node = clickable ? "button" : "div";
        const nodeProps = clickable ? { onClick: () => onStepClick(num), type: "button" } : {};

        return (
          <li key={label} className="lv-steps__li" aria-current={active ? "step" : undefined}>
            <Node className={`lv-steps__item lv-steps__node${done ? " is-done" : active ? " is-active" : ""}${clickable ? " is-link" : ""}`} {...nodeProps}>
              <span className="lv-steps__dot">
                {done
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  : num}
              </span>
              <span className="lv-steps__label">{label}</span>
            </Node>
          </li>
        );
      })}
    </ol>
  );
}

// ── Step 1: choose a document ─────────────────────────────────────────────────
function Step1({ docTypes, selected, onSelect, error }) {
  const { t } = useLanguage();
  return (
    <section className="bz-card">
      <h3 className="bz-heading">{t("doc_choose_title", "Choose the document you need")}</h3>
      <p className="bz-text">{t("doc_step1_hint", "Select the document you need. You must choose one to proceed.")}</p>

      <div className="dz-docs" role="radiogroup" aria-label={t("doc_documents", "Documents")}>
        {docTypes.map(d => {
          const isSel = selected?.id === d.id;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={isSel}
              key={d.id}
              className={`dz-doc${isSel ? " is-active" : ""}`}
              onClick={() => onSelect(d)}
            >
              <span className="dz-doc__icon">{d.icon || <Ico size={26}>{ICONS.doc}</Ico>}</span>
              <span className="dz-doc__body">
                <span className="dz-doc__name">{d.documentName || d.title || d.name}</span>
                <span className="dz-doc__desc">{d.description || d.desc}</span>
                <DocMeta doc={d} className="dz-doc__pills" />
              </span>
              <span className="dz-doc__check">
                {isSel && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </span>
            </button>
          );
        })}
      </div>

      {error && <div className="bf-error" style={{ marginTop: "0.8rem" }}>{error}</div>}
    </section>
  );
}

// ── Step 2: your details ──────────────────────────────────────────────────────
function Step2({ docType, form, setForm, errors, setErrors }) {
  const { t, language } = useLanguage();
  const [previewUrl, setPreviewUrl] = useState(null);
  const extraFields = docType?.customFields || [];
  const purposeOptions = docType?.purposeOptions || [];

  // Removes a single field's error (no-op if it has none)
  const clearError = (k) =>
    setErrors(prev => {
      if (!prev[k]) return prev;
      const { [k]: _removed, ...rest } = prev;
      return rest;
    });

  // Sets the value, and removes that field's error once it has a valid value
  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));

    const isValid =
      typeof v === "boolean" ? v
      : k === "contact" ? isValidPHMobile(v)
      : v !== null && v !== undefined && String(v).trim() !== "";

    if (isValid) clearError(k);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(t("doc_err_file_size", "File must be under 5MB."));
      e.target.value = ""; // allows re-selecting the same file later
      return;
    }
    set("validId", file.name);
    set("validIdFile", file);
    clearError("validId");

    setErrors(prev => {
      const { validId, ...rest } = prev;
      return rest;
    });

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const removeFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    set("validId", "");
    set("validIdFile", null);
    setPreviewUrl(null);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isPdf = form.validIdFile?.type === "application/pdf" || /\.pdf$/i.test(form.validId || "");
  const isOther = form.purposeOption === "Other";

  const reqPill = <span className="bf-pill bf-pill--req">{t("required", "Required")}</span>;
  const optPill = <span className="bf-pill">{t("optional", "Optional")}</span>;

  return (
    <section className="bz-card">
      <h3 className="bz-heading">{t("doc_your_details", "Your details")}</h3>
      <p className="bz-text">{t("doc_details_hint", "Check that your information is correct. Fill in anything that is empty.")}</p>

      {docType && (
        <div className="lv-chosen">
          <div className="lv-chosen__label">{t("doc_requesting_label", "You are requesting")}</div>
          <div className="lv-chosen__title">
            {docType.icon ? <span className="dz-chosen-icon">{docType.icon}</span> : null}
            {docType.documentName || docType.title || docType.name}
          </div>
          <DocMeta doc={docType} className="dz-chosen-pills" />
          {(docType.reminder || docType.note) && (
            <div className="dz-chosen-note">
              {localizeReminder(docType.reminder || docType.note, language)}
            </div>
          )}
        </div>
      )}

      <div className="bf-form">
        {/* ── Personal information ── */}
        <div className="bf-group">
          <div className="bf-group__title">{t("doc_personal_info", "Personal information")}</div>

          <div className="bf-form--tight">
            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-first">{t("doc_first_name", "First name")} {reqPill}</label>
              <input id="dz-first" className={`bf-input${errors.firstName ? " bf-input--error" : ""}`} value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Juan" />
              {errors.firstName && <div className="bf-error">{errors.firstName}</div>}
            </div>
            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-middle">{t("doc_middle_name", "Middle name")} {optPill}</label>
              <input id="dz-middle" className="bf-input" value={form.middleName} onChange={e => set("middleName", e.target.value)} placeholder="Santos" />
            </div>
            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-last">{t("doc_last_name", "Last name")} {reqPill}</label>
              <input id="dz-last" className={`bf-input${errors.lastName ? " bf-input--error" : ""}`} value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Dela Cruz" />
              {errors.lastName && <div className="bf-error">{errors.lastName}</div>}
            </div>

            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-dob">{t("profile_birthdate", "Date of birth")} {reqPill}</label>
              <input id="dz-dob" className={`bf-input${errors.dob ? " bf-input--error" : ""}`} type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
              {errors.dob && <div className="bf-error">{errors.dob}</div>}
            </div>
            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-civil">{t("profile_civil_status", "Civil status")}</label>
              <select id="dz-civil" className="bf-input bf-select" value={form.civilStatus} onChange={e => set("civilStatus", e.target.value)}>
                {CIVIL_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{t(s.labelKey, s.value)}</option>)}
              </select>
            </div>
            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-since">{t("doc_residing_since_year", "Living here since (year)")} {reqPill}</label>
              <input id="dz-since" className={`bf-input${errors.residingSince ? " bf-input--error" : ""}`} type="number" min="1900" max={new Date().getFullYear()} value={form.residingSince} onChange={e => set("residingSince", e.target.value)} placeholder={t("doc_residing_year_ph", "For example: 2010")} />
              {errors.residingSince && <div className="bf-error">{errors.residingSince}</div>}
            </div>

            <div className="bf-field">
              <label className="bf-label" htmlFor="dz-contact">{t("doc_phone_number", "Phone number")} {reqPill}</label>
              <input
                id="dz-contact"
                className={`bf-input${errors.contact ? " bf-input--error" : ""}`}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={11}
                value={form.contact}
                onChange={e => set("contact", normalizePHMobile(e.target.value))}
                placeholder="09123456789"
              />
              {errors.contact && <div className="bf-error">{errors.contact}</div>}
            </div>
            <div className="bf-field bf-field--span2">
              <label className="bf-label" htmlFor="dz-email">{t("profile_email", "Email")} {optPill}</label>
              <input id="dz-email" className="bf-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@email.com" />
            </div>

            <div className="bf-field bf-field--full">
              <label className="bf-label" htmlFor="dz-address">{t("doc_home_address", "Home address")} {reqPill}</label>
              <input id="dz-address" className={`bf-input${errors.address ? " bf-input--error" : ""}`} value={form.address} onChange={e => set("address", e.target.value)} placeholder={t("doc_address_ph", "House No., Street, Barangay Malanday, Valenzuela City")} />
              {errors.address && <div className="bf-error">{errors.address}</div>}
            </div>
          </div>
        </div>

        {/* ── Your request ── */}
        <div className="bf-group">
          <div className="bf-group__title">{t("doc_your_request", "Your request")}</div>

          <div className="bf-form--tight">
            <div className="bf-field bf-field--span2">
              <label className="bf-label" htmlFor="dz-purpose">{t("doc_why_need", "Why do you need this document?")} {reqPill}</label>
              <select
                id="dz-purpose"
                className={`bf-input bf-select${errors.purposeOption ? " bf-input--error" : ""}`}
                value={form.purposeOption}
                onChange={e => {
                  const val = e.target.value;
                  set("purposeOption", val);
                  if (val !== "Other") {
                    set("purposeOther", "");
                    clearError("purposeOther"); // "Other" box is hidden now, so its error should go too
                  }
                }}
              >
                <option value="">{t("doc_choose_list", "Choose from the list...")}</option>
                {purposeOptions.map(opt => <option key={opt} value={opt}>{localizePurpose(opt, language)}</option>)}
                <option value="Other">{t("doc_other", "Other")}</option>
              </select>
              {errors.purposeOption && <div className="bf-error">{errors.purposeOption}</div>}
            </div>

            {isOther && (
              <div className="bf-field">
                <label className="bf-label" htmlFor="dz-other">{t("doc_specify_reason", "Please tell us the reason")} {reqPill}</label>
                <input
                  id="dz-other"
                  className={`bf-input${errors.purposeOther ? " bf-input--error" : ""}`}
                  value={form.purposeOther}
                  onChange={e => set("purposeOther", e.target.value)}
                  placeholder={t("doc_reason_ph", "Write your reason here")}
                />
                {errors.purposeOther && <div className="bf-error">{errors.purposeOther}</div>}
              </div>
            )}

            <div className="bf-field bf-field--full">
              <div className="bf-label">{t("doc_valid_id", "Valid ID")} {reqPill}</div>
              <label className={`bf-photo${form.validId ? " is-filled" : ""}${errors.validId ? " is-error" : ""}`}>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} style={{ display: "none" }} />
                {previewUrl
                  ? <img className="dz-thumb" src={previewUrl} alt="Uploaded ID preview" />
                  : <Ico size={28}>{form.validId ? ICONS.check : ICONS.upload}</Ico>}
                <span className="bf-photo__text">
                  {form.validId ? (
                    <>
                      <strong>{t("doc_id_added", "ID added")}</strong>
                      <small>{[form.validId, isPdf ? "PDF" : t("doc_image", "Image"), formatSize(form.validIdFile?.size)].filter(Boolean).join(" · ")} · {t("doc_tap_change", "Tap to change")}</small>
                    </>
                  ) : (
                    <>
                      <strong>{t("doc_tap_add_id", "Tap here to add your ID")}</strong>
                      <small>{t("doc_id_guideline", "A photo or scan. JPG, PNG or PDF, up to 5MB")}</small>
                    </>
                  )}
                </span>
              </label>
              {form.validId && (
                <button type="button" className="bf-secondary dz-remove" onClick={removeFile}>{t("doc_remove_file", "Remove this file")}</button>
              )}
              {errors.validId && <div className="bf-error">{errors.validId}</div>}
            </div>
          </div>
        </div>

        {/* ── Document-specific fields ── */}
        {extraFields.length > 0 && (
          <div className="bf-group">
            <div className="bf-group__title">{t("doc_more_info_needed", "More information needed")}</div>

            <div className="bf-form--tight">
              {extraFields.map(f => {
                if (f.type === "checkbox") {
                  return (
                    <div className="bf-field bf-field--full" key={f.id}>
                      <label className={`bf-check${form[f.id] ? " is-on" : ""}${errors[f.id] ? " is-error" : ""}`}>
                        <input type="checkbox" className="bf-check__box" checked={!!form[f.id]} onChange={e => set(f.id, e.target.checked)} />
                        <span>{f.label} {f.required && <span className="bf-pill bf-pill--req">{t("required", "Required")}</span>}</span>
                      </label>
                      {errors[f.id] && <div className="bf-error">{errors[f.id]}</div>}
                    </div>
                  );
                }
                return (
                  <div className="bf-field" key={f.id}>
                    <label className="bf-label" htmlFor={`dz-x-${f.id}`}>{f.label} {f.required && <span className="bf-pill bf-pill--req">{t("required", "Required")}</span>}</label>
                    <input id={`dz-x-${f.id}`} className={`bf-input${errors[f.id] ? " bf-input--error" : ""}`} type={f.type || "text"} value={form[f.id] || ""} placeholder={f.placeholder || ""} onChange={e => set(f.id, e.target.value)} />
                    {errors[f.id] && <div className="bf-error">{errors[f.id]}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Step 3: review ────────────────────────────────────────────────────────────
function Step3({ docType, form }) {
  const { t, language } = useLanguage();
  const extraFields = docType?.customFields || [];
  const effectivePurpose = form.purposeOption === "Other"
    ? (form.purposeOther || t("doc_other", "Other"))
    : localizePurpose(form.purposeOption, language);

  const civilStatusLabel = form.civilStatus ? t("status_" + form.civilStatus.toLowerCase(), form.civilStatus) : form.civilStatus;

  const rows = [
    { label: t("doc_type", "Document Type"), value: docType?.documentName || docType?.title || docType?.name },
    { label: t("doc_full_name", "Full Name"), value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") },
    { label: t("profile_birthdate", "Date of Birth"), value: form.dob },
    { label: t("profile_civil_status", "Civil Status"), value: civilStatusLabel },
    { label: t("profile_residing_since", "Residing Since"), value: form.residingSince ? (typeof t("doc_residing_present") === "function" ? t("doc_residing_present", form.residingSince) : `${form.residingSince} up to present`) : "—" },
    { label: t("doc_address", "Address"), value: form.address },
    { label: t("profile_contact", "Contact Number"), value: form.contact },
    { label: t("profile_email", "Email"), value: form.email || "—" },
    { label: t("doc_purpose", "Purpose"), value: effectivePurpose || "—" },
    { label: t("doc_id_uploaded", "Valid ID Uploaded"), value: form.validId || "—" },
    ...extraFields.filter(f => f.type !== "checkbox").map(f => ({ label: f.label, value: form[f.id] || "—" })),
    ...extraFields.filter(f => f.type === "checkbox").map(f => ({ label: f.label, value: form[f.id] ? t("doc_confirmed", "✓ Confirmed") : t("doc_not_confirmed", "Not confirmed") })),
  ];

  return (
    <section className="bz-card">
      <h3 className="bz-heading">{t("doc_check_request", "Check your request")}</h3>
      <p className="bz-text">{t("doc_review_hint")}</p>

      <div className="bz-note dz-review-note">
        <span className="dz-banner__icon"><Ico size={26}>{ICONS.warning}</Ico></span>
        <div>{t("doc_review_validity")}</div>
      </div>

      <dl className="lv-review">
        {rows.map((r, i) => (
          <div key={i} className="lv-review__row">
            <dt>{r.label}</dt>
            <dd>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// ── Step 4: done ──────────────────────────────────────────────────────────────
function Step4({ refNum, onReset }) {
  const { t } = useLanguage();
  return (
    <section className="bz-card">
      <div className="bf-done">
        <span className="bf-done__icon"><BigCheck /></span>
        <h3 className="bz-heading">{t("doc_submitted_title", "Request Submitted!")}</h3>
        <p className="bz-text">{t("doc_submitted_sub", "Your document request has been received by the barangay.")}</p>

        <div className="bt-ref">
          <div className="bt-ref__label">{t("reference_number", "Reference Number")}</div>
          <div className="bt-ref__num">{refNum}</div>
        </div>

        <ul className="dz-info">
          <li><span className="dz-info__icon"><Ico size={22}>{ICONS.phone}</Ico></span><span>{t("doc_sms_notif", "You will receive an SMS notification once your request is processed.")}</span></li>
          <li><span className="dz-info__icon"><Ico size={22}>{ICONS.clock}</Ico></span><span>{t("doc_processing_time", "Processing time: 2–3 business days.")}</span></li>
          <li className="is-warn"><span className="dz-info__icon"><Ico size={22}>{ICONS.warning}</Ico></span><span>{t("doc_validity_note", "Your document will be valid for 6 months from the date of issuance.")}</span></li>
        </ul>

        <button type="button" className="bf-submit dz-again" onClick={onReset}>{t("doc_submit_another", "Submit Another Request")}</button>
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DocumentsTab({ userData, householdID, userName }) {
  const residentID = userData?.residentID || userData?.id || getSaved("memberID", null);
  const [docTypes, setDocTypes] = useState([]);
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState(null);
  const [errors, setErrors] = useState({});
  const [refNum, setRefNum] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topRef = useRef(null);
  const mounted = useRef(false);
  const { t } = useLanguage();
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    dob: "", civilStatus: "Single", address: "",
    contact: "", email: "",
    residingSince: "", purposeOption: "", purposeOther: "", validId: "", validIdFile: null,
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "documents"), (snapshot) => {
      setDocTypes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const loadResidentData = useCallback(async () => {
    let sourceData = userData;

    if (!sourceData || (!sourceData.firstName && !sourceData.lastName)) {
      try {
        const sessionData = JSON.parse(localStorage.getItem("brgy_session") || "{}");
        if (sessionData.firstName || sessionData.lastName) {
          sourceData = sessionData;
        }
      } catch (err) {
        console.error("Failed to parse session data:", err);
      }
    }

    if ((!sourceData || !sourceData.firstName) && householdID && residentID) {
      try {
        const resSnap = await getDoc(doc(db, "households", householdID, "residents", residentID));
        if (resSnap.exists()) {
          sourceData = resSnap.data();
        }
      } catch (err) {
        console.error("Failed to fetch resident from Firestore:", err);
      }
    }

    if (sourceData) {
      const rawRes = sourceData.residentData || sourceData;
      const fullAddress = rawRes.address || [rawRes.houseNumber, rawRes.street, rawRes.barangay || "Malanday", rawRes.city || "Valenzuela City"]
        .filter(Boolean).join(", ");

      setForm(f => ({
        ...f,
        firstName: rawRes.firstName || "",
        middleName: rawRes.middleName || "",
        lastName: rawRes.lastName || "",
        dob: rawRes.birthDate || rawRes.dob || "",
        civilStatus: rawRes.civilStatus || "Single",
        address: fullAddress || "",
        contact: normalizePHMobile(rawRes.contactNumber ?? rawRes.contact ?? ""),
        email: rawRes.email || "",
        residingSince: rawRes.residingSinceYear ? String(rawRes.residingSinceYear) : (rawRes.residingSince || ""),
      }));
    }
  }, [userData, householdID, residentID]);

  useEffect(() => {
    loadResidentData();
  }, [loadResidentData]);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const validateStep1 = () => {
    if (!docType) {
      setErrors({ docType: t("doc_err_select", "Please select a document type.") });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = t("doc_err_required", "Required.");
    if (!form.lastName.trim()) e.lastName = t("doc_err_required", "Required.");
    if (!form.dob) e.dob = t("doc_err_required", "Required.");
    if (!form.address.trim()) e.address = t("doc_err_required", "Required.");
    if (!isValidPHMobile(form.contact)) e.contact = t("doc_err_phone", "Contact number must be exactly 11 digits (09XXXXXXXXX).");
    if (!form.residingSince) e.residingSince = t("doc_err_required", "Required.");
    if (!form.purposeOption) e.purposeOption = t("doc_err_required", "Required.");
    if (form.purposeOption === "Other" && !form.purposeOther?.trim()) {
      e.purposeOther = t("doc_err_specify_purpose", "Please specify your purpose.");
    }
    if (!form.validId) e.validId = t("doc_err_upload_id", "Please upload a valid ID.");
    const extra = docType?.customFields || [];
    extra.forEach(f => {
      if (!f.required) return;
      if (f.type === "checkbox") {
        if (!form[f.id]) e[f.id] = t("doc_err_confirm", "You must confirm this to proceed.");
      } else {
        if (!form[f.id]?.toString().trim()) e[f.id] = t("doc_err_required", "Required.");
      }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    setErrors({});
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;

    if (step === 3) {
      setIsSubmitting(true);
      try {
        let uploadedIdUrl = null;
        if (form.validIdFile) {
          const formData = new FormData();
          formData.append("file", form.validIdFile);
          formData.append("upload_preset", "3Sense+_ID");
          const cloudName = "dfnqeiksu";
          const cloudinaryResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: "POST", body: formData }
          );
          if (!cloudinaryResponse.ok) throw new Error("Failed to upload ID to Cloudinary");
          const cloudinaryData = await cloudinaryResponse.json();
          uploadedIdUrl = cloudinaryData.secure_url;
        }

        const customData = {};
        (docType.customFields || []).forEach(f => {
          if (form[f.id] !== undefined) customData[f.label] = form[f.id];
        });

        const effectivePurpose = form.purposeOption === "Other" ? form.purposeOther : form.purposeOption;
        const submissionForm = { ...form, purpose: effectivePurpose, validIdUrl: uploadedIdUrl };

        const generatedRef = await submitDocumentRequest(householdID, residentID || "", userName || "Unknown", docType, submissionForm, customData);
        setRefNum(generatedRef);

        const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") || userName || "Unknown";
        await createNotification(
          "document_requests",
          `New document request (${docType.documentName || docType.title || docType.name}) submitted by ${fullName}.`,
          form.email || fullName,
          generatedRef
        );

        setStep(4);
      } catch (error) {
        console.error("Failed to submit document request:", error);
        setErrors({ submit: t("doc_err_failed_submit", "Failed to submit. Please try again.") });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setStep(s => s + 1);
  };

  const handleReset = () => {
    setStep(1);
    setDocType(null);
    setErrors({});

    // Explicitly wipe the form clean BEFORE we load the resident data again
    setForm({
      firstName: "", middleName: "", lastName: "",
      dob: "", civilStatus: "Single", address: "",
      contact: "", email: "", residingSince: "",
      purposeOption: "", purposeOther: "",
      validId: "", validIdFile: null,
    });

    // Now trigger the auto-fill pulling strictly from the resident context
    loadResidentData();
  };

  const goToStep = (newStep) => {
    setErrors({});
    setStep(newStep);
  };

  return (
    <div className="dr-wizard dz-wizard">
      <div className="dr-wizard-header">
        <div className="dz-stepswrap"><StepIndicator step={step} onStepClick={goToStep} /></div>
      </div>

      <div className="dr-wizard-body">
        <div className={`dz-wrap${step === 2 ? " dz-wrap--wide" : ""}`} ref={topRef}>
          {(step === 1 || step === 2) && <ValidityReminderBanner />}

          {step === 1 && <Step1 docTypes={docTypes} selected={docType} onSelect={d => { setDocType(d); setErrors({}); }} error={errors.docType} />}
          {step === 2 && <Step2 docType={docType} form={form} setForm={setForm} errors={errors} setErrors={setErrors} />}
          {step === 3 && <Step3 docType={docType} form={form} />}
          {step === 4 && <Step4 refNum={refNum} onReset={handleReset} />}

          {errors.submit && <div className="bf-alert">{errors.submit}</div>}

          {step < 4 && (
            <div className="dz-actions">
              <button type="button" className="bf-submit" onClick={handleNext} disabled={isSubmitting}>
                {isSubmitting
                  ? t("doc_uploading", "Uploading ID...")
                  : (step === 3 ? t("doc_submit_btn", "Submit Request") : t("doc_next", "Next"))}
                {!isSubmitting && step < 3 && <ArrowRight />}
              </button>
              {step > 1 && (
                <button type="button" className="bf-secondary" onClick={() => goToStep(step - 1)} disabled={isSubmitting}>
                  <ArrowLeft /> {t("back", "Previous")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}