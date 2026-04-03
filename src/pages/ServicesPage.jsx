import { useState, useEffect } from "react";
import {ProgramsIcon, FacilitiesIcon, DocumentsIcon, ChevronRightIcon, ChevronLeftIcon, ServiceCheckCircleIcon, ServiceClockIcon, BuildingIcon, ServiceInfoIcon, ServicesMenuIcon, ServiceShieldIcon, HeartIcon, UsersIcon, ServiceAlertTriangleIcon, PhoneCallIcon, ServiceMapPinIcon, SendIcon, SirenIcon, BriefcaseIcon, BadgeIcon} from "./components/Icons";

// ── Programs Data ──
const PROGRAMS = [
  {
    id: 1, color: "teal", tag: "Student", status: "Open",
    title: "Local Scholarship Grant 2026",
    desc: "Financial assistance for qualified students enrolled in college or vocational courses. Deadline: April 15, 2026.",
    fullDesc: "The Barangay 3S+ Malanday Local Scholarship Grant provides financial assistance to qualified residents enrolled in college or TESDA-accredited vocational programs. Grantees receive a one-time stipend to help cover tuition and school supply costs for the current academic year.",
    date: "April 15, 2026", time: "8:00 AM – 5:00 PM",
    location: "Barangay 3S+ Hall, Malanday, Valenzuela City",
    demographic: "Students (College / Vocational)", slots: 50,
    requirements: ["Valid barangay ID", "School enrollment form", "1×1 ID photo", "Grade / transcript of records"],
  },
  {
    id: 2, color: "amber", tag: "Student", status: "Open",
    title: "Free Tutorial & Career Orientation",
    desc: "Free tutorial sessions and career orientation seminar for high school and college students. March 18–22.",
    fullDesc: "A week-long learning event offering free academic tutorial sessions in Math, Science, and English, followed by a career orientation seminar featuring guest speakers from various industries. Open to all high school and college students residing in Barangay Malanday.",
    date: "March 18–22, 2026", time: "1:00 PM – 5:00 PM",
    location: "Barangay Multi-Purpose Hall",
    demographic: "High School & College Students", slots: 80,
    requirements: ["Barangay residency", "Registration form (on-site)"],
  },
  {
    id: 3, color: "green", tag: "Senior / PWD", status: "Ongoing",
    title: "Senior Citizen Health Assistance",
    desc: "Monthly health monitoring and medicine subsidy for senior citizens aged 60 and above. Bring your senior ID.",
    fullDesc: "A monthly barangay health program offering free blood pressure monitoring, blood sugar testing, and medicine subsidies for senior citizens. A dedicated health team visits every second Saturday to provide consultations and dispense maintenance medicines.",
    date: "Every 2nd Saturday", time: "8:00 AM – 12:00 PM",
    location: "Barangay Health Center",
    demographic: "Senior Citizens (60 and above)", slots: null,
    requirements: ["Senior Citizen ID", "Health booklet (if available)"],
  },
  {
    id: 4, color: "purple", tag: "Senior / PWD", status: "Open",
    title: "PWD Social Welfare Assistance",
    desc: "Financial and social assistance for persons with disabilities. Submit PWD ID and medical certificate at the hall.",
    fullDesc: "This program provides financial and social welfare assistance to persons with disabilities (PWD) residing in Barangay Malanday. Qualified beneficiaries may receive cash assistance, assistive device referrals, and access to DSWD-linked programs.",
    date: "April 1–30, 2026", time: "8:00 AM – 5:00 PM (Weekdays)",
    location: "Barangay 3S+ Hall – Social Welfare Desk",
    demographic: "Persons with Disabilities (PWD)", slots: 30,
    requirements: ["PWD ID", "Medical certificate", "1×1 ID photo", "Barangay clearance"],
  },
  {
    id: 5, color: "teal", tag: "General", status: "Open",
    title: "Livelihood Training – April Batch",
    desc: "Free skills training on food processing and basic entrepreneurship for all residents. Registration until March 31.",
    fullDesc: "A free three-day livelihood training covering food processing techniques (longganisa, bottled goods) and basic entrepreneurship. Participants receive a training certificate and starter kit upon completion. Part of the DOLE-partnered barangay livelihood initiative.",
    date: "April 7–9, 2026", time: "9:00 AM – 4:00 PM",
    location: "Barangay Multi-Purpose Hall",
    demographic: "All Residents (18 and above)", slots: 40,
    requirements: ["Barangay ID", "Registration form (deadline: March 31)"],
  },
  {
    id: 6, color: "green", tag: "General", status: "Ongoing",
    title: "Community Health & Wellness Program",
    desc: "Weekly health and wellness activities including Zumba, free BP monitoring, and health lectures every Saturday.",
    fullDesc: "A weekly wellness program open to all barangay residents featuring Zumba fitness sessions, free blood pressure monitoring, health awareness lectures, and mental wellness tips. No registration required — just show up every Saturday morning at the barangay hall grounds.",
    date: "Every Saturday", time: "6:00 AM – 9:00 AM",
    location: "Barangay Hall Grounds",
    demographic: "All Residents", slots: null,
    requirements: ["No registration required", "Bring water and comfortable clothes"],
  },
];

// ── Facilities Data ──
const FACILITIES = [
  { id: 1, title: "Barangay Multi-Purpose Hall", capacity: "Up to 200 persons", hours: "8:00 AM – 9:00 PM", desc: "Spacious hall suitable for events, meetings, seminars, and community gatherings. Equipped with tables, chairs, and a stage.", available: true  },
  { id: 2, title: "Basketball Court",            capacity: "Up to 50 persons",  hours: "6:00 AM – 10:00 PM", desc: "Open-air basketball court available for recreational use, tournaments, and community sports events.",                    available: true  },
  { id: 3, title: "Health Center",               capacity: "Up to 30 persons",  hours: "8:00 AM – 5:00 PM",  desc: "Barangay health center for consultations, immunizations, and prenatal check-ups. Walk-in and appointment basis.",      available: false },
];

// ── Document Icons ──
const DocIconClearance    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const DocIconEmployment   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>;
const DocIconLegal        = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><path d="M8 14l2.5-2.5M12 8v2M9.5 11.5l5-5"/></svg>;
const DocIconIndigency    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const DocIconGoodMoral    = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
const DocIconFirstJob     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
const DocIconMarriage     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const DocIconPedicab      = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
const DocIconDeath        = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
const DocIconBuilding     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M9 22V12h6v10"/><path d="M2 7h20"/><path d="M2 12h20"/></svg>;
const DocIconBailBond     = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>;

const DOC_TYPES = [
  { id: "clearance",            icon: <DocIconClearance />,  name: "Barangay Clearance",          desc: "General barangay clearance",       fee: "₱50",    days: "Same day",  note: "Valid only when filed and approved by the Office of the Punong Barangay." },
  { id: "clearance_employment", icon: <DocIconEmployment />, name: "Clearance for Employment",    desc: "For job application use",          fee: "₱70",    days: "Same day",  note: "Specify employer name in the Purpose field." },
  { id: "clearance_legal",      icon: <DocIconLegal />,      name: "Certificate – Legal Purpose", desc: "For court and legal use",          fee: "₱50",    days: "Same day",  note: "Include details of legal matter in the Purpose field." },
  { id: "indigency",            icon: <DocIconIndigency />,  name: "Certificate of Indigency",    desc: "For financial assistance",         fee: "Free",   days: "Same day",  note: "THIS CERTIFICATION IS FREE OF CHARGE." },
  { id: "goodmoral",            icon: <DocIconGoodMoral />,  name: "Certificate of Good Moral",   desc: "Character certificate",            fee: "₱50",    days: "Same day",  note: "THIS CERTIFICATION IS FREE OF CHARGE." },
  { id: "firstjob",             icon: <DocIconFirstJob />,   name: "First Time Job Seeker",       desc: "For employment assistance",        fee: "Free",   days: "Same day",  note: "Can only be availed ONCE. Requires signing of Oath of Undertaking in the presence of the Barangay Council." },
  { id: "marriage",             icon: <DocIconMarriage />,   name: "Marriage Certification",      desc: "For marriage application",         fee: "₱50",    days: "Same day",  note: "THIS CERTIFICATION IS FREE OF CHARGE." },
  { id: "pedicab",              icon: <DocIconPedicab />,    name: "Pedicab Permit",              desc: "Pedicab driver clearance",         fee: "₱60",    days: "1–2 days", note: "Bring your Community Tax Certificate and pedicab registration documents." },
  { id: "death",                icon: <DocIconDeath />,      name: "Death Assistance Certificate",desc: "For deceased resident",            fee: "Free",   days: "Same day",  note: "THIS CERTIFICATION IS FREE OF CHARGE." },
  { id: "building",             icon: <DocIconBuilding />,   name: "Building Permit Endorsement", desc: "Construction clearance",          fee: "₱1,000", days: "2–3 days", note: "Excavation and Restoration fees apply. Bring complete project plans." },
  { id: "bailbond",             icon: <DocIconBailBond />,   name: "Bail Bond Certificate",       desc: "For bail bond purposes",           fee: "₱50",    days: "Same day",  note: "THIS CERTIFICATION IS FREE OF CHARGE." },
];

const EXTRA_FIELDS = {
  clearance: [],
  clearance_employment: [
    { key: "employer_name", label: "Employer / Company Name", required: true, placeholder: "e.g. ABC Corporation" },
  ],
  clearance_legal: [
    { key: "legal_details", label: "Details of Legal Matter", required: true, placeholder: "e.g. For filing of civil case, court proceedings..." },
  ],
  indigency: [
    { key: "assistance_type", label: "Type of Assistance Needed (DSWD Requirement)", required: true, placeholder: "e.g. Medical assistance, burial assistance, scholarship..." },
    { key: "recipient_name",  label: "Recipient of Assistance", required: true, placeholder: "Full name of person receiving the assistance" },
  ],
  goodmoral: [],
  firstjob: [
    { key: "age",          label: "Age",                         required: true,  placeholder: "e.g. 20", type: "number" },
    { key: "oath_confirm", label: "I confirm that this is my FIRST TIME availing of RA 11261 and I have not previously availed of this benefit.", required: true, type: "checkbox" },
  ],
  marriage: [
    { key: "fiance_name",    label: "Name of Fiancé / Fiancée",    required: true, placeholder: "Full name" },
    { key: "fiance_address", label: "Address of Fiancé / Fiancée", required: true, placeholder: "Complete address" },
  ],
  pedicab: [
    { key: "owner_name", label: "Owner's Full Name", required: true, placeholder: "Name of pedicab owner" },
    { key: "pru_number", label: "P.R.U. Number",     required: true, placeholder: "e.g. PRU-0001" },
  ],
  death: [
    { key: "deceased_name",   label: "Deceased Person's Full Name", required: true,  placeholder: "Full name of the deceased" },
    { key: "date_of_death",   label: "Date of Death",               required: true,  type: "date" },
    { key: "requestor_name",  label: "Requestor's Full Name",       required: true,  placeholder: "Full name of person requesting" },
    { key: "request_purpose", label: "Purpose of Request",          required: true,  placeholder: "e.g. For burial assistance, legal purposes..." },
  ],
  building: [
    { key: "project_desc",    label: "Project Description",            required: true,  placeholder: "e.g. Construction of residential house" },
    { key: "project_address", label: "Project / Construction Address", required: true,  placeholder: "Exact address of the project" },
    { key: "rep_name",        label: "Representative Name",            required: false, placeholder: "If represented by another person (optional)" },
  ],
  bailbond: [
    { key: "bail_for",     label: "Bail Bond For (Full Name of Person)", required: true, placeholder: "Full name of the person being bailed" },
    { key: "bail_purpose", label: "Court / Case Details",               required: true, placeholder: "e.g. RTC Branch 172, Criminal Case No. XXXX" },
  ],
};

const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated"];
const STEP_LABELS  = ["Select Document", "Personal Details", "Review", "Done"];

// ── Step Indicator ──
function StepIndicator({ step }) {
  return (
    <div className="dr-steps">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done   = num < step;
        const active = num === step;
        return (
          <div key={i} className="dr-step-item">
            <div className={`dr-step-circle${done ? " dr-step-circle--done" : active ? " dr-step-circle--active" : ""}`}>
              {done
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : num}
            </div>
            <span className={`dr-step-label${active ? " dr-step-label--active" : done ? " dr-step-label--done" : ""}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className={`dr-step-line${done ? " dr-step-line--done" : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Select Document ──
function Step1({ selected, onSelect }) {
  return (
    <div className="dr-step1">
      <p className="dr-step-hint">Select the document you need. You must choose one to proceed.</p>
      <div className="dr-doc-list">
        {DOC_TYPES.map(d => (
          <button
            key={d.id}
            className={`dr-doc-row${selected?.id === d.id ? " dr-doc-row--selected" : ""}`}
            onClick={() => onSelect(d)}
          >
            <div className="dr-doc-row__icon">{d.icon}</div>
            <div className="dr-doc-row__body">
              <div className="dr-doc-row__name">{d.name}</div>
              <div className="dr-doc-row__desc">{d.desc}</div>
            </div>
            <div className="dr-doc-row__meta">
              <span className="dr-doc-row__fee">{d.fee}</span>
              <span className="dr-doc-row__days">{d.days}</span>
            </div>
            <div className="dr-doc-row__check">
              {selected?.id === d.id
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              }
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Personal Details ──
function Step2({ docType, form, setForm, errors }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const extraFields = EXTRA_FIELDS[docType?.id] || [];

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File must be under 5MB."); return; }
    set("validId", file.name);
    set("validIdFile", file);
  };

  return (
    <div className="dr-step2">
      {docType && (
        <div className="dr-doc-selected-banner">
          <span className="dr-doc-selected-icon">{docType.icon}</span>
          <div>
            <div className="dr-doc-selected-name">{docType.name}</div>
            {docType.note && <div className="dr-doc-selected-note">{docType.note}</div>}
          </div>
        </div>
      )}

      <div className="dr-section-label">Basic Information</div>
      <div className="dr-field-row">
        <div className="dr-field">
          <label className="sv-label">First Name <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.firstName ? " sv-input--error" : ""}`} value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Juan" />
          {errors.firstName && <span className="sv-error-msg">{errors.firstName}</span>}
        </div>
        <div className="dr-field">
          <label className="sv-label">Middle Name</label>
          <input className="sv-input" value={form.middleName} onChange={e => set("middleName", e.target.value)} placeholder="Santos" />
        </div>
        <div className="dr-field">
          <label className="sv-label">Last Name <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.lastName ? " sv-input--error" : ""}`} value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Dela Cruz" />
          {errors.lastName && <span className="sv-error-msg">{errors.lastName}</span>}
        </div>
      </div>
      <div className="dr-field-row">
        <div className="dr-field">
          <label className="sv-label">Date of Birth <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.dob ? " sv-input--error" : ""}`} type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
          {errors.dob && <span className="sv-error-msg">{errors.dob}</span>}
        </div>
        <div className="dr-field">
          <label className="sv-label">Civil Status</label>
          <select className="sv-input sv-select" value={form.civilStatus} onChange={e => set("civilStatus", e.target.value)}>
            {CIVIL_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="dr-field">
          <label className="sv-label">Residing Since (Year) <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.residingSince ? " sv-input--error" : ""}`} type="number" min="1900" max="2026" value={form.residingSince} onChange={e => set("residingSince", e.target.value)} placeholder="e.g. 2010" />
          {errors.residingSince && <span className="sv-error-msg">{errors.residingSince}</span>}
        </div>
      </div>
      <div className="dr-field">
        <label className="sv-label">Complete Address <span className="sv-required">*</span></label>
        <input className={`sv-input${errors.address ? " sv-input--error" : ""}`} value={form.address} onChange={e => set("address", e.target.value)} placeholder="House No., Street, Barangay Malanday, Valenzuela City" />
        {errors.address && <span className="sv-error-msg">{errors.address}</span>}
      </div>
      <div className="dr-field-row">
        <div className="dr-field">
          <label className="sv-label">Contact Number <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.contact ? " sv-input--error" : ""}`} value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+63 912 345 6789" />
          {errors.contact && <span className="sv-error-msg">{errors.contact}</span>}
        </div>
        <div className="dr-field">
          <label className="sv-label">Email Address</label>
          <input className="sv-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@email.com" />
        </div>
        <div className="dr-field">
          <label className="sv-label">CTC Number <span className="sv-required">*</span></label>
          <input className={`sv-input${errors.ctc ? " sv-input--error" : ""}`} value={form.ctc} onChange={e => set("ctc", e.target.value)} placeholder="e.g. 01234567-2026" />
          {errors.ctc && <span className="sv-error-msg">{errors.ctc}</span>}
        </div>
      </div>
      <div className="dr-field">
        <label className="sv-label">Purpose <span className="sv-required">*</span></label>
        <textarea className={`sv-textarea${errors.purpose ? " sv-input--error" : ""}`} rows={3} value={form.purpose} onChange={e => set("purpose", e.target.value)} placeholder="State the purpose of this document request..." />
        {errors.purpose && <span className="sv-error-msg">{errors.purpose}</span>}
      </div>

      <div className="dr-section-label" style={{ marginTop: "1.5rem" }}>File Upload</div>
      <div className="dr-field">
        <label className="sv-label">Upload Valid ID <span className="sv-required">*</span></label>
        <label className={`dr-upload-box${errors.validId ? " dr-upload-box--error" : ""}`}>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} style={{ display: "none" }} />
          {form.validId ? (
            <div className="dr-upload-done">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{form.validId}</span>
            </div>
          ) : (
            <div className="dr-upload-placeholder">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <span>Click to upload</span>
              <span className="dr-upload-hint">JPG, PNG or PDF · Max 5MB</span>
            </div>
          )}
        </label>
        {errors.validId && <span className="sv-error-msg">{errors.validId}</span>}
      </div>

      {extraFields.length > 0 && (
        <>
          <div className="dr-section-label" style={{ marginTop: "1.5rem" }}>Additional Information</div>
          <div className="dr-field-row dr-field-row--wrap">
            {extraFields.map(f => {
              if (f.type === "checkbox") {
                return (
                  <div className="dr-field dr-field--full" key={f.key}>
                    <label className={`dr-checkbox-label${errors[f.key] ? " dr-checkbox-label--error" : ""}`}>
                      <input type="checkbox" checked={!!form[f.key]} onChange={e => set(f.key, e.target.checked)} className="dr-checkbox" />
                      <span>{f.label} {f.required && <span className="sv-required">*</span>}</span>
                    </label>
                    {errors[f.key] && <span className="sv-error-msg">{errors[f.key]}</span>}
                  </div>
                );
              }
              return (
                <div className="dr-field" key={f.key}>
                  <label className="sv-label">{f.label} {f.required && <span className="sv-required">*</span>}</label>
                  <input className={`sv-input${errors[f.key] ? " sv-input--error" : ""}`} type={f.type || "text"} value={form[f.key] || ""} placeholder={f.placeholder || ""} onChange={e => set(f.key, e.target.value)} />
                  {errors[f.key] && <span className="sv-error-msg">{errors[f.key]}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Step 3: Review ──
function Step3({ docType, form }) {
  const extraFields = EXTRA_FIELDS[docType?.id] || [];
  const rows = [
    { label: "Document Type",    value: docType?.name, full: true },
    { label: "Full Name",        value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") },
    { label: "Date of Birth",    value: form.dob },
    { label: "Civil Status",     value: form.civilStatus },
    { label: "Residing Since",   value: form.residingSince ? `${form.residingSince} up to present` : "—" },
    { label: "Address",          value: form.address, full: true },
    { label: "Contact Number",   value: form.contact },
    { label: "Email",            value: form.email || "—" },
    { label: "CTC Number",       value: form.ctc },
    { label: "Purpose",          value: form.purpose, full: true },
    { label: "Valid ID Uploaded",value: form.validId || "—" },
    ...extraFields.filter(f => f.type !== "checkbox").map(f => ({ label: f.label, value: form[f.key] || "—" })),
    ...extraFields.filter(f => f.type === "checkbox").map(f => ({ label: f.label, value: form[f.key] ? "✓ Confirmed" : "Not confirmed" })),
  ];

  return (
    <div className="dr-step3">
      <p className="dr-step-hint">Please review your information before submitting. All fields are read-only.</p>
      <div className="dr-review-grid">
        {rows.map((r, i) => (
          <div key={i} className={`dr-review-row${r.full ? " dr-review-row--full" : ""}`}>
            <span className="dr-review-label">{r.label}</span>
            <span className="dr-review-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step 4: Success ──
function Step4({ refNum, onReset }) {
  return (
    <div className="sv-success-wrap">
      <div className="sv-success-icon" style={{ width: 64, height: 64 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      </div>
      <h3 className="sv-success-title">Request Submitted!</h3>
      <p className="sv-success-sub">Your document request has been received by the barangay.</p>
      <div className="dr-ref-box">
        <span className="dr-ref-label">Reference Number</span>
        <span className="dr-ref-num">{refNum}</span>
      </div>
      <div className="dr-success-info">
        <div className="dr-success-info-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
          You will receive an SMS notification once your request is processed.
        </div>
        <div className="dr-success-info-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Processing time: 2–3 business days.
        </div>
      </div>
      <button className="sv-btn-primary" onClick={onReset}>Submit Another Request</button>
    </div>
  );
}

// ── Documents Tab ──
function DocumentsTab() {
  const [step, setStep]       = useState(1);
  const [docType, setDocType] = useState(null);
  const [errors, setErrors]   = useState({});
  const [refNum]              = useState(() => `BM-2026-${Math.floor(10000 + Math.random() * 90000)}`);
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    dob: "", civilStatus: "Single", address: "",
    contact: "", email: "", ctc: "",
    residingSince: "", purpose: "", validId: "", validIdFile: null,
  });

  const validateStep1 = () => {
    if (!docType) { setErrors({ docType: "Please select a document type." }); return false; }
    return true;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.firstName.trim())   e.firstName    = "Required.";
    if (!form.lastName.trim())    e.lastName     = "Required.";
    if (!form.dob)                e.dob          = "Required.";
    if (!form.address.trim())     e.address      = "Required.";
    if (!form.contact.trim())     e.contact      = "Required.";
    if (!form.ctc.trim())         e.ctc          = "Required.";
    if (!form.residingSince)      e.residingSince = "Required.";
    if (!form.purpose.trim())     e.purpose      = "Required.";
    if (!form.validId)            e.validId      = "Please upload a valid ID.";
    const extra = EXTRA_FIELDS[docType?.id] || [];
    extra.forEach(f => {
      if (!f.required) return;
      if (f.type === "checkbox") { if (!form[f.key]) e[f.key] = "You must confirm this to proceed."; }
      else { if (!form[f.key]?.toString().trim()) e[f.key] = "Required."; }
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    setErrors({});
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleReset = () => {
    setStep(1); setDocType(null); setErrors({});
    setForm({ firstName: "", middleName: "", lastName: "", dob: "", civilStatus: "Single", address: "", contact: "", email: "", ctc: "", residingSince: "", purpose: "", validId: "", validIdFile: null });
  };

  return (
    <div className="dr-wizard">
      <div className="dr-wizard-header"><StepIndicator step={step} /></div>
      <div className="dr-wizard-body">
        {step === 1 && <Step1 selected={docType} onSelect={d => { setDocType(d); setErrors({}); }} />}
        {errors.docType && <p className="sv-error-msg" style={{ padding: "0 1.5rem" }}>{errors.docType}</p>}
        {step === 2 && <Step2 docType={docType} form={form} setForm={setForm} errors={errors} />}
        {step === 3 && <Step3 docType={docType} form={form} />}
        {step === 4 && <Step4 refNum={refNum} onReset={handleReset} />}
      </div>
      {step < 4 && (
        <div className="dr-wizard-actions">
          {step > 1 ? <button className="sv-btn-ghost" onClick={() => { setErrors({}); setStep(s => s - 1); }}>Previous</button> : <div />}
          <button className="sv-btn-primary" onClick={handleNext}>{step === 3 ? "Submit Request" : "Next"}</button>
        </div>
      )}
    </div>
  );
}

// ── Calendar ──
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const RESERVED_DATES = ["2026-03-14","2026-03-15","2026-03-20"];
const PENDING_DATES  = ["2026-03-18","2026-03-22","2026-03-27"];

function Calendar({ selectedDate, onSelectDate }) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const getStatus = (d) => {
    const str = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    if (RESERVED_DATES.includes(str)) return "reserved";
    if (PENDING_DATES.includes(str))  return "pending";
    const date = new Date(viewYear, viewMonth, d);
    if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return "past";
    return "available";
  };

  const isSelected = (d) => {
    const str = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return str === selectedDate;
  };

  return (
    <div className="sv-calendar">
      <div className="sv-cal-nav">
        <button className="sv-cal-arrow" onClick={prevMonth}><ChevronLeftIcon /></button>
        <span className="sv-cal-title">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="sv-cal-arrow" onClick={nextMonth}><ChevronRightIcon /></button>
      </div>
      <div className="sv-cal-grid">
        {DAYS.map(d => <div key={d} className="sv-cal-day-label">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const status = getStatus(d);
          const sel = isSelected(d);
          return (
            <button key={d} className={`sv-cal-cell sv-cal-cell--${status}${sel ? " sv-cal-cell--selected" : ""}`}
              onClick={() => {
                if (status === "past") return;
                const str = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                onSelectDate(str, status);
              }}
              disabled={status === "past"}
            >{d}</button>
          );
        })}
      </div>
      <div className="sv-cal-legend">
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--available" />Available</span>
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--pending" />Pending</span>
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--reserved" />Reserved</span>
      </div>
    </div>
  );
}

// ── Reservation Form ──
function ReservationForm({ onBack, facility }) {
  const facilityName = facility?.title || "Barangay Multi-Purpose Hall";
  const facilityDesc = facility
    ? `Reserve a time slot for ${facility.title}. Approval is required before confirmation.`
    : "Reserve a facility for your event. Approval is required before confirmation.";

  const [form, setForm] = useState({ fullName: "Juan Dela Cruz", contactNumber: "+63 912 345 6789", purpose: "", date: "", startTime: "", endTime: "", attendees: "", notes: "" });
  const [dateStatus, setDateStatus] = useState(null);
  const [submitted, setSubmitted]   = useState(false);
  const [errors, setErrors]         = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.purpose.trim())  e.purpose   = "Purpose of use is required.";
    if (!form.date)            e.date      = "Please select a date.";
    if (!form.startTime)       e.startTime = "Start time is required.";
    if (!form.endTime)         e.endTime   = "End time is required.";
    if (form.startTime && form.endTime && form.startTime >= form.endTime) e.endTime = "End time must be after start time.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    if (dateStatus === "reserved") { setErrors({ date: "Selected date is not available." }); return; }
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="sv-success-wrap">
      <div className="sv-success-icon"><ServiceCheckCircleIcon /></div>
      <h3 className="sv-success-title">Reservation Submitted</h3>
      <p className="sv-success-sub">Your reservation request has been submitted and is awaiting barangay approval.</p>
      <div className="sv-status-badge"><ServiceClockIcon /> Pending Approval</div>
      <button className="sv-btn-outline" onClick={onBack}>Close</button>
    </div>
  );

  return (
    <div className="sv-form-wrap">
      <div className="sv-form-header">
        <div className="sv-form-header-icon"><BuildingIcon /></div>
        <div>
          <div className="sv-form-header-title">{facilityName} Reservation</div>
          <div className="sv-form-header-desc">{facilityDesc}</div>
        </div>
      </div>
      <div className="sv-form-body">
        <div className="sv-fields">
          <div className="sv-field-section-label">Requester Information</div>
          <div className="sv-field-row">
            <div className="sv-field">
              <label className="sv-label">Full Name</label>
              <input className="sv-input sv-input--readonly" value={form.fullName} readOnly />
            </div>
            <div className="sv-field">
              <label className="sv-label">Contact Number</label>
              <input className="sv-input sv-input--readonly" value={form.contactNumber} readOnly />
            </div>
          </div>
          <div className="sv-field-section-label" style={{ marginTop: "1.5rem" }}>Reservation Details</div>
          <div className="sv-field">
            <label className="sv-label">Purpose of Use <span className="sv-required">*</span></label>
            <input className={`sv-input${errors.purpose ? " sv-input--error" : ""}`} placeholder="e.g. Birthday celebration, community meeting..." value={form.purpose} onChange={e => { set("purpose", e.target.value); setErrors(p => ({...p, purpose: ""})); }} />
            {errors.purpose && <span className="sv-error-msg">{errors.purpose}</span>}
          </div>
          <div className="sv-field-row">
            <div className="sv-field">
              <label className="sv-label">Start Time <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.startTime ? " sv-input--error" : ""}`} type="time" value={form.startTime} onChange={e => { set("startTime", e.target.value); setErrors(p => ({...p, startTime: ""})); }} />
              {errors.startTime && <span className="sv-error-msg">{errors.startTime}</span>}
            </div>
            <div className="sv-field">
              <label className="sv-label">End Time <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.endTime ? " sv-input--error" : ""}`} type="time" value={form.endTime} onChange={e => { set("endTime", e.target.value); setErrors(p => ({...p, endTime: ""})); }} />
              {errors.endTime && <span className="sv-error-msg">{errors.endTime}</span>}
            </div>
          </div>
          <div className="sv-field">
            <label className="sv-label">Estimated Number of Attendees</label>
            <input className="sv-input" type="number" placeholder="e.g. 50" min="1" max="200" value={form.attendees} onChange={e => set("attendees", e.target.value)} />
          </div>
          <div className="sv-field">
            <label className="sv-label">Additional Notes <span className="sv-optional">(Optional)</span></label>
            <textarea className="sv-textarea" placeholder="Any special setup requirements, equipment needed, etc." rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>
        <div className="sv-calendar-col">
          <div className="sv-field-section-label">Select Date <span className="sv-required">*</span></div>
          <Calendar selectedDate={form.date} onSelectDate={(str, status) => { set("date", str); setDateStatus(status); setErrors(p => ({...p, date: ""})); }} />
          {errors.date && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{errors.date}</span>}
          {dateStatus === "reserved" && form.date && <div className="sv-cal-warning"><ServiceInfoIcon /> Selected time slot is not available.</div>}
          {dateStatus === "pending"  && form.date && <div className="sv-cal-warning sv-cal-warning--pending"><ServiceInfoIcon /> This date has a pending reservation.</div>}
          {dateStatus === "available" && form.date && <div className="sv-cal-info"><ServiceCheckCircleIcon /> Date is available.</div>}
        </div>
      </div>
      <div className="sv-form-actions">
        <button className="sv-btn-ghost" onClick={onBack}>Cancel</button>
        <button className="sv-btn-primary" onClick={handleSubmit}>Submit Reservation</button>
      </div>
    </div>
  );
}

// ── Program Detail Modal ──
const COLOR_MAP = {
  teal:   { bar: "#317D89", badge: "rgba(49,125,137,0.10)",  text: "#317D89" },
  amber:  { bar: "#BDBD64", badge: "rgba(189,189,100,0.15)", text: "#7a7200" },
  green:  { bar: "#2DB17B", badge: "rgba(45,177,123,0.10)",  text: "#1e8a5e" },
  purple: { bar: "#703381", badge: "rgba(112,51,129,0.10)",  text: "#703381" },
};

function ProgramModal({ program, onClose }) {
  const c = COLOR_MAP[program.color] || COLOR_MAP.teal;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pm-modal" role="dialog" aria-modal="true">
        <div className="pm-modal__bar" style={{ background: c.bar }} />
        <button className="pm-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="pm-scroll">
          <div className="pm-header">
            <div className="pm-header__tags">
              <span className="pm-badge" style={{ background: c.badge, color: c.text }}>{program.tag}</span>
              <span className={`sv-program-card__status sv-program-card__status--${program.status === "Open" ? "open" : "ongoing"}`}>{program.status}</span>
            </div>
            <h2 className="pm-title">{program.title}</h2>
            <p className="pm-fulldesc">{program.fullDesc}</p>
          </div>

          <div className="pm-details-grid">
            {[
              { icon: "calendar", label: "Date",             value: program.date },
              { icon: "clock",    label: "Time",             value: program.time },
              { icon: "pin",      label: "Location",         value: program.location },
              { icon: "users",    label: "For",              value: program.demographic },
              ...(program.slots ? [{ icon: "slots", label: "Available Slots", value: `${program.slots} slots` }] : []),
            ].map(item => (
              <div className="pm-detail-item" key={item.label}>
                <span className="pm-detail-icon">
                  {item.icon === "calendar" && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                  {item.icon === "clock"    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  {item.icon === "pin"      && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                  {item.icon === "users"    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  {item.icon === "slots"    && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                </span>
                <div>
                  <div className="pm-detail-label">{item.label}</div>
                  <div className="pm-detail-value">{item.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pm-section pm-section--last">
            <div className="pm-section-title">Requirements</div>
            <ul className="pm-req-list">
              {program.requirements.map((r, i) => (
                <li key={i} className="pm-req-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Programs Tab ──
function ProgramsTab() {
  const [activeProgram, setActiveProgram] = useState(null);
  return (
    <>
      <div className="sv-programs-grid">
        {PROGRAMS.map(p => (
          <div key={p.id} className={`sv-program-card sv-program-card--${p.color}`}>
            <div className="sv-program-card__bar" />
            <div className="sv-program-card__head">
              <span className="sv-program-card__tag">{p.tag}</span>
              <span className={`sv-program-card__status sv-program-card__status--${p.status === "Open" ? "open" : "ongoing"}`}>{p.status}</span>
            </div>
            <div className="sv-program-card__title">{p.title}</div>
            <div className="sv-program-card__desc">{p.desc}</div>
            <button className="sv-program-card__cta" onClick={() => setActiveProgram(p)}>Learn More <ChevronRightIcon /></button>
          </div>
        ))}
      </div>
      {activeProgram && <ProgramModal program={activeProgram} onClose={() => setActiveProgram(null)} />}
    </>
  );
}

// ── Facilities Tab ──
function FacilitiesTab({ onReserve }) {
  return (
    <div className="sv-facilities-list">
      {FACILITIES.map(f => (
        <div key={f.id} className="sv-facility-card">
          <div className="sv-facility-card__left">
            <div className="sv-facility-card__icon-wrap"><BuildingIcon /></div>
            <div>
              <div className="sv-facility-card__title">{f.title}</div>
              <div className="sv-facility-card__meta">
                <span>{f.capacity}</span>
                <span className="sv-facility-card__dot" />
                <span>{f.hours}</span>
              </div>
              <div className="sv-facility-card__desc">{f.desc}</div>
            </div>
          </div>
          <div className="sv-facility-card__right">
            <span className={`sv-avail-badge${f.available ? " sv-avail-badge--yes" : " sv-avail-badge--no"}`}>
              <span className="sv-avail-dot" />{f.available ? "Available" : "Unavailable"}
            </span>
            {f.available && (
              <button className="sv-btn-primary sv-btn-sm" onClick={() => onReserve(f)}>Reserve <ChevronRightIcon /></button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VAWC Decision Tree ──
function VAWCDecisionTree() {
  const [step, setStep]               = useState(null);
  const [caseChecked, setCaseChecked] = useState({});

  const CASE_REQS = [
    { id: "id",        label: "Valid Government-Issued ID (UMID, PhilSys, Passport, Driver's License)" },
    { id: "brgy",      label: "Barangay Clearance" },
    { id: "incident",  label: "Incident Report / Narrative (written account of what happened)" },
    { id: "medcert",   label: "Medical Certificate / Medico-Legal Report (from hospital or RHU)" },
    { id: "photos",    label: "Photos of injuries or damaged property (if available)" },
    { id: "witness",   label: "Witness statement or contact information (if applicable)" },
    { id: "affidavit", label: "Sworn Affidavit of Complaint (prepared at the barangay or police station)" },
  ];

  const BPO_STEPS = [
    { n: "1", title: "Go to the Barangay Hall",         desc: "Visit Barangay 3S+ Malanday during office hours. Look for the VAWC Desk or Barangay Secretary." },
    { n: "2", title: "Request a BPO Application Form",  desc: "Ask for a Barangay Protection Order (BPO) form. Fill it out completely. You may ask for assistance from the Barangay Social Worker." },
    { n: "3", title: "Submit the Application",          desc: "Submit the filled-out form along with your valid ID. The BPO is issued ex-parte — the other party does not need to be present." },
    { n: "4", title: "BPO is Issued Within 24 Hours",   desc: "By law (RA 9262), the Punong Barangay must issue the BPO within 24 hours of your application." },
    { n: "5", title: "Keep a Copy Safe",                desc: "Keep your BPO copy on you at all times. Violation of the BPO is punishable by imprisonment." },
  ];

  const HOTLINES = [
    { name: "PNP Emergency Hotline",              number: "911",              type: "emergency" },
    { name: "PNP Women & Children Protection",    number: "117",              type: "emergency" },
    { name: "DSWD Hotline",                       number: "8-888",            type: "support"   },
    { name: "PCW (Philippine Commission on Women)", number: "(02) 8735-1654", type: "support"   },
    { name: "DOH Mental Health Hotline",          number: "1553",             type: "support"   },
    { name: "Barangay 3S+ VAWC Desk",             number: "(044) 000-0000",   type: "local"     },
    { name: "Valenzuela City Social Welfare",     number: "(02) 8292-9200",   type: "local"     },
  ];

  const reset = () => { setStep(null); setCaseChecked({}); };

  if (step === null) return (
    <div className="vawc-tree">
      <div className="vawc-tree__start">
        <div className="vawc-q-icon vawc-q-icon--red"><ServiceAlertTriangleIcon /></div>
        <h3 className="vawc-q-title">Let us help you find the right support.</h3>
        <p className="vawc-q-sub">Answer a few quick questions and we will guide you to the right resources. Your answers are private and not stored.</p>
        <button className="vawc-start-btn" onClick={() => setStep("q1")}>Start ›</button>
      </div>
    </div>
  );

  if (step === "q1") return (
    <div className="vawc-tree">
      <div className="vawc-q-card vawc-q-card--urgent">
        <div className="vawc-q-icon vawc-q-icon--red"><ServiceAlertTriangleIcon /></div>
        <h3 className="vawc-q-title">Are you in immediate danger right now?</h3>
        <p className="vawc-q-sub">If you or your child is being hurt or threatened <strong>right now</strong>, please call for help immediately.</p>
        <div className="vawc-q-choices">
          <div className="vawc-danger-box">
            <div className="vawc-danger-label"><span className="vawc-dot vawc-dot--red" />YES — I am in danger right now</div>
            <div className="vawc-call-buttons">
              <a href="tel:911" className="vawc-call-btn vawc-call-btn--red"><PhoneCallIcon /> Call 911 — PNP Emergency</a>
              <a href="tel:117" className="vawc-call-btn vawc-call-btn--red vawc-call-btn--outline"><PhoneCallIcon /> Call 117 — PNP Women & Children</a>
            </div>
          </div>
          <button className="vawc-choice-btn vawc-choice-btn--safe" onClick={() => setStep("q2")}>
            <span className="vawc-dot vawc-dot--green" />No, I am currently safe — continue
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "q2") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q1")}>‹ Back</button>
      <div className="vawc-q-card">
        <div className="vawc-q-icon vawc-q-icon--teal"><ServiceShieldIcon /></div>
        <h3 className="vawc-q-title">What kind of help do you need?</h3>
        <p className="vawc-q-sub">Choose the option that best describes your situation.</p>
        <div className="vawc-q-choices">
          <button className="vawc-choice-btn" onClick={() => setStep("bpo")}>
            <span className="vawc-choice-letter">A</span>
            <div><div className="vawc-choice-title">I want them to stop hurting me (BPO)</div><div className="vawc-choice-desc">Get a Barangay Protection Order to keep the abuser away</div></div>
          </button>
          <button className="vawc-choice-btn" onClick={() => setStep("case")}>
            <span className="vawc-choice-letter">B</span>
            <div><div className="vawc-choice-title">I want to file a case</div><div className="vawc-choice-desc">Learn requirements for Medical-Legal & Police Blotter</div></div>
          </button>
          <button className="vawc-choice-btn" onClick={() => setStep("talk")}>
            <span className="vawc-choice-letter">C</span>
            <div><div className="vawc-choice-title">I need someone to talk to</div><div className="vawc-choice-desc">Connect with a social worker or counselor</div></div>
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "bpo") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--teal">
          <ServiceShieldIcon />
          <div><div className="vawc-result-title">Barangay Protection Order (BPO)</div><div className="vawc-result-sub">Issued within 24 hours · Free of charge · RA 9262</div></div>
        </div>
        <p className="vawc-result-note">A BPO is a legal order that prohibits the abuser from contacting, threatening, or harming you. It can be issued by the Barangay without needing to go to court first.</p>
        <div className="vawc-steps-list">
          {BPO_STEPS.map(s => (
            <div className="vawc-step-item" key={s.n}>
              <div className="vawc-step-num" style={{ background: "#317D89" }}>{s.n}</div>
              <div><div className="vawc-step-title">{s.title}</div><div className="vawc-step-desc">{s.desc}</div></div>
            </div>
          ))}
        </div>
        <div className="vawc-law-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Under <strong>RA 9262 (Anti-VAWC Act of 2004)</strong>, violation of a BPO is punishable by 30 days imprisonment. This protection is FREE.
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  if (step === "case") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <div><div className="vawc-result-title">Filing a Case — Requirements Checklist</div><div className="vawc-result-sub">For Medical-Legal Report & Police Blotter</div></div>
        </div>
        <p className="vawc-result-note">Prepare the following before going to the police station or prosecutor's office.</p>
        <div className="vawc-checklist">
          {CASE_REQS.map(r => (
            <label key={r.id} className={`vawc-check-item${caseChecked[r.id] ? " vawc-check-item--done" : ""}`}>
              <input type="checkbox" checked={!!caseChecked[r.id]} onChange={e => setCaseChecked(p => ({ ...p, [r.id]: e.target.checked }))} className="vawc-checkbox" />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
        <div className="vawc-checklist-progress">
          <div className="vawc-checklist-bar">
            <div className="vawc-checklist-fill" style={{ width: `${(Object.values(caseChecked).filter(Boolean).length / CASE_REQS.length) * 100}%` }} />
          </div>
          <span className="vawc-checklist-count">{Object.values(caseChecked).filter(Boolean).length} of {CASE_REQS.length} gathered</span>
        </div>
        <div className="vawc-where-to">
          <div className="vawc-where-title">Where to go:</div>
          <div className="vawc-where-items">
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#317D89" }} />Barangay Hall — for Barangay Blotter & BPO</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#703381" }} />PNP Women & Children Protection Desk — for Police Blotter</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#e03e3e" }} />Nearest Public Hospital / RHU — for Medico-Legal Certificate</div>
            <div className="vawc-where-item"><span className="vawc-where-dot" style={{ background: "#BDBD64" }} />City Prosecutor's Office — for filing the criminal complaint</div>
          </div>
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  if (step === "talk") return (
    <div className="vawc-tree">
      <button className="vawc-back-btn" onClick={() => setStep("q2")}>‹ Back</button>
      <div className="vawc-result-card">
        <div className="vawc-result-header vawc-result-header--green">
          <HeartIcon />
          <div><div className="vawc-result-title">You are not alone.</div><div className="vawc-result-sub">Trained counselors and social workers are here for you</div></div>
        </div>
        <p className="vawc-result-note">Reaching out takes courage. The following people and organizations are ready to listen and help — all conversations are confidential.</p>
        <div className="vawc-hotlines-list">
          {HOTLINES.filter(h => h.type === "support" || h.type === "local").map(h => (
            <div className="vawc-hotline-row" key={h.name}>
              <div className="vawc-hotline-icon" style={{ background: h.type === "local" ? "rgba(49,125,137,0.1)" : "rgba(45,177,123,0.1)", color: h.type === "local" ? "#317D89" : "#1e8a5e" }}>
                <PhoneCallIcon />
              </div>
              <div>
                <div className="vawc-hotline-name">{h.name}</div>
                <a href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} className="vawc-hotline-number">{h.number}</a>
              </div>
            </div>
          ))}
        </div>
        <button className="sv-btn-outline" style={{ marginTop: "1rem", fontSize: "0.8rem" }} onClick={reset}>← Start Over</button>
      </div>
    </div>
  );

  return null;
}

// ── VAWC Tab ──
function VAWCTab() {
  const HOTLINES_ALL = [
    { name: "PNP Emergency",               number: "911",              type: "emergency", desc: "For immediate life-threatening situations" },
    { name: "PNP Women & Children Desk",   number: "117",              type: "emergency", desc: "Specialized assistance for women and children" },
    { name: "DSWD Hotline",                number: "8-888",            type: "support",   desc: "Social welfare and protection services" },
    { name: "DOH Mental Health Hotline",   number: "1553",             type: "support",   desc: "Free mental health counseling, 24/7" },
    { name: "PCW (Phil. Commission on Women)", number: "(02) 8735-1654", type: "support", desc: "Women's rights and gender-based violence" },
    { name: "Barangay 3S+ VAWC Desk",      number: "(044) 000-0000",   type: "local",     desc: "Our barangay's dedicated VAWC officer" },
  ];

  return (
    <div className="vawc-page">
      <div className="svc-hero svc-hero--red">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><ServiceShieldIcon /></span>VAWC Protection</div>
            <h2 className="svc-hero__title">Violence Against Women & Children</h2>
            <p className="svc-hero__abbr">VAWC</p>
            <p className="svc-hero__sub">You deserve to be safe. If you or someone you know is experiencing abuse, help is available — confidentially and for free.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Protected under <strong>RA 9262</strong> — Anti-VAWC Act of 2004
            </div>
          </div>
        </div>
      </div>
      <div className="vawc-hotlines-strip">
        <div className="vawc-hotlines-strip__label"><PhoneCallIcon /> Emergency & Support Hotlines</div>
        <div className="vawc-hotlines-strip__grid">
          {HOTLINES_ALL.map(h => (
            <a key={h.name} href={`tel:${h.number.replace(/[^0-9+]/g, "")}`} className={`vawc-hotline-card vawc-hotline-card--${h.type}`}>
              <div className="vawc-hotline-card__icon"><PhoneCallIcon /></div>
              <div>
                <div className="vawc-hotline-card__number">{h.number}</div>
                <div className="vawc-hotline-card__name">{h.name}</div>
                <div className="vawc-hotline-card__desc">{h.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
      <div className="vawc-section">
        <div className="vawc-section__header">
          <div className="vawc-section__title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Guided Help — What Do You Need?
          </div>
          <p className="vawc-section__sub">Answer two short questions and we will show you exactly what to do next.</p>
        </div>
        <VAWCDecisionTree />
      </div>
    </div>
  );
}

// ── BOSCA Tab ──
function BOSCATab() {
  const BENEFITS = [
    "20% discount on medicines, medical services, and basic necessities",
    "Free medical and dental consultations at public health centers",
    "Priority lane in government offices and establishments",
    "Monthly Social Pension (for indigent senior citizens through DSWD)",
    "Income tax exemption on pension income",
    "Free transportation in government-owned public conveyances",
    "Discounts on leisure, recreation, and entertainment",
  ];

  return (
    <div className="bosca-page">
      <div className="svc-hero svc-hero--purple">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><UsersIcon /></span>Senior Citizens Association</div>
            <h2 className="svc-hero__title">Barangay Office for Senior Citizens Association</h2>
            <p className="svc-hero__abbr">BOSCA</p>
            <p className="svc-hero__sub">Serving and uplifting the dignity, rights, and welfare of senior citizens in our barangay community.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Governed by <strong>RA 9994</strong> & <strong>RA 7876</strong> — Senior Citizens Acts
            </div>
          </div>
        </div>
      </div>
      <div className="bosca-section">
        <div className="bosca-section__title">What is BOSCA?</div>
        <p className="bosca-section__body">BOSCA (Barangay Office for Senior Citizens Association) is the official senior citizens organization of Barangay 3S+ Malanday. It serves as the primary body that advocates for the rights, welfare, and active participation of elderly residents in barangay life.</p>
        <p className="bosca-section__body">Membership is open to all residents who are <strong>60 years old and above</strong>. The association coordinates directly with the Barangay Social Welfare and Development (BSWD) officer and the Barangay Council.</p>
        <div className="bosca-how-join">
          <div className="bosca-how-join__title">How to Join BOSCA</div>
          <div className="bosca-join-steps">
            <div className="bosca-join-step"><span className="bosca-join-num">1</span><span>Visit the Barangay Hall and ask for the BOSCA Membership Form</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">2</span><span>Bring a valid ID and proof of age (birth certificate or senior citizen ID)</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">3</span><span>Submit the completed form to the Barangay Social Welfare Desk</span></div>
            <div className="bosca-join-step"><span className="bosca-join-num">4</span><span>Receive your BOSCA membership card and OSCA ID</span></div>
          </div>
        </div>
      </div>
      <div className="bosca-section">
        <div className="bosca-section__title">Senior Citizen Benefits Under RA 9994</div>
        <p className="bosca-section__body">All registered senior citizens are entitled to the following benefits by law:</p>
        <ul className="bosca-benefits-list">
          {BENEFITS.map((b, i) => (
            <li key={i} className="bosca-benefit-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {b}
            </li>
          ))}
        </ul>
        <div className="bosca-note">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          To avail benefits, senior citizens must carry their OSCA ID. Lost or expired IDs may be renewed at the Barangay Hall.
        </div>
      </div>
    </div>
  );
}

// ── BSWD Tab ──
function BSWDTab() {
  const [reportForm, setReportForm]       = useState({ name: "", location: "", description: "", photo: "" });
  const [reportErrors, setReportErrors]   = useState({});
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [tipForm, setTipForm]             = useState({ about: "", tip: "", contact: "" });
  const [tipSubmitted, setTipSubmitted]   = useState(false);
  const [tipErrors, setTipErrors]         = useState({});

  const setR = (k, v) => setReportForm(f => ({ ...f, [k]: v }));
  const setT = (k, v) => setTipForm(f => ({ ...f, [k]: v }));

  const submitReport = () => {
    const e = {};
    if (!reportForm.location.trim())    e.location    = "Location is required.";
    if (!reportForm.description.trim()) e.description = "Please describe what you observed.";
    if (Object.keys(e).length) { setReportErrors(e); return; }
    setReportErrors({}); setReportSubmitted(true);
  };

  const submitTip = () => {
    const e = {};
    if (!tipForm.about.trim()) e.about = "Please describe who this is about.";
    if (!tipForm.tip.trim())   e.tip   = "Please share what you know.";
    if (Object.keys(e).length) { setTipErrors(e); return; }
    setTipErrors({}); setTipSubmitted(true);
  };

  return (
    <div className="bswd-page">
      <div className="svc-hero svc-hero--teal">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><HeartIcon /></span>Social Welfare & Development</div>
            <h2 className="svc-hero__title">Barangay Social Welfare and Development</h2>
            <p className="svc-hero__abbr">BSWD</p>
            <p className="svc-hero__sub">Providing social protection, welfare programs, and community development services to all residents of Barangay 3S+ Malanday.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Coordinating with <strong>DSWD</strong> — Department of Social Welfare and Development
            </div>
          </div>
          <div className="svc-hero__right">
            <div className="svc-hero__hotline-pill">
              <div className="svc-hero__hotline-item">
                <span className="svc-hero__hotline-label">BSWD Hotline</span>
                <a href="tel:044000000" className="svc-hero__hotline-num">(044) 000-0000</a>
              </div>
              <div className="svc-hero__hotline-sep" />
              <div className="svc-hero__hotline-item">
                <span className="svc-hero__hotline-label">DSWD National</span>
                <a href="tel:8888" className="svc-hero__hotline-num">8-888</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bswd-section">
        <div className="bswd-section__title"><ServiceMapPinIcon /> Report a Homeless or Displaced Person</div>
        <p className="bswd-section__sub">If you see a homeless or displaced individual who may need assistance, please let us know.</p>
        {reportSubmitted ? (
          <div className="bswd-submitted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <div className="bswd-submitted-title">Report Submitted</div>
              <div className="bswd-submitted-sub">Thank you. Our BSWD officer will follow up within 24–48 hours.</div>
            </div>
            <button className="sv-btn-outline" style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }} onClick={() => { setReportForm({ name: "", location: "", description: "", photo: "" }); setReportSubmitted(false); }}>Submit Another</button>
          </div>
        ) : (
          <div className="bswd-form-card">
            <div className="dr-field-row dr-field-row--wrap">
              <div className="dr-field">
                <label className="sv-label">Your Name <span className="sv-optional">(Optional)</span></label>
                <input className="sv-input" value={reportForm.name} onChange={e => setR("name", e.target.value)} placeholder="Leave blank to stay anonymous" />
              </div>
              <div className="dr-field">
                <label className="sv-label">Location of Person <span className="sv-required">*</span></label>
                <input className={`sv-input${reportErrors.location ? " sv-input--error" : ""}`} value={reportForm.location} onChange={e => setR("location", e.target.value)} placeholder="Street, landmark, or area" />
                {reportErrors.location && <span className="sv-error-msg">{reportErrors.location}</span>}
              </div>
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Description of Concern <span className="sv-required">*</span></label>
              <textarea className={`sv-textarea${reportErrors.description ? " sv-input--error" : ""}`} rows={3} value={reportForm.description} onChange={e => setR("description", e.target.value)} placeholder="Describe what you observed..." />
              {reportErrors.description && <span className="sv-error-msg">{reportErrors.description}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Photo <span className="sv-optional">(Optional)</span></label>
              <label className="dr-upload-box">
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && setR("photo", e.target.files[0].name)} />
                {reportForm.photo ? (
                  <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{reportForm.photo}</div>
                ) : (
                  <div className="dr-upload-placeholder">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Upload a photo</span><span className="dr-upload-hint">JPG or PNG · Max 5MB</span>
                  </div>
                )}
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="sv-btn-primary" onClick={submitReport}><SendIcon /> Submit Report</button>
            </div>
          </div>
        )}
      </div>

      <div className="bswd-section bswd-section--last">
        <div className="bswd-section__title"><SendIcon /> Send a Tip or Additional Information</div>
        <p className="bswd-section__sub">Do you have information about a homeless individual that could help us assist them?</p>
        {tipSubmitted ? (
          <div className="bswd-submitted">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2DB17B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div>
              <div className="bswd-submitted-title">Tip Received</div>
              <div className="bswd-submitted-sub">Your information has been forwarded to the BSWD officer. Thank you for caring.</div>
            </div>
            <button className="sv-btn-outline" style={{ fontSize: "0.75rem", padding: "0.4rem 0.9rem" }} onClick={() => { setTipForm({ about: "", tip: "", contact: "" }); setTipSubmitted(false); }}>Send Another</button>
          </div>
        ) : (
          <div className="bswd-form-card">
            <div className="dr-field">
              <label className="sv-label">Who is this about? <span className="sv-required">*</span></label>
              <input className={`sv-input${tipErrors.about ? " sv-input--error" : ""}`} value={tipForm.about} onChange={e => setT("about", e.target.value)} placeholder="Name (if known), description, or case reference" />
              {tipErrors.about && <span className="sv-error-msg">{tipErrors.about}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">What do you know? <span className="sv-required">*</span></label>
              <textarea className={`sv-textarea${tipErrors.tip ? " sv-input--error" : ""}`} rows={3} value={tipForm.tip} onChange={e => setT("tip", e.target.value)} placeholder="Share any information that may help..." />
              {tipErrors.tip && <span className="sv-error-msg">{tipErrors.tip}</span>}
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Your Contact (Optional)</label>
              <input className="sv-input" value={tipForm.contact} onChange={e => setT("contact", e.target.value)} placeholder="Phone or email — only if you wish to be contacted" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button className="sv-btn-primary" onClick={submitTip}><SendIcon /> Send Tip</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Peace & Order Tab ──
const INCIDENT_TYPES = [
  "Fight / Physical Altercation", "Noise Complaint", "Theft / Robbery",
  "Disturbance / Disorderly Conduct", "Public Intoxication", "Vandalism / Property Damage",
  "Illegal Parking / Obstruction", "Suspicious Person / Activity", "Domestic Dispute", "Other",
];

const URGENCY_LEVELS = [
  { value: "emergency", label: "🚨 Emergency",        desc: "Immediate danger to life or property" },
  { value: "urgent",    label: "⚠️ Urgent",            desc: "Needs response within the hour" },
  { value: "docs",      label: "📋 For Documentation", desc: "No immediate danger, for records only" },
];

const MOCK_REPORTS = {
  "PO-2026-11423": { type: "Noise Complaint",             location: "Purok 3, Near Sari-sari Store", date: "March 15, 2026", status: "resolved",  updates: ["March 15 – Report received", "March 15 – Tanod dispatched", "March 15 – Issue resolved"] },
  "PO-2026-98712": { type: "Fight / Physical Altercation",location: "Basketball Court Area",         date: "March 14, 2026", status: "responded", updates: ["March 14 – Report received", "March 14 – Tanod responded on-site"] },
  "PO-2026-55301": { type: "Suspicious Person / Activity",location: "Purok 7",                       date: "March 16, 2026", status: "received",  updates: ["March 16 – Report received, under review"] },
};

const STATUS_CONFIG = {
  received:  { label: "Received",  color: "#317D89", bg: "rgba(49,125,137,0.1)",   icon: "📥" },
  responded: { label: "Responded", color: "#BDBD64", bg: "rgba(189,189,100,0.15)", icon: "🚔" },
  resolved:  { label: "Resolved",  color: "#2DB17B", bg: "rgba(45,177,123,0.1)",   icon: "✅" },
};

function PeaceOrderTab() {
  const [view, setView]             = useState("home");
  const [refNum, setRefNum]         = useState("");
  const [trackInput, setTrackInput] = useState("");
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError]   = useState("");
  const [callExpanded, setCallExpanded] = useState(false);
  const [form, setForm] = useState({
    reporterName: "", isAnonymous: false, contact: "", reporterAddress: "",
    incidentType: "", location: "", date: "", time: "", description: "", urgency: "", photo: "",
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.incidentType)       e.incidentType = "Please select an incident type.";
    if (!form.location.trim())    e.location     = "Location is required.";
    if (!form.date)               e.date         = "Date is required.";
    if (!form.time)               e.time         = "Time is required.";
    if (!form.description.trim()) e.description  = "Please describe what happened.";
    if (!form.urgency)            e.urgency      = "Please select urgency level.";
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setRefNum(`PO-2026-${Math.floor(10000 + Math.random() * 90000)}`);
    setView("submitted");
  };

  const handleTrack = () => {
    setTrackError(""); setTrackResult(null);
    const key = trackInput.trim().toUpperCase();
    if (!key) { setTrackError("Please enter a reference number."); return; }
    const result = MOCK_REPORTS[key];
    if (result) { setTrackResult({ ...result, ref: key }); }
    else { setTrackError("No report found with that reference number. Please check and try again."); }
  };

  if (view === "home") return (
    <div className="po-page">
      <div className="svc-hero svc-hero--navy">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><SirenIcon /></span>Barangay Tanod</div>
            <h2 className="svc-hero__title">Peace & Order</h2>
            <p className="svc-hero__abbr">BARANGAY 3S+ MALANDAY</p>
            <p className="svc-hero__sub">Report incidents, request assistance, and help keep our community safe.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Barangay Tanod Unit · Barangay 3S+ Malanday, Valenzuela City
            </div>
          </div>
        </div>
      </div>

      <div className="po-hotline-section">
        <a href="tel:09273736727" className="po-hotline-btn" onClick={e => { e.preventDefault(); setCallExpanded(v => !v); }}>
          <div className="po-hotline-btn__pulse" />
          <div className="po-hotline-btn__icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
          </div>
          <div className="po-hotline-btn__text">
            <div className="po-hotline-btn__label">Emergency Hotline</div>
            <div className="po-hotline-btn__number">0927-373-6727</div>
            <div className="po-hotline-btn__sub">Call for immediate response!</div>
          </div>
          <div className="po-hotline-btn__chevron" style={{ transform: callExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </a>
        {callExpanded && (
          <div className="po-incident-types">
            <div className="po-incident-types__label">Call for any of these incidents:</div>
            <div className="po-incident-chips">
              {["⚔️ Fights","📢 Noise Complaints","🔓 Theft","😤 Disturbances","🍺 Public Intoxication"].map(i => (
                <span key={i} className="po-incident-chip">{i}</span>
              ))}
            </div>
            <a href="tel:09273736727" className="sv-btn-primary" style={{ marginTop: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
              Tap to Call Now
            </a>
          </div>
        )}
      </div>

      <div className="po-actions">
        <button className="po-action-card po-action-card--report" onClick={() => setView("report")}>
          <div className="po-action-card__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </div>
          <div className="po-action-card__title">File a Report</div>
          <div className="po-action-card__desc">Submit an incident report online. Anonymous reporting available.</div>
          <div className="po-action-card__cta">Start Report →</div>
        </button>
        <button className="po-action-card po-action-card--track" onClick={() => setView("track")}>
          <div className="po-action-card__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div className="po-action-card__title">Track a Report</div>
          <div className="po-action-card__desc">Check the status of a previously filed report using your reference number.</div>
          <div className="po-action-card__cta">Track Now →</div>
        </button>
      </div>
    </div>
  );

  if (view === "report") return (
    <div className="po-page">
      <div className="po-form-wrap">
        <div className="po-form-topbar">
          <button className="vawc-back-btn" onClick={() => { setView("home"); setErrors({}); }}>‹ Back</button>
          <div className="po-form-topbar__title">File an Incident Report</div>
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Reporter Information <span className="po-optional-badge">All fields optional</span></div>
          <label className="po-anon-toggle">
            <input type="checkbox" checked={form.isAnonymous} onChange={e => { set("isAnonymous", e.target.checked); if (e.target.checked) { set("reporterName",""); set("contact",""); set("reporterAddress",""); }}} className="dr-checkbox" />
            <span>Report anonymously — your identity will not be recorded</span>
          </label>
          {!form.isAnonymous && (
            <div className="dr-field-row" style={{ marginTop: "0.85rem" }}>
              <div className="dr-field">
                <label className="sv-label">Your Name</label>
                <input className="sv-input" value={form.reporterName} onChange={e => set("reporterName", e.target.value)} placeholder="Juan Dela Cruz" />
              </div>
              <div className="dr-field">
                <label className="sv-label">Contact Number</label>
                <input className="sv-input" value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+63 912 345 6789" />
              </div>
              <div className="dr-field">
                <label className="sv-label">Your Address</label>
                <input className="sv-input" value={form.reporterAddress} onChange={e => set("reporterAddress", e.target.value)} placeholder="Purok / Street" />
              </div>
            </div>
          )}
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Incident Information</div>
          <div className="dr-field-row" style={{ marginBottom: "0.85rem" }}>
            <div className="dr-field">
              <label className="sv-label">Type of Incident <span className="sv-required">*</span></label>
              <select className={`sv-input sv-select${errors.incidentType ? " sv-input--error" : ""}`} value={form.incidentType} onChange={e => set("incidentType", e.target.value)}>
                <option value="">Select incident type...</option>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.incidentType && <span className="sv-error-msg">{errors.incidentType}</span>}
            </div>
            <div className="dr-field">
              <label className="sv-label">Location <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.location ? " sv-input--error" : ""}`} value={form.location} onChange={e => set("location", e.target.value)} placeholder="Street, Purok, or landmark" />
              {errors.location && <span className="sv-error-msg">{errors.location}</span>}
            </div>
          </div>
          <div className="dr-field-row" style={{ marginBottom: "0.85rem" }}>
            <div className="dr-field">
              <label className="sv-label">Date <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.date ? " sv-input--error" : ""}`} type="date" value={form.date} onChange={e => set("date", e.target.value)} />
              {errors.date && <span className="sv-error-msg">{errors.date}</span>}
            </div>
            <div className="dr-field">
              <label className="sv-label">Time <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.time ? " sv-input--error" : ""}`} type="time" value={form.time} onChange={e => set("time", e.target.value)} />
              {errors.time && <span className="sv-error-msg">{errors.time}</span>}
            </div>
          </div>
          <div className="dr-field" style={{ marginBottom: "0.85rem" }}>
            <label className="sv-label">Description <span className="sv-required">*</span></label>
            <textarea className={`sv-textarea${errors.description ? " sv-input--error" : ""}`} rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what happened in detail..." />
            {errors.description && <span className="sv-error-msg">{errors.description}</span>}
          </div>
          <div className="dr-field" style={{ marginBottom: "0.85rem" }}>
            <label className="sv-label">Urgency Level <span className="sv-required">*</span></label>
            <div className="po-urgency-row">
              {URGENCY_LEVELS.map(u => (
                <button key={u.value} className={`po-urgency-btn${form.urgency === u.value ? " po-urgency-btn--active" : ""} po-urgency-btn--${u.value}`} onClick={() => set("urgency", u.value)}>
                  <span className="po-urgency-label">{u.label}</span>
                  <span className="po-urgency-desc">{u.desc}</span>
                </button>
              ))}
            </div>
            {errors.urgency && <span className="sv-error-msg">{errors.urgency}</span>}
          </div>
          <div className="dr-field">
            <label className="sv-label">Upload Photo <span className="sv-optional">(Optional)</span></label>
            <label className="dr-upload-box">
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && set("photo", e.target.files[0].name)} />
              {form.photo ? (
                <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{form.photo}</div>
              ) : (
                <div className="dr-upload-placeholder">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Upload photo evidence</span><span className="dr-upload-hint">JPG or PNG · Max 5MB</span>
                </div>
              )}
            </label>
          </div>
        </div>
        <div className="po-form-actions">
          <button className="sv-btn-ghost" onClick={() => { setView("home"); setErrors({}); }}>Cancel</button>
          <button className="sv-btn-primary" onClick={handleSubmit}><SendIcon /> Submit Report</button>
        </div>
      </div>
    </div>
  );

  if (view === "submitted") return (
    <div className="po-page">
      <div className="po-submitted-wrap">
        <div className="po-submitted-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        </div>
        <h3 className="po-submitted-title">Report Submitted</h3>
        <p className="po-submitted-sub">Your incident report has been received by the Barangay Tanod.</p>
        <div className="po-ref-box">
          <div className="po-ref-label">Your Reference Number</div>
          <div className="po-ref-num">{refNum}</div>
          <div className="po-ref-hint">Save this number to track your report's status</div>
        </div>
        <div className="po-submitted-notes">
          <div className="po-submitted-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
            Barangay Tanod will respond to your report.
          </div>
          <div className="po-submitted-note">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            For emergencies, call <strong>0927-373-6727</strong> directly.
          </div>
        </div>
        <div className="po-submitted-btns">
          <button className="sv-btn-outline" onClick={() => { setTrackInput(refNum); setView("track"); }}>Track This Report</button>
          <button className="sv-btn-ghost" onClick={() => { setView("home"); setForm({ reporterName:"", isAnonymous:false, contact:"", reporterAddress:"", incidentType:"", location:"", date:"", time:"", description:"", urgency:"", photo:"" }); }}>Done</button>
        </div>
      </div>
    </div>
  );

  if (view === "track") return (
    <div className="po-page">
      <div className="po-form-wrap">
        <div className="po-form-topbar">
          <button className="vawc-back-btn" onClick={() => { setView("home"); setTrackResult(null); setTrackError(""); }}>‹ Back</button>
          <div className="po-form-topbar__title">Track a Report</div>
        </div>
        <div className="po-form-section">
          <div className="po-form-section__title">Enter your Reference Number</div>
          <div className="po-track-input-row">
            <input className="sv-input" value={trackInput} onChange={e => { setTrackInput(e.target.value.toUpperCase()); setTrackError(""); setTrackResult(null); }}
              placeholder="e.g. PO-2026-12345" onKeyDown={e => e.key === "Enter" && handleTrack()}
              style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, letterSpacing: "0.05em" }} />
            <button className="sv-btn-primary" onClick={handleTrack}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Search
            </button>
          </div>
          {trackError && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{trackError}</span>}
          <div className="po-track-hint">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Try: <strong>PO-2026-11423</strong>, <strong>PO-2026-98712</strong>, or <strong>PO-2026-55301</strong>
          </div>
        </div>
        {trackResult && (() => {
          const sc = STATUS_CONFIG[trackResult.status];
          return (
            <div className="po-track-result">
              <div className="po-track-result__header">
                <div className="po-track-result__ref">{trackResult.ref}</div>
                <span className="po-status-badge" style={{ background: sc.bg, color: sc.color }}>{sc.icon} {sc.label}</span>
              </div>
              <div className="po-track-details">
                <div className="po-track-detail"><span className="po-track-detail__label">Incident Type</span><span className="po-track-detail__value">{trackResult.type}</span></div>
                <div className="po-track-detail"><span className="po-track-detail__label">Location</span><span className="po-track-detail__value">{trackResult.location}</span></div>
                <div className="po-track-detail"><span className="po-track-detail__label">Date Filed</span><span className="po-track-detail__value">{trackResult.date}</span></div>
              </div>
              <div className="po-timeline">
                <div className="po-timeline__title">Status Timeline</div>
                {trackResult.updates.map((u, i) => (
                  <div key={i} className="po-timeline-item">
                    <div className={`po-timeline-dot${i === trackResult.updates.length - 1 ? " po-timeline-dot--active" : ""}`}
                      style={i === trackResult.updates.length - 1 ? { background: sc.color, borderColor: sc.color } : {}} />
                    {i < trackResult.updates.length - 1 && <div className="po-timeline-line" />}
                    <div className="po-timeline-text">{u}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );

  return null;
}

// ── Livelihood Tab ──
const LIVELIHOOD_PROGRAMS = [
  { id: 1, name: "Food Processing & Packaging",      desc: "Learn longganisa, bottled goods, and basic food safety standards.", date: "April 7–9, 2026",   time: "9:00 AM – 4:00 PM",  location: "Barangay Multi-Purpose Hall", slots: 40, enrolled: 27, tag: "Manufacturing", tagColor: "#1e8a5e" },
  { id: 2, name: "Basic Entrepreneurship & Negosyo", desc: "Fundamentals of starting a small business, pricing, and marketing.", date: "April 14–16, 2026", time: "1:00 PM – 5:00 PM",  location: "Barangay Multi-Purpose Hall", slots: 35, enrolled: 18, tag: "Business",     tagColor: "#1a56a0" },
  { id: 3, name: "Handicraft & Stitching Workshop",  desc: "Basic sewing, handicraft production, and product finishing techniques.", date: "April 21–23, 2026", time: "8:00 AM – 12:00 PM", location: "Barangay Hall — Room 2",      slots: 25, enrolled: 25, tag: "Crafts",       tagColor: "#703381" },
  { id: 4, name: "Urban Gardening & Organic Farming",desc: "Container gardening, composting, and selling produce locally.",     date: "May 5–6, 2026",    time: "7:00 AM – 11:00 AM", location: "Barangay Community Garden",   slots: 30, enrolled: 10, tag: "Agriculture", tagColor: "#ca8a04" },
];

const SAMPLE_REGS = [
  { regNum: "LH-2026-30142", program: "Food Processing & Packaging",      date: "April 7–9, 2026",   status: "confirmed" },
  { regNum: "LH-2026-10887", program: "Basic Entrepreneurship & Negosyo", date: "April 14–16, 2026", status: "pending"   },
];

const REG_STATUS = {
  pending:   { label: "Pending",   color: "#ca8a04", bg: "rgba(202,138,4,0.1)"  },
  confirmed: { label: "Confirmed", color: "#1e8a5e", bg: "rgba(30,138,94,0.1)"  },
  completed: { label: "Completed", color: "#5e7a99", bg: "rgba(94,122,153,0.1)" },
};

function LivelihoodTab() {
  const [view, setView]     = useState("main");
  const [step, setStep]     = useState(1);
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", address: "", contact: "", email: "", idFile: "", programId: "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedProgram = LIVELIHOOD_PROGRAMS.find(p => p.id === parseInt(form.programId));

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required.";
    if (!form.lastName.trim())  e.lastName  = "Required.";
    if (!form.address.trim())   e.address   = "Required.";
    if (!form.contact.trim())   e.contact   = "Required.";
    if (!form.idFile)           e.idFile    = "Please upload a valid ID or Barangay Clearance.";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.programId) e.programId = "Please select a program.";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) { setRegNum(`LH-2026-${Math.floor(10000 + Math.random() * 90000)}`); setStep(4); return; }
    setStep(s => s + 1);
  };

  const resetForm = () => { setStep(1); setErrors({}); setForm({ firstName:"", middleName:"", lastName:"", address:"", contact:"", email:"", idFile:"", programId:"" }); setView("main"); };

  const STEP_LABELS_LH = ["Personal Info", "Choose Program", "Confirmation"];

  if (view === "main") return (
    <div className="lh-page">
      <div className="svc-hero svc-hero--green">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BriefcaseIcon /></span>Barangay Livelihood Program</div>
            <h2 className="svc-hero__title">Livelihood Skills Training</h2>
            <p className="svc-hero__abbr">FREE · OPEN TO ALL RESIDENTS</p>
            <p className="svc-hero__sub">Build new skills, earn more, and grow your small business. All training programs are free for qualified Barangay 3S+ Malanday residents.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              In partnership with DOLE · Open to residents 18 and above
            </div>
          </div>
          <div className="svc-hero__right">
            <button className="sv-btn-primary" style={{ fontSize: "0.8rem" }} onClick={() => setView("myregs")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              My Registrations
            </button>
          </div>
        </div>
      </div>
      <div className="lh-programs-section">
        <div className="lh-section-label">Available Programs</div>
        <div className="lh-programs-grid">
          {LIVELIHOOD_PROGRAMS.map(p => {
            const slotsLeft = p.slots - p.enrolled;
            const full = slotsLeft <= 0;
            return (
              <div key={p.id} className={`lh-prog-card${full ? " lh-prog-card--full" : ""}`}>
                <div className="lh-prog-card__head">
                  <span className="lh-prog-card__tag" style={{ background: `${p.tagColor}15`, color: p.tagColor }}>{p.tag}</span>
                  <span className={`lh-prog-card__slots${full ? " lh-prog-card__slots--full" : slotsLeft <= 5 ? " lh-prog-card__slots--low" : ""}`}>{full ? "Full" : `${slotsLeft} slots left`}</span>
                </div>
                <div className="lh-prog-card__name">{p.name}</div>
                <div className="lh-prog-card__desc">{p.desc}</div>
                <div className="lh-prog-card__meta">
                  <span className="lh-prog-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{p.date}</span>
                  <span className="lh-prog-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{p.time}</span>
                </div>
                <div className="lh-prog-card__slots-bar">
                  <div className="lh-prog-card__slots-fill" style={{ width: `${(p.enrolled / p.slots) * 100}%`, background: full ? "#e03e3e" : slotsLeft <= 5 ? "#ca8a04" : "#1e8a5e" }} />
                </div>
                <button className="sv-btn-primary" disabled={full} style={{ fontSize: "0.78rem", marginTop: "0.75rem", width: "100%", justifyContent: "center", opacity: full ? 0.45 : 1 }}
                  onClick={() => { if (!full) { set("programId", String(p.id)); setView("register"); setStep(1); } }}>
                  {full ? "Program Full" : "Register Now →"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (view === "myregs") return (
    <div className="lh-page">
      <div className="po-form-topbar">
        <button className="vawc-back-btn" onClick={() => setView("main")}>‹ Back</button>
        <div className="po-form-topbar__title">My Registrations</div>
      </div>
      <div style={{ padding: "1.25rem 1.75rem" }}>
        <div className="lh-regs-list">
          {SAMPLE_REGS.map(r => {
            const sc = REG_STATUS[r.status];
            return (
              <div key={r.regNum} className="lh-reg-card">
                <div className="lh-reg-card__top">
                  <div><div className="lh-reg-card__program">{r.program}</div><div className="lh-reg-card__date">{r.date}</div></div>
                  <span className="lh-reg-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                <div className="lh-reg-card__ref">Ref: {r.regNum}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="lh-page">
      <div className="po-form-topbar">
        <button className="vawc-back-btn" onClick={() => { step > 1 ? setStep(s => s - 1) : setView("main"); setErrors({}); }}>‹ {step > 1 ? "Back" : "Back to Programs"}</button>
        <div className="po-form-topbar__title">Register for Training</div>
      </div>
      {step < 4 && (
        <div className="lh-steps">
          {STEP_LABELS_LH.map((label, i) => {
            const n = i + 1; const done = n < step; const active = n === step;
            return (
              <div key={i} className="dr-step-item">
                <div className={`dr-step-circle${done ? " dr-step-circle--done" : active ? " dr-step-circle--active" : ""}`}>
                  {done ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> : n}
                </div>
                <span className={`dr-step-label${active ? " dr-step-label--active" : done ? " dr-step-label--done" : ""}`}>{label}</span>
                {i < STEP_LABELS_LH.length - 1 && <div className={`dr-step-line${done ? " dr-step-line--done" : ""}`} />}
              </div>
            );
          })}
        </div>
      )}
      <div className="lh-form-body">
        {step === 1 && (
          <div className="lh-form-section">
            <div className="dr-field-row">
              <div className="dr-field"><label className="sv-label">First Name <span className="sv-required">*</span></label><input className={`sv-input${errors.firstName?" sv-input--error":""}`} value={form.firstName} onChange={e=>set("firstName",e.target.value)} placeholder="Juan" />{errors.firstName && <span className="sv-error-msg">{errors.firstName}</span>}</div>
              <div className="dr-field"><label className="sv-label">Middle Name</label><input className="sv-input" value={form.middleName} onChange={e=>set("middleName",e.target.value)} placeholder="Santos" /></div>
              <div className="dr-field"><label className="sv-label">Last Name <span className="sv-required">*</span></label><input className={`sv-input${errors.lastName?" sv-input--error":""}`} value={form.lastName} onChange={e=>set("lastName",e.target.value)} placeholder="Dela Cruz" />{errors.lastName && <span className="sv-error-msg">{errors.lastName}</span>}</div>
            </div>
            <div className="dr-field" style={{marginTop:"0.75rem"}}><label className="sv-label">Complete Address <span className="sv-required">*</span></label><input className={`sv-input${errors.address?" sv-input--error":""}`} value={form.address} onChange={e=>set("address",e.target.value)} placeholder="House No., Street, Barangay Malanday" />{errors.address && <span className="sv-error-msg">{errors.address}</span>}</div>
            <div className="dr-field-row" style={{marginTop:"0.75rem"}}>
              <div className="dr-field"><label className="sv-label">Contact Number <span className="sv-required">*</span></label><input className={`sv-input${errors.contact?" sv-input--error":""}`} value={form.contact} onChange={e=>set("contact",e.target.value)} placeholder="+63 912 345 6789" />{errors.contact && <span className="sv-error-msg">{errors.contact}</span>}</div>
              <div className="dr-field"><label className="sv-label">Email <span className="sv-optional">(Optional)</span></label><input className="sv-input" type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="juan@email.com" /></div>
            </div>
            <div className="dr-field" style={{marginTop:"0.75rem"}}>
              <label className="sv-label">Valid ID or Barangay Clearance <span className="sv-required">*</span></label>
              <label className={`dr-upload-box${errors.idFile?" dr-upload-box--error":""}`}>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:"none"}} onChange={e=>e.target.files[0]&&set("idFile",e.target.files[0].name)} />
                {form.idFile ? <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>{form.idFile}</div>
                : <div className="dr-upload-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>Click to upload</span><span className="dr-upload-hint">JPG, PNG or PDF · Max 5MB</span></div>}
              </label>
              {errors.idFile && <span className="sv-error-msg">{errors.idFile}</span>}
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="lh-form-section">
            <p className="dr-step-hint">Select the training program you want to join.</p>
            <div className="lh-prog-select-list">
              {LIVELIHOOD_PROGRAMS.map(p => {
                const slotsLeft = p.slots - p.enrolled; const full = slotsLeft <= 0; const selected = form.programId === String(p.id);
                return (
                  <button key={p.id} className={`lh-prog-select-item${selected?" lh-prog-select-item--active":""}${full?" lh-prog-select-item--disabled":""}`} disabled={full} onClick={() => !full && set("programId", String(p.id))}>
                    <div className="lh-prog-select-item__check">{selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}</div>
                    <div className="lh-prog-select-item__body">
                      <div className="lh-prog-select-item__name">{p.name} {full && <span className="lh-full-badge">Full</span>}</div>
                      <div className="lh-prog-select-item__meta">{p.date} · {p.time}</div>
                      <div className="lh-prog-select-item__meta">{p.location}</div>
                    </div>
                    <div className="lh-prog-select-item__slots" style={{color: full?"#e03e3e": slotsLeft<=5?"#ca8a04":"#1e8a5e"}}>{full ? "Full" : `${slotsLeft} left`}</div>
                  </button>
                );
              })}
            </div>
            {errors.programId && <span className="sv-error-msg" style={{marginTop:"0.5rem",display:"block"}}>{errors.programId}</span>}
          </div>
        )}
        {step === 3 && (
          <div className="lh-form-section">
            <p className="dr-step-hint">Review your information before submitting.</p>
            <div className="dr-review-grid">
              {[
                {label:"Full Name",  value:[form.firstName, form.middleName, form.lastName].filter(Boolean).join(" "), full:true},
                {label:"Address",    value:form.address, full:true},
                {label:"Contact",    value:form.contact},
                {label:"Email",      value:form.email||"—"},
                {label:"ID Uploaded",value:form.idFile||"—", full:true},
                {label:"Program",    value:selectedProgram?.name||"—", full:true},
                {label:"Date",       value:selectedProgram?.date||"—"},
                {label:"Time",       value:selectedProgram?.time||"—"},
                {label:"Location",   value:selectedProgram?.location||"—", full:true},
              ].map((r,i)=>(
                <div key={i} className={`dr-review-row${r.full?" dr-review-row--full":""}`}>
                  <span className="dr-review-label">{r.label}</span>
                  <span className="dr-review-value">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 4 && (
          <div className="lh-success-wrap">
            <div className="po-submitted-icon"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
            <h3 className="po-submitted-title">Registration Submitted!</h3>
            <p className="po-submitted-sub">You have successfully registered for <strong>{selectedProgram?.name}</strong>.</p>
            <div className="po-ref-box" style={{borderColor:"rgba(30,138,94,0.2)", background:"rgba(30,138,94,0.05)"}}>
              <div className="po-ref-label">Registration Number</div>
              <div className="po-ref-num" style={{color:"#1e8a5e"}}>{regNum}</div>
              <div className="po-ref-hint">Save this to track your registration status</div>
            </div>
            <div className="po-submitted-btns">
              <button className="sv-btn-primary" style={{background:"#1e8a5e"}} onClick={() => setView("myregs")}>View My Registrations</button>
              <button className="sv-btn-ghost" onClick={resetForm}>Done</button>
            </div>
          </div>
        )}
      </div>
      {step < 4 && (
        <div className="po-form-actions">
          <button className="sv-btn-ghost" onClick={() => { step > 1 ? setStep(s=>s-1) : setView("main"); setErrors({}); }}>{step === 1 ? "Cancel" : "Previous"}</button>
          <button className="sv-btn-primary" style={{background:"#1e8a5e"}} onClick={handleNext}>{step === 3 ? "Submit Registration" : "Next →"}</button>
        </div>
      )}
    </div>
  );
}

// ── BADAC Tab ──
const BADAC_STEPS_DATA = [
  { n: "1", icon: "🏛️", title: "Visit the BADAC Office",     desc: "Go to Barangay 3S+ Hall and look for the BADAC desk. Walk-in only — no appointment needed. All visits are strictly confidential." },
  { n: "2", icon: "📋", title: "Interview & Profiling",       desc: "A trained BADAC officer will conduct a private, non-judgmental interview to understand your situation and needs." },
  { n: "3", icon: "🔬", title: "Free Drug Testing",           desc: "Voluntary and free drug testing is available on-site. Results are confidential and will not be shared without your consent." },
  { n: "4", icon: "🏥", title: "Evaluation at VADAO",         desc: "If needed, you will be referred to VADAO (Valenzuela Anti-Drug Abuse Office) for further evaluation and support planning." },
  { n: "5", icon: "🤝", title: "Rehabilitation (If Needed)",  desc: "Appropriate rehabilitation programs will be recommended. These are voluntary, free, and tailored to your situation." },
];

const BADAC_FAQS_DATA = [
  { q: "Will my information be shared with police?",            a: "No. BADAC strictly follows confidentiality protocols. Your visit and information will not be disclosed to law enforcement without your explicit consent, unless required by a court order." },
  { q: "Is there any fee for BADAC services?",                  a: "All BADAC services are completely FREE — including counseling, drug testing, and rehabilitation referral." },
  { q: "Can I bring someone with me?",                          a: "Yes. You may bring a trusted family member or friend for support. All persons present are required to maintain confidentiality." },
  { q: "What if I am not a drug user but concerned about someone?", a: "You can visit the BADAC office for guidance on how to help a family member or loved one. Concerned citizens are welcome." },
  { q: "What is the difference between BADAC and the police?",  a: "BADAC is a barangay-level welfare body focused on rehabilitation and support — not law enforcement. Visiting BADAC is not the same as surrendering to police." },
];

function BADACTab() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="badac-page">
      <div className="svc-hero svc-hero--amber">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BadgeIcon /></span>Barangay Anti-Drug Abuse Council</div>
            <h2 className="svc-hero__title">BADAC — We're Here to Help</h2>
            <p className="svc-hero__abbr">BADAC</p>
            <p className="svc-hero__sub">All information shared with BADAC is strictly confidential. We are here to support, not to judge.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Governed by RA 9165 (Comprehensive Dangerous Drugs Act) · Voluntary participation only
            </div>
          </div>
        </div>
      </div>

      <div className="badac-confidential-banner">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <div>
          <div className="badac-confidential-banner__title">ALL INFORMATION IS STRICTLY CONFIDENTIAL</div>
          <div className="badac-confidential-banner__sub">Your visit, identity, and personal information will never be disclosed without your consent.</div>
        </div>
      </div>

      <div className="badac-hotline-section">
        <div className="badac-hotline-label">BADAC Hotline</div>
        <a href="tel:09000000000" className="badac-hotline-number">(044) 000-0000</a>
        <div className="badac-hotline-sub">Available Monday – Friday · 8:00 AM – 5:00 PM</div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Who Can Avail of BADAC Services?</div>
        <div className="badac-who-grid">
          <div className="badac-who-card"><span className="badac-who-icon">🔞</span><div className="badac-who-title">18 Years Old and Above</div><div className="badac-who-desc">Services are available to adults. Minors must be accompanied by a parent or guardian.</div></div>
          <div className="badac-who-card"><span className="badac-who-icon">🙋</span><div className="badac-who-title">Voluntary Only</div><div className="badac-who-desc">Participation is completely voluntary. No one will be forced to undergo testing or rehabilitation.</div></div>
          <div className="badac-who-card"><span className="badac-who-icon">🏘️</span><div className="badac-who-title">Barangay Residents</div><div className="badac-who-desc">Priority is given to residents of Barangay 3S+ Malanday. Others may be referred to their local BADAC.</div></div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">How It Works — Step by Step</div>
        <div className="badac-steps">
          {BADAC_STEPS_DATA.map((s, i) => (
            <div key={i} className="badac-step">
              <div className="badac-step__left">
                <div className="badac-step__icon-wrap"><span className="badac-step__emoji">{s.icon}</span><div className="badac-step__num">{s.n}</div></div>
                {i < BADAC_STEPS_DATA.length - 1 && <div className="badac-step__connector" />}
              </div>
              <div className="badac-step__body"><div className="badac-step__title">{s.title}</div><div className="badac-step__desc">{s.desc}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-free-banner">
          <div className="badac-free-banner__icon">✅</div>
          <div>
            <div className="badac-free-banner__title">All Services Are FREE</div>
            <div className="badac-free-banner__items">
              {["Counseling & Guidance", "Drug Testing", "VADAO Referral", "Rehabilitation Coordination", "Family Support"].map(item => (
                <span key={item} className="badac-free-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Understanding Drug Abuse</div>
        <div className="badac-edu-grid">
          <div className="badac-edu-card"><div className="badac-edu-card__icon">🧠</div><div className="badac-edu-card__title">It's a Health Issue</div><div className="badac-edu-card__desc">Drug dependency is recognized as a medical condition — not a moral failure. It can happen to anyone and is treatable with proper support.</div></div>
          <div className="badac-edu-card"><div className="badac-edu-card__icon">🔄</div><div className="badac-edu-card__title">Recovery Is Possible</div><div className="badac-edu-card__desc">Many residents have successfully recovered through community-based rehabilitation. Early intervention significantly improves outcomes.</div></div>
          <div className="badac-edu-card"><div className="badac-edu-card__icon">👨‍👩‍👧</div><div className="badac-edu-card__title">Family Support Matters</div><div className="badac-edu-card__desc">Family involvement is one of the strongest factors in successful recovery. BADAC provides guidance for families of affected individuals.</div></div>
        </div>
      </div>

      <div className="badac-section">
        <div className="badac-section__title">Frequently Asked Questions</div>
        <div className="badac-faqs">
          {BADAC_FAQS_DATA.map((faq, i) => (
            <div key={i} className={`badac-faq${openFaq === i ? " badac-faq--open" : ""}`}>
              <button className="badac-faq__q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: openFaq === i ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {openFaq === i && <div className="badac-faq__a">{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="badac-section badac-section--last">
        <div className="badac-section__title">Contact & Location</div>
        <div className="badac-contact-card">
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>Barangay 3S+ Hall, Malanday, Valenzuela City</span></div>
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Monday – Friday · 8:00 AM – 5:00 PM</span></div>
          <div className="badac-contact-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg><span>(044) 000-0000</span></div>
        </div>
      </div>
    </div>
  );
}

// ── Services Sub-Tab Data ──
const SERVICES_SUBTABS = [
  { key: "vawc",       label: "VAWC",          color: "#e03e3e", icon: <ServiceShieldIcon />,    category: "legal"     },
  { key: "peace",      label: "Peace & Order", color: "#1a56a0", icon: <SirenIcon />,     category: "legal"     },
  { key: "badac",      label: "BADAC",         color: "#92400e", icon: <BadgeIcon />,     category: "legal"     },
  { key: "bosca",      label: "BOSCA",         color: "#703381", icon: <UsersIcon />,     category: "community" },
  { key: "bswd",       label: "BSWD",          color: "#317D89", icon: <HeartIcon />,     category: "community" },
  { key: "livelihood", label: "Livelihood",    color: "#1e8a5e", icon: <BriefcaseIcon />, category: "community" },
];

const SVC_CARD_META = {
  vawc:       { fullName: "Violence Against Women & Children",        desc: "Hotlines, protection orders, and guided support for VAWC cases.",              bg: "rgba(220,38,38,0.06)",  border: "rgba(220,38,38,0.18)",  text: "#b91c1c" },
  bosca:      { fullName: "Barangay Office for Senior Citizens Assoc.",desc: "Senior citizen membership, benefits, welfare programs and how to join.",      bg: "rgba(112,51,129,0.06)", border: "rgba(112,51,129,0.18)", text: "#703381" },
  bswd:       { fullName: "Barangay Social Welfare and Development",   desc: "Report homeless individuals, send tips, and access social welfare services.", bg: "rgba(49,125,137,0.06)", border: "rgba(49,125,137,0.18)", text: "#317D89" },
  peace:      { fullName: "Peace & Order",                            desc: "Emergency hotline, file an incident report, and track your report status.",   bg: "rgba(26,86,160,0.06)",  border: "rgba(26,86,160,0.18)",  text: "#1a56a0" },
  livelihood: { fullName: "Livelihood Skills Training",               desc: "Register for free skills training programs and track your enrollment status.", bg: "rgba(30,138,94,0.06)",  border: "rgba(30,138,94,0.18)",  text: "#1e8a5e" },
  badac:      { fullName: "Barangay Anti-Drug Abuse Council",         desc: "Confidential assistance, free drug testing, and rehabilitation referral.",     bg: "rgba(146,64,14,0.06)",  border: "rgba(146,64,14,0.18)",  text: "#92400e" },
};

const FILTERS = [
  { key: "all",       label: "All Services" },
  { key: "legal",     label: "Legal" },
  { key: "community", label: "Community" },
];

function ServicesTab() {
  const [sub, setSub]       = useState(null);
  const [filter, setFilter] = useState("all");

  if (sub) {
    return (
      <div className="svc-detail-wrap">
        <button className="svc-detail-back" onClick={() => setSub(null)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Services
        </button>
        {sub === "vawc"       && <VAWCTab />}
        {sub === "bosca"      && <BOSCATab />}
        {sub === "bswd"       && <BSWDTab />}
        {sub === "peace"      && <PeaceOrderTab />}
        {sub === "livelihood" && <LivelihoodTab />}
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

// ── Main Tabs ──
const TABS = [
  { key: "services",   label: "Services",   icon: <ServicesMenuIcon /> },
  { key: "programs",   label: "Programs",   icon: <ProgramsIcon />     },
  { key: "facilities", label: "Facilities", icon: <FacilitiesIcon />   },
  { key: "documents",  label: "Documents",  icon: <DocumentsIcon />    },
];

// ── Main Services Page ──
export default function ServicesPage({ onNavigate }) {
  const [activeTab, setActiveTab] = useState("services");
  const [reservationFacility, setReservationFacility] = useState(null);

  return (
    <main className="db-page sv-page">
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

          {activeTab === "programs" && (
            <>
              <div className="sc-card-header">
                <div className="sc-card-header-left">
                  <div className="sc-card-icon-wrap"><ProgramsIcon /></div>
                  <div><div className="sc-card-title">Barangay Programs</div><div className="sc-card-subtitle">Active programs available to residents</div></div>
                </div>
              </div>
              <ProgramsTab />
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
              <FacilitiesTab onReserve={setReservationFacility} />
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
              <DocumentsTab />
            </>
          )}

          {activeTab === "services" && <ServicesTab />}
        </div>
      </div>

      {reservationFacility && (
        <div className="rsv-overlay" onClick={e => e.target === e.currentTarget && setReservationFacility(null)}>
          <div className="rsv-modal">
            <button className="rsv-modal__close" onClick={() => setReservationFacility(null)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <ReservationForm facility={reservationFacility} onBack={() => setReservationFacility(null)} />
          </div>
        </div>
      )}

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
    </main>
  );
}