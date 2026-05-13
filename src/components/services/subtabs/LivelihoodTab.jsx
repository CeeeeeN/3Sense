import { useState, useEffect } from "react";
import { BriefcaseIcon } from "../../Icons";
import { db } from "../../../firebase/firebase";
import {
  collection, onSnapshot, query, where,
  addDoc, serverTimestamp, orderBy,
} from "firebase/firestore";

// ── Helpers ────────────────────────────────────────────────────────
const generateRegNum = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `LH-${year}-${rand}`;
};

const formatTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
};

const getTagStyle = (str = "") => {
  const s = str.toLowerCase();
  if (s.includes("food") || s.includes("process")) return { label: "Manufacturing", color: "#1e8a5e" };
  if (s.includes("business") || s.includes("negosyo")) return { label: "Business", color: "#1a56a0" };
  if (s.includes("craft") || s.includes("sew")) return { label: "Crafts", color: "#703381" };
  if (s.includes("farm") || s.includes("garden")) return { label: "Agriculture", color: "#ca8a04" };
  if (s.includes("tech") || s.includes("computer")) return { label: "Technology", color: "#0369a1" };
  return { label: "Training", color: "#1a56a0" };
};

const REG_STATUS_STYLE = {
  pending: { label: "Pending", color: "#ca8a04", bg: "rgba(202,138,4,0.1)" },
  approved: { label: "Approved", color: "#1e8a5e", bg: "rgba(30,138,94,0.1)" },
  rejected: { label: "Rejected", color: "#e03e3e", bg: "rgba(224,62,62,0.1)" },
  completed: { label: "Completed", color: "#5e7a99", bg: "rgba(94,122,153,0.1)" },
};

// ── Component ──────────────────────────────────────────────────────
export default function LivelihoodTab({ userData, householdID, userName }) {
  const [view, setView] = useState("main");
  const [step, setStep] = useState(1);
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Programs from Firestore (livelihood only) ────────────────────
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // ── All registrations (to count approved slots per program) ──────
  const [allRegs, setAllRegs] = useState([]);

  // ── My registrations ─────────────────────────────────────────────
  const [myRegs, setMyRegs] = useState([]);
  const [loadingMyRegs, setLoadingMyRegs] = useState(false);

  // ── Form ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: "", middleName: "", lastName: "",
    address: "", contact: "", email: "",
    idFile: "", programId: "",
  });

  // Pre-fill from userData
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
        email: userData.email || "",
      }));
    }
  }, [userData]);

  // ── Real-time: Livelihood Programs ONLY ─────────────────────────
  // FIX: filter by programType === "livelihood" so general programs don't show here
  useEffect(() => {
    const q = query(
      collection(db, "Programs"),
      where("programType", "==", "livelihood"),
      orderBy("updatedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPrograms(snap.docs.map(d => {
        const r = d.data();
        return {
          id: d.id,
          title: r.title || r.name || "Untitled Program",
          description: r.description || "",
          date: r.date || "",
          startTime: r.startTime || "",
          endTime: r.endTime || "",
          location: r.location || "",
          slots: parseInt(r.slots || "0", 10) || 0,
          demographic: r.demographic || "",
          status: r.status || "Upcoming",
        };
      }));
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time: ALL registrations (for approved slot count) ───────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "livelihoodRegistrations"), (snap) => {
      setAllRegs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // ── Real-time: MY registrations ──────────────────────────────────
  useEffect(() => {
    const filterValue = householdID;
    if (!filterValue) return;

    setLoadingMyRegs(true);
    const q = query(
      collection(db, "livelihoodRegistrations"),
      where("householdID", "==", filterValue),
      orderBy("submittedAt", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMyRegs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingMyRegs(false);
    }, (err) => {
      console.error("My regs listener:", err);
      setLoadingMyRegs(false);
    });
    return () => unsub();
  }, [householdID]);

  // ── Slot helpers ─────────────────────────────────────────────────
  const getApprovedCount = (programId) =>
    allRegs.filter(r => r.programId === programId && (r.status || "").toLowerCase() === "approved").length;

  const getSlotsLeft = (prog) => {
    if (!prog.slots) return null;
    return prog.slots - getApprovedCount(prog.id);
  };

  const userActiveRegForProgram = (programId) =>
    myRegs.find(r => r.programId === programId && ["pending", "approved"].includes((r.status || "").toLowerCase()));

  // ── Form helpers ─────────────────────────────────────────────────
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selectedProgram = programs.find(p => p.id === form.programId);

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "Required.";
    if (!form.lastName.trim()) e.lastName = "Required.";
    if (!form.address.trim()) e.address = "Required.";
    if (!String(form.contact || "").trim()) e.contact = "Required.";
    if (!form.idFile) e.idFile = "Please upload a valid ID or Barangay Clearance.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.programId) e.programId = "Please select a program.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3) {
      setSubmitting(true);
      try {
        const reg = generateRegNum();
        const timeLabel = [formatTime(selectedProgram?.startTime), formatTime(selectedProgram?.endTime)].filter(Boolean).join(" – ");
        await addDoc(collection(db, "livelihoodRegistrations"), {
          regNum: reg,
          firstName: form.firstName,
          middleName: form.middleName || "",
          lastName: form.lastName,
          fullName: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" "),
          address: form.address,
          contact: form.contact,
          contactNumber: form.contact,
          email: form.email || "",
          idFileName: form.idFile || "",
          householdID: householdID || "",
          userID: userData?.userID || "",
          residentID: userData?.residentID || "",
          programId: selectedProgram?.id || "",
          programName: selectedProgram?.title || "",
          programDate: selectedProgram?.date || "",
          programTime: timeLabel,
          programLocation: selectedProgram?.location || "",
          status: "pending",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setRegNum(reg);
        setStep(4);
      } catch (err) {
        console.error("Submit error:", err);
        setErrors({ submit: "Failed to submit. Please try again." });
      }
      setSubmitting(false);
      return;
    }
    setStep(s => s + 1);
  };

  const resetForm = () => {
    setStep(1); setErrors({});
    setForm({ firstName: "", middleName: "", lastName: "", address: "", contact: "", email: "", idFile: "", programId: "" });
    setView("main");
  };

  const STEP_LABELS = ["Personal Info", "Choose Program", "Confirmation"];

  // ════════════════════════════════════════════════════════════════
  // VIEW: MAIN
  // ════════════════════════════════════════════════════════════════
  if (view === "main") return (
    <div className="lh-page">
      {/* Hero */}
      <div className="svc-hero svc-hero--green">
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow">
              <span className="svc-hero__eyebrow-icon"><BriefcaseIcon /></span>
              Barangay Livelihood Program
            </div>
            <h2 className="svc-hero__title">Livelihood Skills Training</h2>
            <p className="svc-hero__abbr">FREE · OPEN TO ALL RESIDENTS</p>
            <p className="svc-hero__sub">Build new skills, earn more, and grow your small business. All training programs are free for qualified Barangay Malanday residents.</p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              In partnership with DOLE · Open to residents 18 and above
            </div>
          </div>
          <div className="svc-hero__right">
            <button className="sv-btn-primary" style={{ fontSize: "0.8rem" }} onClick={() => setView("myregs")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              My Registrations
            </button>
          </div>
        </div>
      </div>

      {/* Programs */}
      <div className="lh-programs-section">
        <div className="lh-section-label">Available Livelihood Programs</div>
        {loadingPrograms ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>Loading programs…</div>
        ) : programs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>No livelihood programs available at the moment. Check back later.</div>
        ) : (
          <div className="lh-programs-grid">
            {programs.map(p => {
              const slotsLeft = getSlotsLeft(p);
              const approved = getApprovedCount(p.id);
              const full = slotsLeft !== null && slotsLeft <= 0;
              const low = slotsLeft !== null && slotsLeft > 0 && slotsLeft <= 5;
              const tag = getTagStyle(p.demographic || p.title);
              const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
              const activeReg = userActiveRegForProgram(p.id);
              const disabled = full || !!activeReg;

              let btnLabel = "Register Now →";
              if (full) btnLabel = "Program Full";
              else if (activeReg && (activeReg.status || "").toLowerCase() === "approved") btnLabel = "Already Approved ✓";
              else if (activeReg) btnLabel = "Already Registered";

              return (
                <div key={p.id} className={`lh-prog-card${full ? " lh-prog-card--full" : ""}`}>
                  <div className="lh-prog-card__head">
                    <span className="lh-prog-card__tag" style={{ background: `${tag.color}15`, color: tag.color }}>{tag.label}</span>
                    {slotsLeft !== null && (
                      <span className={`lh-prog-card__slots${full ? " lh-prog-card__slots--full" : low ? " lh-prog-card__slots--low" : ""}`}>
                        {full ? "Full" : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left`}
                      </span>
                    )}
                  </div>
                  <div className="lh-prog-card__name">{p.title}</div>
                  <div className="lh-prog-card__desc">{p.description || "—"}</div>
                  <div className="lh-prog-card__meta">
                    {p.date && (
                      <span className="lh-prog-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {formatDate(p.date)}
                      </span>
                    )}
                    {timeLabel && (
                      <span className="lh-prog-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        {timeLabel}
                      </span>
                    )}
                    {p.location && (
                      <span className="lh-prog-meta-item">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {p.location}
                      </span>
                    )}
                  </div>
                  {p.slots > 0 && (
                    <div className="lh-prog-card__slots-bar">
                      <div className="lh-prog-card__slots-fill" style={{
                        width: `${Math.min((approved / p.slots) * 100, 100)}%`,
                        background: full ? "#e03e3e" : low ? "#ca8a04" : "#1e8a5e",
                      }} />
                    </div>
                  )}
                  {activeReg && !full && (
                    <div style={{
                      marginTop: "8px", fontSize: "0.78rem", padding: "5px 10px", borderRadius: "6px",
                      background: (activeReg.status || "").toLowerCase() === "approved" ? "rgba(30,138,94,0.08)" : "rgba(202,138,4,0.08)",
                      color: (activeReg.status || "").toLowerCase() === "approved" ? "#1e8a5e" : "#a16207",
                    }}>
                      {(activeReg.status || "").toLowerCase() === "approved"
                        ? "✓ Your registration is approved"
                        : "⏳ Your registration is pending review"}
                    </div>
                  )}
                  <button
                    className="sv-btn-primary"
                    disabled={disabled}
                    style={{ fontSize: "0.78rem", marginTop: "0.75rem", width: "100%", justifyContent: "center", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
                    onClick={() => { if (!disabled) { set("programId", p.id); setView("register"); setStep(1); } }}
                  >
                    {btnLabel}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VIEW: MY REGISTRATIONS
  // ════════════════════════════════════════════════════════════════
  if (view === "myregs") return (
    <div className="lh-page">
      <div className="po-form-topbar">
        <button className="vawc-back-btn" onClick={() => setView("main")}>‹ Back</button>
        <div className="po-form-topbar__title">My Registrations</div>
      </div>
      <div style={{ padding: "1.25rem 1.75rem" }}>
        {loadingMyRegs ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>Loading…</div>
        ) : myRegs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px", opacity: 0.4 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            <p>You have no registrations yet.</p>
          </div>
        ) : (
          <div className="lh-regs-list">
            {myRegs.map(r => {
              const rawStatus = (r.status || "pending").toLowerCase();
              const sc = REG_STATUS_STYLE[rawStatus] || REG_STATUS_STYLE.pending;
              return (
                <div key={r.id} className="lh-reg-card">
                  <div className="lh-reg-card__top">
                    <div>
                      <div className="lh-reg-card__program">{r.programName || "—"}</div>
                      <div className="lh-reg-card__date">{r.programDate ? formatDate(r.programDate) : "—"}</div>
                    </div>
                    <span className="lh-reg-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div className="lh-reg-card__ref">Ref: {r.regNum || r.id}</div>
                  {rawStatus === "rejected" && r.rejectReason && (
                    <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#e03e3e", background: "rgba(224,62,62,0.07)", padding: "6px 10px", borderRadius: "6px" }}>
                      Reason: {r.rejectReason}
                    </div>
                  )}
                  {rawStatus === "pending" && (
                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#a16207" }}>
                      ⏳ Awaiting admin review
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VIEW: REGISTER FORM
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="lh-page">
      <div className="po-form-topbar">
        <button className="vawc-back-btn" onClick={() => { step > 1 ? setStep(s => s - 1) : setView("main"); setErrors({}); }}>
          ‹ {step > 1 ? "Back" : "Back to Programs"}
        </button>
        <div className="po-form-topbar__title">Register for Training</div>
      </div>

      {step < 4 && (
        <div className="lh-steps">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1; const done = n < step; const active = n === step;
            return (
              <div key={i} className="dr-step-item">
                <div className={`dr-step-circle${done ? " dr-step-circle--done" : active ? " dr-step-circle--active" : ""}`}>
                  {done ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : n}
                </div>
                <span className={`dr-step-label${active ? " dr-step-label--active" : done ? " dr-step-label--done" : ""}`}>{label}</span>
                {i < STEP_LABELS.length - 1 && <div className={`dr-step-line${done ? " dr-step-line--done" : ""}`} />}
              </div>
            );
          })}
        </div>
      )}

      <div className="lh-form-body">
        {/* ── Step 1: Personal Info ── */}
        {step === 1 && (
          <div className="lh-form-section">
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
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Complete Address <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.address ? " sv-input--error" : ""}`} value={form.address} onChange={e => set("address", e.target.value)} placeholder="House No., Street, Barangay Malanday" />
              {errors.address && <span className="sv-error-msg">{errors.address}</span>}
            </div>
            <div className="dr-field-row" style={{ marginTop: "0.75rem" }}>
              <div className="dr-field">
                <label className="sv-label">Contact Number <span className="sv-required">*</span></label>
                <input className={`sv-input${errors.contact ? " sv-input--error" : ""}`} value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="+63 912 345 6789" />
                {errors.contact && <span className="sv-error-msg">{errors.contact}</span>}
              </div>
              <div className="dr-field">
                <label className="sv-label">Email <span className="sv-optional">(Optional)</span></label>
                <input className="sv-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@email.com" />
              </div>
            </div>
            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Valid ID or Barangay Clearance <span className="sv-required">*</span></label>
              <label className={`dr-upload-box${errors.idFile ? " dr-upload-box--error" : ""}`}>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }} onChange={e => e.target.files[0] && set("idFile", e.target.files[0].name)} />
                {form.idFile
                  ? <div className="dr-upload-done"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>{form.idFile}</div>
                  : <div className="dr-upload-placeholder">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    <span>Click to upload</span>
                    <span className="dr-upload-hint">JPG, PNG or PDF · Max 5MB</span>
                  </div>
                }
              </label>
              {errors.idFile && <span className="sv-error-msg">{errors.idFile}</span>}
            </div>
          </div>
        )}

        {/* ── Step 2: Choose Program ── */}
        {step === 2 && (
          <div className="lh-form-section">
            <p className="dr-step-hint">Select the livelihood training program you want to join.</p>
            {loadingPrograms ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#9ca3af" }}>Loading programs…</div>
            ) : (
              <div className="lh-prog-select-list">
                {programs.map(p => {
                  const slotsLeft = getSlotsLeft(p);
                  const full = slotsLeft !== null && slotsLeft <= 0;
                  const selected = form.programId === p.id;
                  const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
                  const activeReg = userActiveRegForProgram(p.id);
                  const disabled = full || !!activeReg;
                  return (
                    <button key={p.id}
                      className={`lh-prog-select-item${selected ? " lh-prog-select-item--active" : ""}${disabled ? " lh-prog-select-item--disabled" : ""}`}
                      disabled={disabled}
                      onClick={() => !disabled && set("programId", p.id)}
                    >
                      <div className="lh-prog-select-item__check">
                        {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                      <div className="lh-prog-select-item__body">
                        <div className="lh-prog-select-item__name">
                          {p.title}
                          {full && <span className="lh-full-badge">Full</span>}
                          {activeReg && !full && <span className="lh-full-badge" style={{ background: "rgba(202,138,4,0.15)", color: "#a16207" }}>Registered</span>}
                        </div>
                        {(p.date || timeLabel) && <div className="lh-prog-select-item__meta">{formatDate(p.date)}{timeLabel ? ` · ${timeLabel}` : ""}</div>}
                        {p.location && <div className="lh-prog-select-item__meta">{p.location}</div>}
                      </div>
                      {slotsLeft !== null && (
                        <div className="lh-prog-select-item__slots" style={{ color: full ? "#e03e3e" : slotsLeft <= 5 ? "#ca8a04" : "#1e8a5e" }}>
                          {full ? "Full" : `${slotsLeft} left`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.programId && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{errors.programId}</span>}
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <div className="lh-form-section">
            <p className="dr-step-hint">Review your information before submitting.</p>
            <div className="dr-review-grid">
              {[
                { label: "Full Name", value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" "), full: true },
                { label: "Address", value: form.address, full: true },
                { label: "Contact", value: form.contact },
                { label: "Email", value: form.email || "—" },
                { label: "ID Uploaded", value: form.idFile || "—", full: true },
                { label: "Program", value: selectedProgram?.title || "—", full: true },
                { label: "Date", value: formatDate(selectedProgram?.date) },
                { label: "Time", value: [formatTime(selectedProgram?.startTime), formatTime(selectedProgram?.endTime)].filter(Boolean).join(" – ") || "—" },
                { label: "Location", value: selectedProgram?.location || "—", full: true },
              ].map((r, i) => (
                <div key={i} className={`dr-review-row${r.full ? " dr-review-row--full" : ""}`}>
                  <span className="dr-review-label">{r.label}</span>
                  <span className="dr-review-value">{r.value}</span>
                </div>
              ))}
            </div>
            {errors.submit && (
              <div style={{ marginTop: "12px", color: "#e03e3e", fontSize: "0.85rem", padding: "10px", background: "rgba(224,62,62,0.07)", borderRadius: "8px" }}>
                {errors.submit}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <div className="lh-success-wrap">
            <div className="po-submitted-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            </div>
            <h3 className="po-submitted-title">Registration Submitted!</h3>
            <p className="po-submitted-sub">You have successfully registered for <strong>{selectedProgram?.title}</strong>. Please wait for admin approval.</p>
            <div className="po-ref-box" style={{ borderColor: "rgba(30,138,94,0.2)", background: "rgba(30,138,94,0.05)" }}>
              <div className="po-ref-label">Registration Number</div>
              <div className="po-ref-num" style={{ color: "#1e8a5e" }}>{regNum}</div>
              <div className="po-ref-hint">Save this to track your registration status</div>
            </div>
            <div className="po-submitted-btns">
              <button className="sv-btn-primary" style={{ background: "#1e8a5e" }} onClick={() => setView("myregs")}>View My Registrations</button>
              <button className="sv-btn-ghost" onClick={resetForm}>Done</button>
            </div>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="po-form-actions">
          <button className="sv-btn-ghost" onClick={() => { step > 1 ? setStep(s => s - 1) : setView("main"); setErrors({}); }}>
            {step === 1 ? "Cancel" : "Previous"}
          </button>
          <button className="sv-btn-primary" style={{ background: "#1e8a5e" }} onClick={handleNext} disabled={submitting}>
            {submitting ? "Submitting…" : step === 3 ? "Submit Registration" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}