import { useState, useEffect } from "react";

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

export default function LivelihoodTab({ userData, householdID, userName }) {
  const [view, setView]     = useState("main");
  const [step, setStep]     = useState(1);
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({ firstName: "", middleName: "", lastName: "", address: "", contact: "", email: "", idFile: "", programId: "" });
  
  useEffect(() => {
    if (userData) {
      const fullAddress = [userData.houseNumber, userData.street, userData.barangay, userData.city].filter(Boolean).join(", ");
      setForm(f => ({
        ...f,
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        address: fullAddress,
        contact: userData.contactNumber != null ? String(userData.contactNumber) : "",
        email: userData.email || ""
      }));
    }
  }, [userData]);
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedProgram = LIVELIHOOD_PROGRAMS.find(p => p.id === parseInt(form.programId));

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim())             e.firstName = "Required.";
    if (!form.lastName.trim())              e.lastName  = "Required.";
    if (!form.address.trim())               e.address   = "Required.";
    if (!String(form.contact || "").trim()) e.contact   = "Required.";
    if (!form.idFile)                       e.idFile    = "Please upload a valid ID or Barangay Clearance.";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.programId) e.programId = "Please select a program.";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) {
      try {
        const generatedRegNum = await submitLivelihoodRegistration(householdID, userData?.userID || "", form, selectedProgram);
        setRegNum(generatedRegNum);
        setStep(4);
      } catch (error) {
        console.error("Failed to submit livelihood registration:", error);
        setErrors({ submit: "Failed to submit. Please try again." });
      }
      return;
    }
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