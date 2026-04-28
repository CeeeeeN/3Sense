import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { submitDocumentRequest } from "../../services/services";
import { createNotification } from "../../services/notifications";

const CIVIL_STATUS = ["Single", "Married", "Widowed", "Separated"];
const STEP_LABELS = ["Select Document", "Personal Details", "Review", "Done"];

const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

// ── Step Indicator ──
function StepIndicator({ step }) {
  return (
    <div className="dr-steps">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < step;
        const active = num === step;
        return (
          <div key={i} className="dr-step-item">
            <div className={`dr-step-circle${done ? " dr-step-circle--done" : active ? " dr-step-circle--active" : ""}`}>
              {done
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
function Step1({ docTypes, selected, onSelect }) {
  return (
    <div className="dr-step1">
      <p className="dr-step-hint">Select the document you need. You must choose one to proceed.</p>
      <div className="dr-doc-list">
        {docTypes.map(d => (
          <button
            key={d.id}
            className={`dr-doc-row${selected?.id === d.id ? " dr-doc-row--selected" : ""}`}
            onClick={() => onSelect(d)}
          >
            <div className="dr-doc-row__icon">{d.icon || <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}</div>
            <div className="dr-doc-row__body">
              <div className="dr-doc-row__name">{d.title || d.name}</div>
              <div className="dr-doc-row__desc">{d.description || d.desc}</div>
            </div>
            <div className="dr-doc-row__meta">
              <span className="dr-doc-row__fee">{d.fee}</span>
              <span className="dr-doc-row__days">{d.processingTime || d.days}</span>
            </div>
            <div className="dr-doc-row__check">
              {selected?.id === d.id
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
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
  const extraFields = docType?.customFields || [];
  const purposeOptions = docType?.purposeOptions || [];

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
            <div className="dr-doc-selected-name">{docType.title || docType.name}</div>
            {(docType.reminder || docType.note) && <div className="dr-doc-selected-note">{docType.reminder || docType.note}</div>}
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
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
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
          <label className="sv-label">Purpose of Request <span className="sv-required">*</span></label>
          <select
            className={`sv-input sv-select${errors.purposeOption ? " sv-input--error" : ""}`}
            value={form.purposeOption}
            onChange={e => { set("purposeOption", e.target.value); if (e.target.value !== "Other") set("purposeOther", ""); }}
          >
            <option value="">— Select purpose —</option>
            {purposeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            <option value="Other">Other</option>
          </select>
          {errors.purposeOption && <span className="sv-error-msg">{errors.purposeOption}</span>}
        </div>
      </div>

      {form.purposeOption === "Other" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div />
          <div />
          <div className="dr-field">
            <label className="sv-label">Please specify <span className="sv-required">*</span></label>
            <input
              className={`sv-input${errors.purposeOther ? " sv-input--error" : ""}`}
              value={form.purposeOther}
              onChange={e => set("purposeOther", e.target.value)}
              placeholder="Describe your purpose..."
            />
            {errors.purposeOther && <span className="sv-error-msg">{errors.purposeOther}</span>}
          </div>
        </div>
      )}

      <div className="dr-section-label" style={{ marginTop: "1.5rem" }}>File Upload</div>
      <div className="dr-field">
        <label className="sv-label">Upload Valid ID <span className="sv-required">*</span></label>
        <label className={`dr-upload-box${errors.validId ? " dr-upload-box--error" : ""}`}>
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleFile} style={{ display: "none" }} />
          {form.validId ? (
            <div className="dr-upload-done">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              <span>{form.validId}</span>
            </div>
          ) : (
            <div className="dr-upload-placeholder">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
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
                  <div className="dr-field dr-field--full" key={f.id}>
                    <label className={`dr-checkbox-label${errors[f.id] ? " dr-checkbox-label--error" : ""}`}>
                      <input type="checkbox" checked={!!form[f.id]} onChange={e => set(f.id, e.target.checked)} className="dr-checkbox" />
                      <span>{f.label} {f.required && <span className="sv-required">*</span>}</span>
                    </label>
                    {errors[f.id] && <span className="sv-error-msg">{errors[f.id]}</span>}
                  </div>
                );
              }
              return (
                <div className="dr-field" key={f.id}>
                  <label className="sv-label">{f.label} {f.required && <span className="sv-required">*</span>}</label>
                  <input className={`sv-input${errors[f.id] ? " sv-input--error" : ""}`} type={f.type || "text"} value={form[f.id] || ""} placeholder={f.placeholder || ""} onChange={e => set(f.id, e.target.value)} />
                  {errors[f.id] && <span className="sv-error-msg">{errors[f.id]}</span>}
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
  const extraFields = docType?.customFields || [];
  const effectivePurpose = form.purposeOption === "Other"
    ? (form.purposeOther || "Other")
    : form.purposeOption;
  const rows = [
    { label: "Document Type", value: docType?.title || docType?.name, full: true },
    { label: "Full Name", value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") },
    { label: "Date of Birth", value: form.dob },
    { label: "Civil Status", value: form.civilStatus },
    { label: "Residing Since", value: form.residingSince ? `${form.residingSince} up to present` : "—" },
    { label: "Address", value: form.address, full: true },
    { label: "Contact Number", value: form.contact },
    { label: "Email", value: form.email || "—" },
    { label: "Purpose", value: effectivePurpose || "—", full: true },
    { label: "Valid ID Uploaded", value: form.validId || "—" },
    ...extraFields.filter(f => f.type !== "checkbox").map(f => ({ label: f.label, value: form[f.id] || "—" })),
    ...extraFields.filter(f => f.type === "checkbox").map(f => ({ label: f.label, value: form[f.id] ? "✓ Confirmed" : "Not confirmed" })),
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z" /></svg>
          You will receive an SMS notification once your request is processed.
        </div>
        <div className="dr-success-info-item">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          Processing time: 2–3 business days.
        </div>
      </div>
      <button className="sv-btn-primary" onClick={onReset}>Submit Another Request</button>
    </div>
  );
}

// ── Documents Tab ──
export default function DocumentsTab({ userData, householdID, userName }) {
  const activeUserId   = getSaved("userID", null);
  const [docTypes, setDocTypes] = useState([]);
  const [step, setStep] = useState(1);
  const [docType, setDocType] = useState(null);
  const [errors, setErrors] = useState({});
  const [refNum, setRefNum] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Auto-fill form when userData loads
  useEffect(() => {
    if (userData) {
      const fullAddress = [userData.houseNumber, userData.street, userData.barangay, userData.city]
        .filter(Boolean).join(", ");

      setForm(f => ({
        ...f,
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        dob: userData.birthDate || "",
        civilStatus: userData.civilStatus || "Single",
        address: fullAddress,
        contact: userData.contactNumber != null ? String(userData.contactNumber) : "",
        email: userData.email || "",
        residingSince: userData.residingSinceYear ? String(userData.residingSinceYear) : "",
      }));
    }
  }, [userData]);

  const validateStep1 = () => {
    if (!docType) { setErrors({ docType: "Please select a document type." }); return false; }
    return true;
  };

  const validateStep2 = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = "Required.";
    if (!form.lastName.trim()) e.lastName = "Required.";
    if (!form.dob) e.dob = "Required.";
    if (!form.address.trim()) e.address = "Required.";
    if (!String(form.contact || "").trim()) e.contact = "Required.";
    if (!form.residingSince) e.residingSince = "Required.";
    if (!form.purposeOption) e.purposeOption = "Required.";
    if (form.purposeOption === "Other" && !form.purposeOther?.trim()) e.purposeOther = "Please specify your purpose.";
    if (!form.validId) e.validId = "Please upload a valid ID.";
    const extra = docType?.customFields || [];
    extra.forEach(f => {
      if (!f.required) return;
      if (f.type === "checkbox") { if (!form[f.id]) e[f.id] = "You must confirm this to proceed."; }
      else { if (!form[f.id]?.toString().trim()) e[f.id] = "Required."; }
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

        // --- NEW: CLOUDINARY UPLOAD LOGIC ---
        if (form.validIdFile) {
          const formData = new FormData();
          formData.append("file", form.validIdFile);
          
          // ⚠️ UPDATE THESE STRINGS WITH YOUR CREDENTIALS
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
        // ------------------------------------

        const customData = {};
        (docType.customFields || []).forEach(f => {
          if (form[f.id] !== undefined) customData[f.label] = form[f.id];
        });
        
        // Resolve effective purpose for submission
        const effectivePurpose = form.purposeOption === "Other" ? form.purposeOther : form.purposeOption;
        
        const submissionForm = { ...form, purpose: effectivePurpose, validIdUrl: uploadedIdUrl };
        
        const generatedRef = await submitDocumentRequest(householdID, activeUserId || "", userName || "Unknown", docType, submissionForm, customData);
        setRefNum(generatedRef);

        const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") || userName || "Unknown";
        await createNotification(
          "document_requests",
          `New document request (${docType.title || docType.name}) submitted by ${fullName}.`,
          form.email || fullName,
          generatedRef
        );
        
        setStep(4);
      } catch (error) {
        console.error("Failed to submit document request:", error);
        setErrors({ submit: "Failed to submit. Please try again." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    
    setStep(s => s + 1);
  };

  const handleReset = () => {
    setStep(1); setDocType(null); setErrors({});
    setForm({ firstName: "", middleName: "", lastName: "", dob: "", civilStatus: "Single", address: "", contact: "", email: "", ctc: "", residingSince: "", purposeOption: "", purposeOther: "", validId: "", validIdFile: null });
  };

  return (
    <div className="dr-wizard">
      <div className="dr-wizard-header"><StepIndicator step={step} /></div>
      <div className="dr-wizard-body">
        {step === 1 && <Step1 docTypes={docTypes} selected={docType} onSelect={d => { setDocType(d); setErrors({}); }} />}
        {errors.docType && <p className="sv-error-msg" style={{ padding: "0 1.5rem" }}>{errors.docType}</p>}
        {step === 2 && <Step2 docType={docType} form={form} setForm={setForm} errors={errors} />}
        {step === 3 && <Step3 docType={docType} form={form} />}
        {step === 4 && <Step4 refNum={refNum} onReset={handleReset} />}
        {errors.submit && <p className="sv-error-msg" style={{ padding: "1rem 1.5rem", textAlign: "center" }}>{errors.submit}</p>}
      </div>
      {step < 4 && (
        <div className="dr-wizard-actions" style={{ justifyContent: 'flex-end', gap: '10px' }}>
          {step > 1 && <button className="sv-btn-ghost" onClick={() => { setErrors({}); setStep(s => s - 1); }} disabled={isSubmitting}>Previous</button>}
          <button className="sv-btn-primary" onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? "Uploading ID..." : (step === 3 ? "Submit Request" : "Next")}
          </button>
        </div>
      )}
    </div>
  );
}