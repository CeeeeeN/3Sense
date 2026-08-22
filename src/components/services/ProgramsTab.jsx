import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  addDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  limit
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { createNotification } from "../../services/notifications";

// ── Reg number generator ──────────────────────────────────────────────────────
const generateRegNum = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `PR-${year}-${rand}`;
};

// ── Formatting helpers ────────────────────────────────────────────────────────
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
  if (s.includes("health") || s.includes("medical")) return { label: "Health", color: "#0369a1" };
  if (s.includes("youth") || s.includes("student")) return { label: "Youth", color: "#703381" };
  if (s.includes("senior") || s.includes("elderly")) return { label: "Senior", color: "#92400e" };
  if (s.includes("women") || s.includes("woman")) return { label: "Women", color: "#be185d" };
  if (s.includes("environment") || s.includes("eco")) return { label: "Environment", color: "#166534" };
  if (s.includes("sport") || s.includes("athletic")) return { label: "Sports", color: "#1d4ed8" };
  if (s.includes("livelihood") || s.includes("skill")) return { label: "Livelihood", color: "#1e8a5e" };
  return { label: "Community", color: "#317D89" };
};

const REG_STATUS_STYLE = {
  pending: { label: "Pending", color: "#ca8a04", bg: "rgba(202,138,4,0.1)" },
  approved: { label: "Approved", color: "#1e8a5e", bg: "rgba(30,138,94,0.1)" },
  rejected: { label: "Rejected", color: "#e03e3e", bg: "rgba(224,62,62,0.1)" },
  registered: { label: "Registered", color: "#317D89", bg: "rgba(49,125,137,0.1)" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const PinIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const DocsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const MegaphoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);
const CheckIcon = ({ size = 14, stroke = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProgramsTab({ userData, householdID, userName }) {
  const [view, setView] = useState("main"); // "main" | "myregs" | "register"
  const [step, setStep] = useState(1);      // 1 | 2 | 3 | 4 (success)
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ── Programs (general only, exclude livelihood) ───────────────────
  const [programs, setPrograms] = useState([]);
  const [programApprovedCounts, setProgramApprovedCounts] = useState({});
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // ── My registrations ──────────────────────────────────────────────
  const [myRegs, setMyRegs] = useState([]);
  const [loadingMyRegs, setLoadingMyRegs] = useState(false);

  // ── Form state ────────────────────────────────────────────────────
  const BLANK = {
    firstName: "", middleName: "", lastName: "",
    address: "", contact: "", email: "",
    idFile: "", programId: "",
  };
  const [form, setForm] = useState(BLANK);

  // Pre-fill from userData
  useEffect(() => {
    if (userData) {
      const fullAddress = [
        userData.houseNumber, userData.street,
        userData.barangay, userData.city,
      ].filter(Boolean).join(", ");
      setForm((f) => ({
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

  // ── Real-time: Programs ───────────────────────────────────────────
  useEffect(() => {
    // BOUNDED QUERY: Cap the programs fetch to prevent downloading years of historical data
    const q = query(
      collection(db, "Programs"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setPrograms(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          // Client-side filtering remains intact
          .filter((p) => p.programType !== "livelihood" && p.status !== "Completed")
      );
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (programs.length === 0) return;
    
    const unsubs = programs.map((prog) => {
      // BOUNDED QUERY: Prevent the N+1 read multiplier from crashing the app
      const attendeesQuery = query(
        collection(db, "Programs", prog.id, "attendees"),
        limit(300)
      );

      return onSnapshot(attendeesQuery, (snap) => {
        const approved = snap.docs.filter(
          (d) => (d.data().status || "").toLowerCase() === "approved"
        ).length;
        setProgramApprovedCounts((prev) => ({ ...prev, [prog.id]: approved }));
      });
    });
    
    return () => unsubs.forEach((u) => u());
  }, [programs]);

  // ── Real-time: My registrations ───────────────────────────────────
  //
  // ROOT CAUSE FIX: The previous code used `where("householdID", ...)` with
  // a guard `if (!householdID) return`. If the householdID prop is null or
  // undefined (common when the parent hasn't loaded it yet), the listener
  // is silently skipped — myRegs stays [] — and "Already Registered" is
  // never detected.
  //
  // Solution: derive the user's ID from userData (always available) and
  // query by "userID" instead. householdID is kept as a fallback only.
  // orderBy is also removed to avoid requiring a composite Firestore index.
  useEffect(() => {
    const activeUserId = userData?.userID || userData?.residentID || "";
    const hid = householdID || "";

    // Need at least one identifier
    if (!activeUserId && !hid) return;

    setLoadingMyRegs(true);

    // Query by userID (most reliable) or householdID as fallback
    const [queryField, queryValue] = activeUserId
      ? ["userID", activeUserId]
      : ["householdID", hid];

    const q = query(
      collection(db, "programRegistrations"),
      where(queryField, "==", queryValue)
      // No orderBy — avoids composite index requirement; sorted client-side below
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Newest first, client-side
        docs.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        setMyRegs(docs);
        setLoadingMyRegs(false);
      },
      (err) => {
        console.error("My regs listener error:", err);
        setLoadingMyRegs(false);
      }
    );

    return () => unsub();
  }, [userData, householdID]); // re-run when either identity value changes

  // ── Derived helpers ───────────────────────────────────────────────
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedProgram = programs.find((p) => p.id === form.programId);

  const userActiveRegForProgram = (programId) =>
    myRegs.find(
      (r) =>
        r.programId === programId &&
        ["pending", "approved", "registered"].includes((r.status || "").toLowerCase())
    );

  const getSlotsNum = (prog) => {
    const total = Number(prog.slots) || 0;
    if (total === 0) return 0;
    const approved = programApprovedCounts[prog.id] || 0;
    return Math.max(total - approved, 0);
  };
  const isFull = (prog) => {
    const n = getSlotsNum(prog);
    return prog.slots !== undefined && prog.slots !== "" && n <= 0;
  };
  const isLow = (prog) => {
    const n = getSlotsNum(prog);
    return !isFull(prog) && prog.slots && n > 0 && n <= 5;
  };

  // ── Validation ────────────────────────────────────────────────────
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
        const reg = generateRegNum(); // local var — state `regNum` is still "" here
        const prog = selectedProgram;
        const timeLabel = [formatTime(prog?.startTime), formatTime(prog?.endTime)].filter(Boolean).join(" – ");
        const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
        const activeUserId = userData?.userID || userData?.residentID || "";

        // 1️⃣ Flat collection → "My Registrations" view
        await addDoc(collection(db, "programRegistrations"), {
          regNum: reg,              // ← use local var, not stale state
          firstName: form.firstName,
          middleName: form.middleName || "",
          lastName: form.lastName,
          fullName,
          address: form.address,
          contact: form.contact,
          contactNumber: form.contact,
          email: form.email || "",
          idFileName: form.idFile || "",
          householdID: householdID || "",
          userID: activeUserId,
          residentID: userData?.residentID || "",
          programId: prog?.id || "",
          programName: prog?.title || "",
          programDate: prog?.date || "",
          programTime: timeLabel,
          programLocation: prog?.location || "",
          status: "pending",
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 2️⃣ Attendee sub-doc → ManagePrograms workspace
        if (activeUserId && prog?.id) {
          await setDoc(
            doc(db, "Programs", prog.id, "attendees", activeUserId),
            {
              userID: activeUserId,
              userName: userName || fullName,
              fullName,
              contact: form.contact,
              contactNumber: form.contact,
              householdID: householdID || "",
              residentID: userData?.residentID || "",
              programId: prog.id,
              programName: prog.title || "",
              programDate: prog.date || "",
              status: "pending",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        // 3️⃣ Notification
        await createNotification(
          "feedback",
          `${userName || fullName} registered for the program "${prog?.title || "a program"}".`,
          userName || fullName,
          ""
        );

        setRegNum(reg);
        setStep(4);
      } catch (err) {
        console.error("Submit error:", err);
        setErrors({ submit: "Failed to submit. Please try again." });
      }
      setSubmitting(false);
      return;
    }

    setStep((s) => s + 1);
  };

  const resetForm = () => {
    setStep(1); setErrors({});
    setForm(BLANK);
    setView("main");
  };

  const STEP_LABELS = ["Personal Info", "Choose Program", "Confirmation"];

  // ════════════════════════════════════════════════════════════════
  // VIEW: MAIN
  // ════════════════════════════════════════════════════════════════
  if (view === "main") return (
    <div className="lh-page">
      {/* Hero */}
      <div className="svc-hero" style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #317D89 100%)" }}>
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow">
              <span className="svc-hero__eyebrow-icon"><MegaphoneIcon /></span>
              Barangay Programs
            </div>
            <h2 className="svc-hero__title">Community Programs</h2>
            <p className="svc-hero__abbr">OPEN TO ALL BARANGAY RESIDENTS</p>
            <p className="svc-hero__sub">
              Join barangay-organized programs designed to uplift and strengthen the community.
              Register now to secure your slot before they fill up.
            </p>
            <div className="svc-hero__law">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Organized by Barangay Malanday · Open to all qualified residents
            </div>
          </div>
          <div className="svc-hero__right">
            <button className="sv-btn-primary" style={{ fontSize: "0.8rem" }} onClick={() => setView("myregs")}>
              <DocsIcon /> My Registrations
            </button>
          </div>
        </div>
      </div>

      {/* Programs grid */}
      <div className="lh-programs-section">
        <div className="lh-section-label">Available Programs</div>

        {loadingPrograms ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>Loading programs…</div>
        ) : programs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            No programs available at the moment. Check back later.
          </div>
        ) : (
          <div className="lh-programs-grid">
            {programs.map((p) => {
              const full = isFull(p);
              const low = isLow(p);
              const slotsNum = getSlotsNum(p);
              const tag = getTagStyle(p.demographic || p.title || "");
              const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
              const activeReg = userActiveRegForProgram(p.id);
              const disabled = full || !!activeReg;

              let btnLabel = "Register Now →";
              if (full) btnLabel = "Program Full";
              else if (activeReg && (activeReg.status || "").toLowerCase() === "approved") btnLabel = "Already Approved ✓";
              else if (activeReg && (activeReg.status || "").toLowerCase() === "registered") btnLabel = "Already Registered ✓";
              else if (activeReg) btnLabel = "Already Registered";

              return (
                <div key={p.id} className={`lh-prog-card${full ? " lh-prog-card--full" : ""}`}>
                  <div className="lh-prog-card__head">
                    <span className="lh-prog-card__tag" style={{ background: `${tag.color}15`, color: tag.color }}>
                      {tag.label}
                    </span>
                    {p.slots !== undefined && p.slots !== "" && (
                      <span className={`lh-prog-card__slots${full ? " lh-prog-card__slots--full" : low ? " lh-prog-card__slots--low" : ""}`}>
                        {full ? "Full" : `${slotsNum} slot${slotsNum !== 1 ? "s" : ""} left`}
                      </span>
                    )}
                  </div>

                  <div className="lh-prog-card__name">{p.title}</div>
                  <div className="lh-prog-card__desc">{p.description || "—"}</div>

                  <div className="lh-prog-card__meta">
                    {p.date && (
                      <span className="lh-prog-meta-item">
                        <CalendarIcon />
                        {formatDate(p.date)}
                        {p.endDate && p.endDate !== p.date ? ` – ${formatDate(p.endDate)}` : ""}
                      </span>
                    )}
                    {timeLabel && <span className="lh-prog-meta-item"><ClockIcon /> {timeLabel}</span>}
                    {p.location && <span className="lh-prog-meta-item"><PinIcon /> {p.location}</span>}
                    {p.demographic && <span className="lh-prog-meta-item"><UsersIcon /> {p.demographic}</span>}
                  </div>

                  {p.slots !== undefined && p.slots !== "" && (
                    <div className="lh-prog-card__slots-bar">
                      <div className="lh-prog-card__slots-fill" style={{
                        width: full ? "100%" : low ? "75%" : "30%",
                        background: full ? "#e03e3e" : low ? "#ca8a04" : "#317D89",
                      }} />
                    </div>
                  )}

                  {activeReg && !full && (
                    <div style={{
                      marginTop: "8px", fontSize: "0.78rem", padding: "5px 10px", borderRadius: "6px",
                      background: ["approved", "registered"].includes((activeReg.status || "").toLowerCase())
                        ? "rgba(49,125,137,0.08)" : "rgba(202,138,4,0.08)",
                      color: ["approved", "registered"].includes((activeReg.status || "").toLowerCase())
                        ? "#317D89" : "#a16207",
                    }}>
                      {["approved", "registered"].includes((activeReg.status || "").toLowerCase())
                        ? "✓ Your registration is confirmed"
                        : "⏳ Your registration is pending review"}
                    </div>
                  )}

                  <button
                    className="sv-btn-primary"
                    disabled={disabled}
                    style={{
                      fontSize: "0.78rem", marginTop: "0.75rem", width: "100%",
                      justifyContent: "center",
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? "not-allowed" : "pointer",
                      background: disabled ? (full ? "#9ca3af" : "#6b7280") : "#317D89",
                    }}
                    onClick={() => {
                      if (!disabled) {
                        set("programId", p.id);
                        setView("register");
                        setStep(1);
                      }
                    }}
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
        <div className="po-form-topbar__title">My Program Registrations</div>
      </div>

      <div style={{ padding: "1.25rem 1.75rem" }}>
        {loadingMyRegs ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>Loading…</div>
        ) : myRegs.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "#9ca3af" }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px", opacity: 0.4 }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <p>You have no program registrations yet.</p>
          </div>
        ) : (
          <div className="lh-regs-list">
            {myRegs.map((r) => {
              const rawStatus = (r.status || "pending").toLowerCase();
              const sc = REG_STATUS_STYLE[rawStatus] || REG_STATUS_STYLE.pending;
              return (
                <div key={r.id} className="lh-reg-card">
                  <div className="lh-reg-card__top">
                    <div>
                      <div className="lh-reg-card__program">{r.programName || "—"}</div>
                      <div className="lh-reg-card__date">
                        {r.programDate ? formatDate(r.programDate) : "—"}
                        {r.programTime ? ` · ${r.programTime}` : ""}
                        {r.programLocation ? ` · 📍 ${r.programLocation}` : ""}
                      </div>
                    </div>
                    <span className="lh-reg-status" style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
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
                  {(rawStatus === "approved" || rawStatus === "registered") && (
                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#317D89", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckIcon size={11} stroke="#317D89" /> Your registration is confirmed
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
  // VIEW: REGISTER FORM (3-step + success)
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="lh-page">
      <div className="po-form-topbar">
        <button
          className="vawc-back-btn"
          onClick={() => {
            if (step > 1) { setStep((s) => s - 1); setErrors({}); }
            else { setView("main"); setErrors({}); }
          }}
        >
          ‹ {step > 1 ? "Back" : "Back to Programs"}
        </button>
        <div className="po-form-topbar__title">Register for Program</div>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="lh-steps">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div key={i} className="dr-step-item">
                <div className={`dr-step-circle${done ? " dr-step-circle--done" : active ? " dr-step-circle--active" : ""}`}>
                  {done
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    : n}
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
                <input
                  className={`sv-input${errors.firstName ? " sv-input--error" : ""}`}
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="Juan"
                />
                {errors.firstName && <span className="sv-error-msg">{errors.firstName}</span>}
              </div>
              <div className="dr-field">
                <label className="sv-label">Middle Name</label>
                <input className="sv-input" value={form.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="Santos" />
              </div>
              <div className="dr-field">
                <label className="sv-label">Last Name <span className="sv-required">*</span></label>
                <input
                  className={`sv-input${errors.lastName ? " sv-input--error" : ""}`}
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Dela Cruz"
                />
                {errors.lastName && <span className="sv-error-msg">{errors.lastName}</span>}
              </div>
            </div>

            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Complete Address <span className="sv-required">*</span></label>
              <input
                className={`sv-input${errors.address ? " sv-input--error" : ""}`}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="House No., Street, Barangay Malanday"
              />
              {errors.address && <span className="sv-error-msg">{errors.address}</span>}
            </div>

            <div className="dr-field-row" style={{ marginTop: "0.75rem" }}>
              <div className="dr-field">
                <label className="sv-label">Contact Number <span className="sv-required">*</span></label>
                <input
                  className={`sv-input${errors.contact ? " sv-input--error" : ""}`}
                  value={form.contact}
                  onChange={(e) => set("contact", e.target.value)}
                  placeholder="+63 912 345 6789"
                />
                {errors.contact && <span className="sv-error-msg">{errors.contact}</span>}
              </div>
              <div className="dr-field">
                <label className="sv-label">Email <span className="sv-optional">(Optional)</span></label>
                <input className="sv-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="juan@email.com" />
              </div>
            </div>

            <div className="dr-field" style={{ marginTop: "0.75rem" }}>
              <label className="sv-label">Valid ID or Barangay Clearance <span className="sv-required">*</span></label>
              <label className={`dr-upload-box${errors.idFile ? " dr-upload-box--error" : ""}`}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && set("idFile", e.target.files[0].name)}
                />
                {form.idFile
                  ? <div className="dr-upload-done">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    {form.idFile}
                  </div>
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
            <p className="dr-step-hint">Select the community program you want to join.</p>
            {loadingPrograms ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: "#9ca3af" }}>Loading programs…</div>
            ) : (
              <div className="lh-prog-select-list">
                {programs.map((p) => {
                  const full = isFull(p);
                  const slotsNum = getSlotsNum(p);
                  const selected = form.programId === p.id;
                  const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
                  const activeReg = userActiveRegForProgram(p.id);
                  const disabled = full || !!activeReg;

                  return (
                    <button
                      key={p.id}
                      className={`lh-prog-select-item${selected ? " lh-prog-select-item--active" : ""}${disabled ? " lh-prog-select-item--disabled" : ""}`}
                      disabled={disabled}
                      onClick={() => !disabled && set("programId", p.id)}
                    >
                      <div className="lh-prog-select-item__check">
                        {selected && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="lh-prog-select-item__body">
                        <div className="lh-prog-select-item__name">
                          {p.title}
                          {full && <span className="lh-full-badge">Full</span>}
                          {activeReg && !full && (
                            <span className="lh-full-badge" style={{ background: "rgba(202,138,4,0.15)", color: "#a16207" }}>
                              Registered
                            </span>
                          )}
                        </div>
                        {(p.date || timeLabel) && (
                          <div className="lh-prog-select-item__meta">
                            {formatDate(p.date)}{p.endDate && p.endDate !== p.date ? ` – ${formatDate(p.endDate)}` : ""}
                            {timeLabel ? ` · ${timeLabel}` : ""}
                          </div>
                        )}
                        {p.location && <div className="lh-prog-select-item__meta">{p.location}</div>}
                        {p.demographic && <div className="lh-prog-select-item__meta">{p.demographic}</div>}
                      </div>
                      {p.slots !== undefined && p.slots !== "" && (
                        <div className="lh-prog-select-item__slots" style={{ color: full ? "#e03e3e" : slotsNum <= 5 ? "#ca8a04" : "#317D89" }}>
                          {full ? "Full" : `${slotsNum} left`}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.programId && (
              <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>
                {errors.programId}
              </span>
            )}
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
                {
                  label: "Date",
                  value: selectedProgram
                    ? formatDate(selectedProgram.date) +
                    (selectedProgram.endDate && selectedProgram.endDate !== selectedProgram.date
                      ? ` – ${formatDate(selectedProgram.endDate)}` : "")
                    : "—",
                },
                {
                  label: "Time",
                  value: [formatTime(selectedProgram?.startTime), formatTime(selectedProgram?.endTime)].filter(Boolean).join(" – ") || "—",
                },
                { label: "Location", value: selectedProgram?.location || "—", full: true },
                { label: "Demographic", value: selectedProgram?.demographic || "—" },
              ].map((r, i) => (
                <div key={i} className={`dr-review-row${r.full ? " dr-review-row--full" : ""}`}>
                  <span className="dr-review-label">{r.label}</span>
                  <span className="dr-review-value">{r.value}</span>
                </div>
              ))}
            </div>
            {selectedProgram?.requirements?.length > 0 && (
              <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(49,125,137,0.05)", borderRadius: "8px", border: "1px solid rgba(49,125,137,0.15)" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#317D89", marginBottom: "6px" }}>Requirements</div>
                <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.82rem", color: "#4b5563" }}>
                  {selectedProgram.requirements.map((req, i) => <li key={i}>{req}</li>)}
                </ul>
              </div>
            )}
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
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className="po-submitted-title">Registration Submitted!</h3>
            <p className="po-submitted-sub">
              You have successfully registered for <strong>{selectedProgram?.title}</strong>.
              Please wait for admin approval.
            </p>
            <div className="po-ref-box" style={{ borderColor: "rgba(49,125,137,0.2)", background: "rgba(49,125,137,0.05)" }}>
              <div className="po-ref-label">Registration Number</div>
              <div className="po-ref-num" style={{ color: "#317D89" }}>{regNum}</div>
              <div className="po-ref-hint">Save this to track your registration status</div>
            </div>
            <div className="po-submitted-btns">
              <button className="sv-btn-primary" style={{ background: "#317D89" }} onClick={() => setView("myregs")}>
                View My Registrations
              </button>
              <button className="sv-btn-ghost" onClick={resetForm}>Done</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {step < 4 && (
        <div className="po-form-actions">
          <button
            className="sv-btn-ghost"
            onClick={() => {
              if (step > 1) { setStep((s) => s - 1); setErrors({}); }
              else { setView("main"); setErrors({}); }
            }}
          >
            {step === 1 ? "Cancel" : "Previous"}
          </button>
          <button
            className="sv-btn-primary"
            style={{ background: "#317D89" }}
            onClick={handleNext}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : step === 3 ? "Submit Registration" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}