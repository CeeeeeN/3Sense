import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef } from "react";
import { IconUser, IconCalendar, IconClock, IconPin, IconHome, IconGlobe, IconPhone, IconMail, IconHeart, IconBriefcase, IconGradCap, IconBook, IconShield, IconInfo, IconReligion, IconPlus, IconArrow, IconCheck, IconX } from "../components/Icons";
import { addHouseholdMember } from "../services/addMembers";

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0d7a55,#13a87a)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#e8a020,#f5c04a)",
  "linear-gradient(135deg,#e03e3e,#f87171)",
  "linear-gradient(135deg,#0891b2,#22d3ee)",
];

// Reusable field components
function Field({ label, required, hint, children }) {
  return (
    <div className="am-field">
      <label className="am-label">{label}{required && <span className="req"> *</span>}</label>
      {children}
      {hint && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}

function InputField({ icon: Icon, readOnly, ...props }) {
  return (
    <div className="am-input-wrap">
      {Icon && <span className="am-field-icon"><Icon /></span>}
      <input className={`am-input${Icon ? "" : " no-icon"}`} readOnly={readOnly} {...props} />
    </div>
  );
}

function SelectField({ icon: Icon, children, ...props }) {
  return (
    <div className="am-select-wrap">
      {Icon && <span className="am-field-icon"><Icon /></span>}
      <select className={`am-select${Icon ? "" : " no-icon"}`} {...props}>{children}</select>
    </div>
  );
}

const BLANK_FORM = {
  firstName: "", middleName: "", lastName: "", suffix: "", religion: "",
  birthDate: "", age: "", birthPlace: "", sex: "Male", civilStatus: "",
  contactNumber: "", email: "", residingSinceYear: "",
  houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
  categories: [],
  pwdStatus: "", disabilityType: "",
  educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
  sameAddress: false,
};

const TABS = ["Personal Info", "Address", "Category", "Education"];

export default function AddMembers({ onBack, onDone, householdID, hhAddress }) {
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState(1);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [showToast, setShowToast] = useState(false);
  const [memberError, setMemberError] = useState("");
  const toastRef = useRef(null);

  useEffect(() => {
    if (showToast) {
      clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setShowToast(false), 3000);
    }
  }, [showToast]);

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(f => {
      const next = { ...f, [field]: val };
      if (field === "birthDate" && e.target.value) {
        const dob = new Date(e.target.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        next.age = age > 0 ? String(age) : "";
      }
      return next;
    });
  };

  const toggleCategory = (val) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(val)
        ? f.categories.filter(c => c !== val)
        : [...f.categories, val]
    }));
  };

  const handleSameAddress = (checked) => {
    if (checked && hhAddress) {
      setForm(f => ({
        ...f,
        sameAddress: true,
        houseNumber: hhAddress.houseNumber || "",
        street: hhAddress.street || "",
        region: hhAddress.region || "",
        province: hhAddress.province || "",
        city: hhAddress.city || "",
        barangay: hhAddress.barangay || "",
      }));
    } else {
      setForm(f => ({
        ...f,
        sameAddress: false,
        houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
      }));
    }
  };

  // Per-tab validation 
  const validateTab = (tabNum) => {
    const missing = [];

    if (tabNum === 1) {
      if (!form.firstName.trim()) missing.push("First Name");
      if (!form.lastName.trim()) missing.push("Last Name");
      if (!form.birthDate) missing.push("Birth Date");
      if (!form.birthPlace.trim()) missing.push("Birth Place");
      if (!form.civilStatus) missing.push("Civil Status");
      if (!form.residingSinceYear) missing.push("Residing Since Year");

      if (!form.contactNumber.trim()) missing.push("Contact Number");
      else if (form.contactNumber.replace(/\D/g, "").length < 10) missing.push("Valid Contact Number (min 10 digits)");

      if (!form.email.trim()) missing.push("Email Address");
      else if (!/\S+@\S+\.\S+/.test(form.email)) missing.push("Valid Email Address");
    }

    if (tabNum === 2 && !form.sameAddress) {
      if (!form.houseNumber.trim()) missing.push("House / Unit Number");
      if (!form.street.trim()) missing.push("Street");
      if (!form.province.trim()) missing.push("Province");
    }

    if (tabNum === 4) {
      if (!form.educationAttainment) missing.push("Highest Educational Attainment");
      if (!form.educationStatus) missing.push("Education Status");
      if (!form.employmentStatus) missing.push("Employment Status");
    }

    if (missing.length > 0) {
      setMemberError(`Please fill in required fields: ${missing.join(", ")}`);
      return false;
    }
    setMemberError("");
    return true;
  };

  // Navigate to the next tab only if current tab passes validation
  const goNext = (nextTab) => {
    if (!validateTab(tab)) return;
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = (prevTab) => {
    setMemberError("");
    setTab(prevTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addMember = async () => {
    // Final validation covers all tabs before submitting
    if (!validateTab(1) || !validateTab(4)) {
      setTab(1);
      return;
    }

    const fullName = [form.firstName, form.middleName, form.lastName, form.suffix].filter(Boolean).join(" ") || `Member ${members.length + 1}`;
    const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "M");
    const color = AVATAR_COLORS[members.length % AVATAR_COLORS.length];

    try {
      await addHouseholdMember(householdID, {
        // personal info
        firstName: form.firstName || "",
        middleName: form.middleName || "",
        lastName: form.lastName || "",
        suffix: form.suffix || "",
        birthDate: form.birthDate || "",
        age: form.age || "",
        birthPlace: form.birthPlace || "",
        sex: form.sex || "",
        civilStatus: form.civilStatus || "",
        religion: form.religion || "",
        citizenship: form.citizenship || "",
        contactNumber: form.contactNumber || "",
        email: form.email || "",
        residingSinceYear: form.residingSinceYear || "",
        // address — service omits these when sameAddress is true
        sameAddress: form.sameAddress,
        houseNumber: form.houseNumber || "",
        street: form.street || "",
        region: form.region || "",
        province: form.province || "",
        city: form.city || "",
        barangay: form.barangay || "",
        // category — service converts array → string
        categories: form.categories || [],
        pwdStatus: form.pwdStatus || "",
        disabilityType: form.disabilityType || "",
        // education & employment
        educationAttainment: form.educationAttainment || "",
        educationStatus: form.educationStatus || "",
        occupation: form.occupation || "",
        employmentStatus: form.employmentStatus || "",
      });
    } catch (err) {
      alert("Failed to save member: " + err.message);
      return;
    }

    setMembers(m => [...m, { fullName, initials, color, meta: [form.sex, form.age ? `${form.age} yrs` : null, form.civilStatus].filter(Boolean).join(" · ") }]);
    setForm({ ...BLANK_FORM });
    setTab(1);
    setMemberError("");
    setShowToast(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeMember = (i) => setMembers(m => m.filter((_, idx) => idx !== i));

  const addrPreview = hhAddress
    ? [hhAddress.houseNumber, hhAddress.street, hhAddress.barangay, hhAddress.city].filter(Boolean).join(", ")
    : "No address found from registration.";

  const isPwd = Array.isArray(form.categories) && form.categories.includes("PWD");

  return (
    <div className="am-root">
      {/* NAVBAR */}
      <nav className="am-nav">
        <div className="am-nav-logo" onClick={onBack}>
          <img src={barangayLogo} alt="Barangay Logo" style={{ width: "38px", height: "38px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          <div className="am-nav-logo-text">
            Barangay 3S+ Malanday
            <span className="am-nav-logo-sub">Community Management System</span>
          </div>
        </div>
        <div className="am-hh-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          <span>{householdID || "HH-XXXX-XXXXX"}</span>
        </div>
      </nav>

      {/* TOAST */}
      <div className={`am-toast ${showToast ? "show" : ""}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d7a55" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        Member added successfully.
      </div>

      <div className="am-page">
        <div className="am-page-header">
          <h1>Add Household Members</h1>
          <p>Enter the details of each household member. You can add members one at a time.</p>
        </div>

        {/* MEMBERS LIST */}
        {members.length > 0 && (
          <div className="am-members-list">
            {members.map((m, i) => (
              <div key={i} className={`am-member-chip ${m.isHead ? "head" : ""}`}>
                <div className="am-chip-avatar" style={{ background: m.color }}>{m.initials}</div>
                <div className="am-chip-info">
                  <div className="am-chip-name">
                    {m.fullName}
                    {m.isHead && <span className="am-chip-badge">⭐ Household Head</span>}
                  </div>
                  <div className="am-chip-meta">{m.meta || "Added just now"}</div>
                </div>
                <button className="am-chip-remove" onClick={() => removeMember(i)}><IconX /></button>
              </div>
            ))}
          </div>
        )}

        {/* FORM CARD */}
        <div className="am-form-card">
          <div className="am-form-card-header">
            <h3>
              <IconPlus /> Add New Member
              <span className="am-member-count-badge">Member {members.length + 1}</span>
            </h3>
            <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => { setForm({ ...BLANK_FORM }); setTab(1); }}>
              Clear Form
            </button>
          </div>

          {/* SPECIAL CHECKBOXES */}
          <div className="am-special-checks">
            <label className="am-special-check">
              <input type="checkbox" checked={form.sameAddress} onChange={e => handleSameAddress(e.target.checked)} />
              <span className="am-special-check-label">
                <span className="am-check-icon-box">{form.sameAddress && "✓"}</span>
                <span className="am-check-text">
                  <strong>📍 Same address as Household Head</strong>
                  <span>{addrPreview}</span>
                </span>
              </span>
            </label>
          </div>

          {/* INNER STEPPER */}
          <div className="am-inner-stepper">
            {TABS.map((label, i) => {
              const num = i + 1;
              const status = num < tab ? "done" : num === tab ? "active" : "";
              return (
                <div key={num} className={`am-inner-step ${status}`} onClick={() => setTab(num)}>
                  <div className="am-inner-step-num">{status === "done" ? "✓" : num}</div>
                  {label}
                </div>
              );
            })}
          </div>

          {/* TAB 1: Personal Info */}
          {tab === 1 && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="am-form-grid cols-3">
                  <Field label="First Name" required>
                    <InputField icon={IconUser} type="text" placeholder="Maria" value={form.firstName} onChange={set("firstName")} />
                  </Field>
                  <Field label="Middle Name">
                    <InputField icon={IconUser} type="text" placeholder="Santos" value={form.middleName} onChange={set("middleName")} />
                  </Field>
                  <Field label="Last Name" required>
                    <InputField icon={IconUser} type="text" placeholder="Dela Cruz" value={form.lastName} onChange={set("lastName")} />
                  </Field>
                </div>
                <div className="am-form-grid cols-2">
                  <Field label={<>Suffix <span style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional)</span></>}>
                    <SelectField icon={IconUser} value={form.suffix} onChange={set("suffix")}>
                      <option value="">None</option>
                      <option>Jr.</option><option>Sr.</option><option>II</option><option>III</option>
                    </SelectField>
                  </Field>
                  <Field label="Religion">
                    <InputField icon={IconReligion} type="text" placeholder="Roman Catholic" value={form.religion} onChange={set("religion")} />
                  </Field>
                </div>
                <div className="am-form-grid cols-3">
                  <Field label="Birth Date" required>
                    <InputField icon={IconCalendar} type="date" value={form.birthDate} onChange={set("birthDate")} />
                  </Field>
                  <Field label="Age">
                    <InputField icon={IconClock} type="number" placeholder="Auto" value={form.age} readOnly />
                  </Field>
                  <Field label="Birth Place" required>
                    <InputField icon={IconPin} type="text" placeholder="Valenzuela City" value={form.birthPlace} onChange={set("birthPlace")} />
                  </Field>
                </div>
                <div className="am-form-grid cols-2">
                  <Field label="Sex" required>
                    <div className="am-radio-group">
                      {["Male", "Female"].map(v => (
                        <label key={v} className="am-radio-option">
                          <input type="radio" name="msex" value={v} checked={form.sex === v} onChange={set("sex")} />
                          <span className="am-radio-label"><span className="am-radio-dot"></span>{v}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Civil Status" required>
                    <SelectField icon={IconHeart} value={form.civilStatus} onChange={set("civilStatus")}>
                      <option value="">Select</option>
                      <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                    </SelectField>
                  </Field>
                </div>
                <div className="am-form-grid cols-3">
                  <Field label="Contact Number" required>
                    <InputField icon={IconPhone} type="tel" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={set("contactNumber")} />
                  </Field>
                  <Field label="Email Address" required hint="Used for account notifications.">
                    <InputField icon={IconMail} type="email" placeholder="email@example.com" value={form.email} onChange={set("email")} />
                  </Field>
                  <Field label="Residing Since (Year)" required>
                    <InputField icon={IconCalendar} type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={form.residingSinceYear} onChange={set("residingSinceYear")} />
                  </Field>
                </div>
              </div>
              {memberError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  fontWeight: 500,
                  marginTop: '0.75rem',
                }}>
                  ⚠️ {memberError}
                </div>
              )}
              <div className="am-form-actions">
                <div />
                <button className="am-btn am-btn-primary" onClick={() => goNext(2)}>Next: Address <IconArrow /></button>
              </div>
            </div>
          )}

          {/* TAB 2: Address */}
          {tab === 2 && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="am-form-grid cols-2">
                  <Field label="House / Unit Number" required>
                    <InputField icon={IconHome} type="text" placeholder="123" value={form.houseNumber} readOnly={form.sameAddress} onChange={set("houseNumber")} />
                  </Field>
                  <Field label="Street" required>
                    <InputField icon={IconHome} type="text" placeholder="Malanday Street" value={form.street} readOnly={form.sameAddress} onChange={set("street")} />
                  </Field>
                </div>
                <div className="am-form-grid cols-2">
                  <Field label="Region" required>
                    <InputField icon={IconGlobe} type="text" value={form.region} readOnly />
                  </Field>
                  <Field label="Province" required>
                    <InputField icon={IconPin} type="text" placeholder="Bulacan" value={form.province} readOnly={form.sameAddress} onChange={set("province")} />
                  </Field>
                </div>
                <div className="am-form-grid cols-2">
                  <Field label="City / Municipality" required>
                    <InputField icon={IconPin} type="text" value={form.city} readOnly />
                  </Field>
                  <Field label="Barangay" required>
                    <InputField icon={IconPin} type="text" value={form.barangay} readOnly />
                  </Field>
                </div>
              </div>
              {memberError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  fontWeight: 500,
                  marginTop: '0.75rem',
                }}>
                  ⚠️ {memberError}
                </div>
              )}
              <div className="am-form-actions">
                <button className="am-btn am-btn-ghost" onClick={() => goBack(1)}>← Back</button>
                <button className="am-btn am-btn-primary" onClick={() => goNext(3)}>Next: Category <IconArrow /></button>
              </div>
            </div>
          )}

          {/* TAB 3: Category */}
          {tab === 3 && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="am-checkbox-grid">
                  {["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"].map(cat => (
                    <label key={cat} className="am-check-option">
                      <input type="checkbox" checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                      <span className="am-check-label">
                        <span className="am-check-box">{form.categories.includes(cat) && "✓"}</span>
                        {cat}
                      </span>
                    </label>
                  ))}
                </div>
                {isPwd && (
                  <div className="am-sub-fields">
                    <div className="am-sub-fields-title">♿ PWD Details</div>
                    <div className="am-form-grid cols-2">
                      <Field label="PWD Status">
                        <SelectField icon={IconShield} value={form.pwdStatus} onChange={set("pwdStatus")}>
                          <option value="">Select</option>
                          <option>Children with Disabilities</option>
                          <option>Person with Disabilities</option>
                        </SelectField>
                      </Field>
                      <Field label="Disability Type">
                        <SelectField icon={IconInfo} value={form.disabilityType} onChange={set("disabilityType")}>
                          <option value="">Select</option>
                          <option>Inborn</option><option>Accident</option><option>Mental</option><option>Other</option>
                        </SelectField>
                      </Field>
                    </div>
                  </div>
                )}
              </div>
              <div className="am-form-actions">
                <button className="am-btn am-btn-ghost" onClick={() => goBack(2)}>← Back</button>
                <button className="am-btn am-btn-primary" onClick={() => goNext(4)}>Next: Education <IconArrow /></button>
              </div>
            </div>
          )}

          {/* TAB 4: Education */}
          {tab === 4 && (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div className="am-form-grid cols-2">
                  <Field label="Highest Educational Attainment" required>
                    <SelectField icon={IconGradCap} value={form.educationAttainment} onChange={set("educationAttainment")}>
                      <option value="">Select</option>
                      <option>Elementary</option><option>High School</option><option>College</option>
                      <option>Post Graduate</option><option>Vocational</option>
                    </SelectField>
                  </Field>
                  <Field label="Education Status" required>
                    <SelectField icon={IconBook} value={form.educationStatus} onChange={set("educationStatus")}>
                      <option value="">Select</option>
                      <option>In School</option>
                      <option>Out of School Youth (OSY)</option>
                      <option>Out of School Children (OSC)</option>
                      <option>Graduate</option>
                    </SelectField>
                  </Field>
                </div>
                <div className="am-form-grid cols-2">
                  <Field label="Occupation">
                    <InputField icon={IconBriefcase} type="text" placeholder="Teacher, Student..." value={form.occupation} onChange={set("occupation")} />
                  </Field>
                  <Field label="Employment Status" required>
                    <SelectField icon={IconBriefcase} value={form.employmentStatus} onChange={set("employmentStatus")}>
                      <option value="">Select</option>
                      <option>Employed</option><option>Unemployed</option>
                    </SelectField>
                  </Field>
                </div>
              </div>
              {memberError && (
                <div style={{
                  padding: '10px 14px',
                  backgroundColor: '#fef2f2',
                  borderLeft: '4px solid #ef4444',
                  color: '#b91c1c',
                  fontSize: '0.875rem',
                  borderRadius: '4px',
                  fontWeight: 500,
                  marginTop: '0.75rem',
                }}>
                  ⚠️ {memberError}
                </div>
              )}
              <div className="am-form-actions">
                <button className="am-btn am-btn-ghost" onClick={() => goBack(3)}>← Back</button>
                <button className="am-btn am-btn-primary" onClick={addMember}>
                  <IconCheck /> Add Member
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="am-bottom-bar">
        <div className="am-bottom-bar-left">
          <strong>{members.length} {members.length === 1 ? "member" : "members"}</strong> added so far
        </div>
        <button className="am-btn-success-outline" onClick={onDone}>
          Proceed to Log In <IconArrow />
        </button>
      </div>
    </div>
  );
}