import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect } from "react";
import { submitRegistration } from "../services/registration";
import { RegisIconUser, RegisIconCalendar, RegisIconClock, RegisIconPin, RegisIconPhone, RegisIconMail, RegisIconHome, RegisIconGlobe, RegisIconBriefcase, RegisIconBook, IconUsers, RegisIconHeart, IconFlag, RegisIconShield, RegisIconInfo, RegisIconReligion, RegisIconGradCap } from "../components/Icons";

const STEPS = [
  { label: "Personal Info" },
  { label: "Address" },
  { label: "Category" },
  { label: "Education" },
  { label: "Household" },
  { label: "Review & Submit" },
];

function Field({ label, required, hint, children }) {
  return (
    <div className="reg-field">
      <label className="reg-label">{label}{required && <span className="req"> *</span>}</label>
      {children}
      {hint && <span className="reg-field-hint">{hint}</span>}
    </div>
  );
}

function InputField({ icon: Icon, ...props }) {
  return (
    <div className="reg-input-wrap">
      {Icon && <span className="reg-field-icon"><Icon /></span>}
      <input className={`reg-input${Icon ? "" : " no-icon"}`} {...props} />
    </div>
  );
}

function SelectField({ icon: Icon, children, ...props }) {
  return (
    <div className="reg-select-wrap">
      {Icon && <span className="reg-field-icon"><Icon /></span>}
      <select className={`reg-select${Icon ? "" : " no-icon"}`} {...props}>{children}</select>
    </div>
  );
}

export default function Registration({ onBack }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");

  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "", suffix: "", religion: "",
    birthDate: "", age: "", birthPlace: "", sex: "Male", civilStatus: "",
    citizenship: "Filipino", contactNumber: "", email: "", residingSinceYear: "",
    houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
    categories: [],
    pwdStatus: "", disabilityType: "",
    educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
    totalMembers: "", householdClassification: "",
  });

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => ({ ...f, [field]: value }));
    if (field === "birthDate" && e.target.value) {
      const dob = new Date(e.target.value);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      setForm(f => ({ ...f, birthDate: e.target.value, age: age > 0 ? String(age) : "" }));
    }
  };

  const toggleCategory = (val) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(val)
        ? f.categories.filter(c => c !== val)
        : [...f.categories, val]
    }));
  };

  const total = STEPS.length;
  const progress = ((step - 1) / (total - 1)) * 100;
  const isPwd = form.categories.includes("PWD");

  const goNext = async () => {
    if (step < total) { setStep(s => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else {
      try{
        await submitRegistration(form);
      const ref = "REF-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 99999)).padStart(5, "0");
      setRefNumber(ref);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      } catch(error){
        console.error("Submission error:", error);
        alert("Failed to submit registration.");
      }
    }
  };

  const goBack = () => { if (step > 1) { setStep(s => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All entered data will be lost.")) {
      if (onBack) onBack();
    }
  };

  const rv = (val) => val?.trim() || null;

  function ReviewField({ label, value, full }) {
    const empty = !value;
    return (
      <div className={`reg-review-field${full ? " full" : ""}`}>
        <div className="reg-review-field-label">{label}</div>
        <div className={`reg-review-field-value${empty ? " empty" : ""}`}>{empty ? "Not provided" : value}</div>
      </div>
    );
  }

  function ReviewSection({ icon, title, children }) {
    return (
      <div className="reg-review-section">
        <div className="reg-review-section-header"><span>{icon}</span><h4>{title}</h4></div>
        <div className="reg-review-grid">{children}</div>
      </div>
    );
  }

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  };

  const fullName = [form.firstName, form.middleName, form.lastName, form.suffix].filter(Boolean).join(" ") || null;
  const fullAddr = [form.houseNumber, form.street].filter(Boolean).join(" ") || null;

  return (
    <div className="reg-root">
      {/* NAVBAR */}
      <nav className="reg-nav">
        <div className="reg-nav-logo" onClick={onBack}>
          <img src={barangayLogo} alt="Barangay Logo" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <div className="reg-nav-logo-text">
            Barangay 3S+ Malanday
            <span className="reg-nav-logo-sub">Community Management System</span>
          </div>
        </div>
      </nav>

      <div className="reg-page">
        <div className="reg-page-header">
          <h1>Household Registration</h1>
          <p>Please complete the form below. Your registration is subject to Barangay approval.</p>
        </div>

        {/* STEPPER */}
        <div className="reg-stepper-wrap">
          <div className="reg-stepper">
            <div className="reg-stepper-line">
              <div className="reg-stepper-line-fill" style={{ width: submitted ? "100%" : `${progress}%` }} />
            </div>
            {STEPS.map((s, i) => {
              const num = i + 1;
              const status = submitted || num < step ? "done" : num === step ? "active" : "";
              return (
                <div key={num} className={`reg-stepper-step ${status}`}>
                  <div className="reg-step-circle">{status === "done" ? "✓" : num}</div>
                  <span className="reg-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARD */}
        <div className="reg-card" key={submitted ? "success" : step}>

          {submitted ? (
            <div className="reg-success">
              <div className="reg-success-icon">✅</div>
              <h2>Registration Submitted!</h2>
              <p>Your household registration request has been submitted and is now <strong>pending Barangay approval</strong>. You will receive a notification via email once reviewed.</p>
              <div className="reg-ref-badge">
                <span>Reference Number</span>
                <strong>{refNumber}</strong>
              </div>
              <button className="reg-btn-outline" onClick={onBack}>← Back to Home</button>
            </div>
          ) : (
            <>
              {/* ── STEP 1: Personal Info ── */}
              {step === 1 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">👤</div>
                    <div><h3>Personal Information</h3><p>Household Head — enter your basic personal details.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-3">
                      <Field label="First Name" required>
                        <InputField icon={RegisIconUser} type="text" placeholder="Juan" value={form.firstName} onChange={set("firstName")} />
                      </Field>
                      <Field label="Middle Name">
                        <InputField icon={RegisIconUser} type="text" placeholder="Santos" value={form.middleName} onChange={set("middleName")} />
                      </Field>
                      <Field label="Last Name" required>
                        <InputField icon={RegisIconUser} type="text" placeholder="Dela Cruz" value={form.lastName} onChange={set("lastName")} />
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label={<>Suffix <span style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional)</span></>}>
                        <SelectField icon={RegisIconUser} value={form.suffix} onChange={set("suffix")}>
                          <option value="">None</option>
                          <option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option>
                        </SelectField>
                      </Field>
                      <Field label="Religion">
                        <InputField icon={RegisIconReligion} type="text" placeholder="Roman Catholic" value={form.religion} onChange={set("religion")} />
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-3">
                      <Field label="Birth Date" required>
                        <InputField icon={RegisIconCalendar} type="date" value={form.birthDate} onChange={set("birthDate")} />
                      </Field>
                      <Field label="Age">
                        <InputField icon={RegisIconClock} type="number" placeholder="Auto-computed" value={form.age} readOnly />
                      </Field>
                      <Field label="Birth Place" required>
                        <InputField icon={RegisIconPin} type="text" placeholder="Valenzuela City" value={form.birthPlace} onChange={set("birthPlace")} />
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Sex" required>
                        <div className="reg-radio-group">
                          {["Male","Female"].map(v => (
                            <label key={v} className="reg-radio-option">
                              <input type="radio" name="sex" value={v} checked={form.sex === v} onChange={set("sex")} />
                              <span className="reg-radio-label"><span className="reg-radio-dot"></span>{v}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                      <Field label="Civil Status" required>
                        <SelectField icon={RegisIconHeart} value={form.civilStatus} onChange={set("civilStatus")}>
                          <option value="">Select status</option>
                          <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Citizenship" required>
                        <InputField icon={IconFlag} type="text" placeholder="Filipino" value={form.citizenship} onChange={set("citizenship")} />
                      </Field>
                      <Field label="Residing Since (Year)" required>
                        <InputField icon={RegisIconCalendar} type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={form.residingSinceYear} onChange={set("residingSinceYear")} />
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Contact Number" required>
                        <InputField icon={RegisIconPhone} type="tel" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={set("contactNumber")} />
                      </Field>
                      <Field label="Email Address" required hint="We'll send your approval notification here.">
                        <InputField icon={RegisIconMail} type="email" placeholder="yourname@email.com" value={form.email} onChange={set("email")} />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 2: Address ── */}
              {step === 2 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">📍</div>
                    <div><h3>Address Information</h3><p>Enter your complete home address.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label="House / Unit Number" required>
                        <InputField icon={RegisIconHome} type="text" placeholder="123" value={form.houseNumber} onChange={set("houseNumber")} />
                      </Field>
                      <Field label="Street" required>
                        <InputField icon={RegisIconHome} type="text" placeholder="Malanday Street" value={form.street} onChange={set("street")} />
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Region" required>
                        <InputField icon={RegisIconGlobe} type="text" value={form.region} readOnly />
                      </Field>
                      {/* ── STEP 2: Address ── */}
                      <Field label="Province" required>
                        <InputField icon={RegisIconPin} type="text" placeholder="Bulacan" value={form.province} onChange={set("province")} />
                      </Field>

                      <Field label="City / Municipality" required>
                        <InputField icon={RegisIconPin} type="text" value={form.city} readOnly />
                      </Field>

                      <Field label="Barangay" required>
                        <InputField icon={RegisIconPin} type="text" value={form.barangay} readOnly />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Category ── */}
              {step === 3 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">🏷️</div>
                    <div><h3>Category Classification</h3><p>Select all categories that apply to you.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="reg-checkbox-grid">
                      {["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"].map(cat => (
                        <label key={cat} className="reg-check-option">
                          <input type="checkbox" checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                          <span className="reg-check-label">
                            <span className="reg-check-box">{form.categories.includes(cat) && "✓"}</span>
                            {cat}
                          </span>
                        </label>
                      ))}
                    </div>
                    {isPwd && (
                      <div className="reg-sub-fields">
                        <div className="reg-sub-fields-title">♿ PWD Additional Information</div>
                        <div className="reg-form-grid cols-2">
                          <Field label="PWD Status" required>
                            <SelectField icon={RegisIconShield} value={form.pwdStatus} onChange={set("pwdStatus")}>
                              <option value="">Select status</option>
                              <option>Children with Disabilities</option>
                              <option>Person with Disabilities</option>
                            </SelectField>
                          </Field>
                          <Field label="Disability Type" required>
                            <SelectField icon={RegisIconInfo} value={form.disabilityType} onChange={set("disabilityType")}>
                              <option value="">Select type</option>
                              <option>Inborn</option><option>Accident</option><option>Mental</option><option>Other</option>
                            </SelectField>
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STEP 4: Education ── */}
              {step === 4 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">🎓</div>
                    <div><h3>Education & Employment</h3><p>Provide your educational background and employment details.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label="Highest Educational Attainment" required>
                        <SelectField icon={RegisIconGradCap} value={form.educationAttainment} onChange={set("educationAttainment")}>
                          <option value="">Select attainment</option>
                          <option>Elementary</option><option>High School</option><option>College</option>
                          <option>Post Graduate</option><option>Vocational</option>
                        </SelectField>
                      </Field>
                      <Field label="Education Status" required>
                        <SelectField icon={RegisIconBook} value={form.educationStatus} onChange={set("educationStatus")}>
                          <option value="">Select status</option>
                          <option>In School</option>
                          <option>Out of School Youth (OSY)</option>
                          <option>Out of School Children (OSC)</option>
                          <option>Graduate</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Occupation">
                        <InputField icon={RegisIconBriefcase} type="text" placeholder="Teacher, Engineer..." value={form.occupation} onChange={set("occupation")} />
                      </Field>
                      <Field label="Employment Status" required>
                        <SelectField icon={RegisIconBriefcase} value={form.employmentStatus} onChange={set("employmentStatus")}>
                          <option value="">Select status</option>
                          <option>Employed</option><option>Unemployed</option>
                        </SelectField>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 5: Household ── */}
              {step === 5 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">🏠</div>
                    <div><h3>Household Details</h3><p>Provide information about your household.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label="Number of Household Members" required hint="Include yourself in the count.">
                        <InputField icon={IconUsers} type="number" min="1" placeholder="4" value={form.totalMembers} onChange={set("totalMembers")} />
                      </Field>
                      <Field label="Household Classification" required>
                        <SelectField icon={RegisIconHome} value={form.householdClassification} onChange={set("householdClassification")}>
                          <option value="">Select classification</option>
                          <option>Owner</option><option>Rental</option>
                          <option>Co-habit / Shared</option><option>Informal Settler</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-info-box">
                      <span>ℹ️</span>
                      <p>After your registration is approved, you will be prompted to <strong>add individual household members</strong> using your assigned Household ID.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 6: Review ── */}
              {step === 6 && (
                <div>
                  <div className="reg-section-header">
                    <div className="reg-section-icon">📋</div>
                    <div><h3>Review & Submit</h3><p>Please verify all information before submitting.</p></div>
                  </div>

                  <ReviewSection icon="👤" title="Personal Information">
                    <ReviewField label="Full Name" value={rv(fullName)} />
                    <ReviewField label="Birth Date" value={formatDate(form.birthDate)} />
                    <ReviewField label="Age" value={rv(form.age)} />
                    <ReviewField label="Birth Place" value={rv(form.birthPlace)} />
                    <ReviewField label="Sex" value={form.sex} />
                    <ReviewField label="Civil Status" value={rv(form.civilStatus)} />
                    <ReviewField label="Religion" value={rv(form.religion)} />
                    <ReviewField label="Citizenship" value={rv(form.citizenship)} />
                    <ReviewField label="Residing Since" value={rv(form.residingSinceYear)} />
                    <ReviewField label="Contact Number" value={rv(form.contactNumber)} />
                    <ReviewField label="Email Address" value={rv(form.email)} full />
                  </ReviewSection>

                  <ReviewSection icon="📍" title="Address">
                    <ReviewField label="House / Street" value={rv(fullAddr)} />
                    <ReviewField label="Barangay" value={rv(form.barangay)} />
                    <ReviewField label="City / Municipality" value={rv(form.city)} />
                    <ReviewField label="Province" value={rv(form.province)} />
                    <ReviewField label="Region" value={rv(form.region)} full />
                  </ReviewSection>


                  <ReviewSection icon="🏷️" title="Category">
                    {form.categories.length === 0 ? (
                      <ReviewField label="Classifications" value={null} full />
                    ) : (
                      <div className="reg-review-field full">
                        <div className="reg-review-field-label">Classifications</div>
                        <div className="reg-review-field-value">
                          {form.categories.map(c => <span key={c} className="reg-category-tag">{c}</span>)}
                        </div>
                      </div>
                    )}
                    {isPwd && <>
                      <ReviewField label="PWD Status" value={rv(form.pwdStatus)} />
                      <ReviewField label="Disability Type" value={rv(form.disabilityType)} />
                    </>}
                  </ReviewSection>

                  <ReviewSection icon="🎓" title="Education & Employment">
                    <ReviewField label="Highest Attainment" value={rv(form.educationAttainment)} />
                    <ReviewField label="Education Status" value={rv(form.educationStatus)} />
                    <ReviewField label="Occupation" value={rv(form.occupation)} />
                    <ReviewField label="Employment Status" value={rv(form.employmentStatus)} />
                  </ReviewSection>

                  <ReviewSection icon="🏠" title="Household Details">
                    <ReviewField label="No. of Members" value={rv(form.totalMembers)} />
                    <ReviewField label="Classification" value={rv(form.householdClassification)} />
                  </ReviewSection>

                  <div className="reg-privacy-note">
                    <span>🔒</span>
                    <span>By submitting, you confirm that all provided information is accurate. Your registration will be reviewed by the Barangay within <strong>3–5 business days</strong>.</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        {!submitted && (
          <div className="reg-footer-actions">
            <button className="reg-btn-cancel" onClick={handleCancel}>Cancel</button>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {step > 1 && (
                <button className="reg-btn-ghost" onClick={goBack}>← Back</button>
              )}
              {step < total ? (
                <button className="reg-btn-primary" onClick={goNext}>Continue →</button>
              ) : (
                <button className="reg-btn-success" onClick={goNext}>✓ Confirm & Submit</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}