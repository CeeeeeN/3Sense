import { useState, useEffect, useRef } from "react";
import {
  collection,
  onSnapshot,
  doc,
  query,
  where,
  serverTimestamp,
  limit,
  writeBatch
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { createNotification } from "../../services/notifications";
import { useLanguage } from "../../context/LanguageContext";

// Keeps digits only, max 11. Converts +63 / 63 / 9XXXXXXXXX into 09XXXXXXXXX
const normalizePHMobile = (value) => {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("63") && d.length >= 12) d = "0" + d.slice(2);
  else if (d.length === 10 && d.startsWith("9")) d = "0" + d;
  return d.slice(0, 11);
};

// Exactly 11 digits, starting with 09
const isValidPHMobile = (value) => /^09\d{9}$/.test(String(value || ""));

// ── SESSION HELPER ────────────────────────────────────────────────────────────
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

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

// ── Description that clamps to 3 lines and expands with "more..." ─────────────
function ExpandableDesc({ text }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => {
      if (!open) setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, open]);

  return (
    <div className="lh-prog-card__desc-wrap">
      <div ref={ref} className={`lh-prog-card__desc${open ? " lh-prog-card__desc--open" : ""}`}>
        {text}
      </div>
      {(overflowing || open) && (
        <button type="button" className="lh-more-btn" onClick={() => setOpen((o) => !o)}>
          {open ? t("less", "less") : t("more_dots", "more...")}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProgramsTab({ userData, householdID, userName }) {
  const { t } = useLanguage();
  const [view, setView] = useState("main"); // "main" | "myregs" | "register"
  const [step, setStep] = useState(1);      // 1 | 2 | 3 | 4 (success)
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef(null);
  const mounted = useRef(false);

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
        contact: normalizePHMobile(userData.contactNumber),
        email: userData.email || "",
      }));
    }
  }, [userData]);

  // Scroll to the top of the form when the step changes
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  useEffect(() => {
    const q = query(
      collection(db, "Programs"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setPrograms(
        snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.programType !== "livelihood" && p.status !== "Completed")
      );
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (programs.length === 0) return;

    const unsubs = programs.map((prog) => {
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
  useEffect(() => {
    const activeUserId = userData?.userID || userData?.residentID || "";
    const hid = householdID || "";

    if (!activeUserId && !hid) return;

    setLoadingMyRegs(true);

    const [queryField, queryValue] = activeUserId
      ? ["userID", activeUserId]
      : ["householdID", hid];

    const q = query(
      collection(db, "programRegistrations"),
      where(queryField, "==", queryValue)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  }, [userData, householdID]);

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
    if (!form.firstName.trim()) e.firstName = t("doc_err_required", "Required.");
    if (!form.lastName.trim()) e.lastName = t("doc_err_required", "Required.");
    if (!form.address.trim()) e.address = t("doc_err_required", "Required.");
    if (!isValidPHMobile(form.contact)) e.contact = t("doc_err_phone", "Contact number must be exactly 11 digits (09XXXXXXXXX).");
    if (!form.idFile) e.idFile = t("doc_err_upload_id", "Please upload a valid ID or Barangay Clearance.");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.programId) e.programId = t("prog_err_select", "Please select a program.");
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
        const prog = selectedProgram;
        const timeLabel = [formatTime(prog?.startTime), formatTime(prog?.endTime)].filter(Boolean).join(" – ");
        const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");
        const activeUserId = userData?.userID || userData?.residentID || "";
        const userUID = userData?.UID || getSaved("UID", null);

        // Firestore batch: both writes succeed or neither does
        const batch = writeBatch(db);

        // 1️⃣ Flat collection → "My Registrations" view
        const flatRegRef = doc(collection(db, "programRegistrations"));
        batch.set(flatRegRef, {
          regNum: reg,
          UID: userUID,
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
          const attendeeRef = doc(db, "Programs", prog.id, "attendees", activeUserId);
          batch.set(
            attendeeRef,
            {
              UID: userUID,
              userID: activeUserId,
              regNum: reg,
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

        await batch.commit();

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
        setErrors({ submit: t("doc_err_submit", "Failed to submit. Please try again.") });
      }
      setSubmitting(false);
      return;
    }

    setStep((s) => s + 1);
  };

  const goToStep = (n) => {
    if (submitting) return;
    setErrors({});
    setStep(n);
  };

  const goBackOrExit = () => {
    if (step > 1) goToStep(step - 1);
    else { setView("main"); setErrors({}); }
  };

  const resetForm = () => {
    setStep(1);
    setErrors({});

    let fullAddress = "";
    if (userData) {
      fullAddress = [
        userData.houseNumber,
        userData.street,
        userData.barangay,
        userData.city
      ].filter(Boolean).join(", ");
    }

    setForm({
      firstName: userData?.firstName || "",
      middleName: userData?.middleName || "",
      lastName: userData?.lastName || "",
      address: fullAddress,
      contact: normalizePHMobile(userData?.contactNumber),
      email: userData?.email || "",
      idFile: "",
      programId: "",
    });

    setView("main");
  };

  const STEP_LABELS = [
    t("prog_step_info", "Personal Info"),
    t("prog_step_choose", "Choose Program"),
    t("prog_step_confirm", "Confirmation")
  ];

  const reqPill = <span className="bf-pill bf-pill--req">{t("required", "Required")}</span>;
  const optPill = <span className="bf-pill">{t("optional", "Optional")}</span>;

  const handleIdFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrors((er) => ({ ...er, idFile: t("doc_err_file_size", "File must be under 5MB.") }));
      e.target.value = "";
      return;
    }
    set("idFile", file.name);
    setErrors((er) => ({ ...er, idFile: undefined }));
  };

  // ════════════════════════════════════════════════════════════════
  // VIEW: MAIN
  // ════════════════════════════════════════════════════════════════
  if (view === "main") return (
    <div className="lh-page">
      {/* Hero Section (contains My Registrations button) */}
      <div className="svc-hero" style={{ background: "linear-gradient(135deg, #1a3a4a 0%, #317D89 100%)" }}>
        <div className="svc-hero__inner">
          <div className="svc-hero__left">
            <div className="svc-hero__eyebrow">
              <span className="svc-hero__eyebrow-icon"><MegaphoneIcon /></span>
              Barangay Programs
            </div>
            <h2 className="svc-hero__title">Community Programs</h2>
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
                        {full ? t("prog_badge_full", "Full") : t("prog_slots_remaining", `${slotsNum} slots remaining`)}
                      </span>
                    )}
                  </div>

                  <div className="lh-prog-card__name">{p.title}</div>

                  <ExpandableDesc text={p.description || "—"} />

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
        <button className="vawc-back-btn" onClick={() => setView("main")}>‹ {t("back", "Back")}</button>
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
                  <div className="lh-reg-card__ref">{t("ref", "Ref")}: {r.regNum || r.id}</div>
                  {rawStatus === "rejected" && r.rejectReason && (
                    <div style={{ marginTop: "6px", fontSize: "0.8rem", color: "#e03e3e", background: "rgba(224,62,62,0.07)", padding: "6px 10px", borderRadius: "6px" }}>
                      {t("prog_reason_label", "Reason:")} {r.rejectReason}
                    </div>
                  )}
                  {rawStatus === "pending" && (
                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#a16207" }}>
                      {t("prog_awaiting_review", "⏳ Awaiting admin review")}
                    </div>
                  )}
                  {(rawStatus === "approved" || rawStatus === "registered") && (
                    <div style={{ marginTop: "6px", fontSize: "0.78rem", color: "#317D89", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckIcon size={11} stroke="#317D89" /> {t("prog_confirmed_box", "Your registration is confirmed")}
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
  // VIEW: REGISTER FORM (3 steps + success), same look as Documents
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="dr-wizard dz-wizard">
      {step < 4 && (
        <div className="dr-wizard-header">
          <div className="dz-stepswrap">
            <ol className="lv-steps" aria-label="Registration progress">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                const clickable = done && !submitting;
                const Node = clickable ? "button" : "div";
                const nodeProps = clickable ? { type: "button", onClick: () => goToStep(n) } : {};
                return (
                  <li key={label} className="lv-steps__li" aria-current={active ? "step" : undefined}>
                    <Node className={`lv-steps__item lv-steps__node${done ? " is-done" : active ? " is-active" : ""}${clickable ? " is-link" : ""}`} {...nodeProps}>
                      <span className="lv-steps__dot">
                        {done
                          ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          : n}
                      </span>
                      <span className="lv-steps__label">{label}</span>
                    </Node>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <div className="dr-wizard-body">
        <div className={`dz-wrap${step <= 2 ? " dz-wrap--wide" : ""}`} ref={topRef}>

          {/* ── Step 1: Personal info ── */}
          {step === 1 && (
            <section className="bz-card">
              <h3 className="bz-heading">{t("prog_step_info", "Personal Info")}</h3>
              <p className="bz-text">{t("doc_details_hint", "Check that your information is correct. Fill in anything that is empty.")}</p>

              <div className="bf-form">
                <div className="bf-group">
                  <div className="bf-group__title">{t("doc_personal_info", "Personal information")}</div>
                  <div className="bf-form--tight">
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="pr-first">{t("profile_first_name", "First name")} {reqPill}</label>
                      <input id="pr-first" className={`bf-input${errors.firstName ? " bf-input--error" : ""}`} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Juan" />
                      {errors.firstName && <div className="bf-error">{errors.firstName}</div>}
                    </div>
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="pr-middle">{t("profile_middle_name", "Middle name")} {optPill}</label>
                      <input id="pr-middle" className="bf-input" value={form.middleName} onChange={(e) => set("middleName", e.target.value)} placeholder="Santos" />
                    </div>
                    <div className="bf-field">
                      <label className="bf-label" htmlFor="pr-last">{t("profile_last_name", "Last name")} {reqPill}</label>
                      <input id="pr-last" className={`bf-input${errors.lastName ? " bf-input--error" : ""}`} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Dela Cruz" />
                      {errors.lastName && <div className="bf-error">{errors.lastName}</div>}
                    </div>

                    <div className="bf-field">
                      <label className="bf-label" htmlFor="pr-contact">{t("doc_phone_number", "Phone number")} {reqPill}</label>
                      <input
                        id="pr-contact"
                        className={`bf-input${errors.contact ? " bf-input--error" : ""}`}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        maxLength={11}
                        value={form.contact}
                        onChange={(e) => set("contact", normalizePHMobile(e.target.value))}
                        placeholder="09123456789"
                      />
                      {errors.contact && <div className="bf-error">{errors.contact}</div>}
                    </div>
                    <div className="bf-field bf-field--span2">
                      <label className="bf-label" htmlFor="pr-email">{t("profile_email", "Email")} {optPill}</label>
                      <input id="pr-email" className="bf-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="juan@email.com" />
                    </div>

                    <div className="bf-field bf-field--full">
                      <label className="bf-label" htmlFor="pr-address">{t("doc_home_address", "Home address")} {reqPill}</label>
                      <input id="pr-address" className={`bf-input${errors.address ? " bf-input--error" : ""}`} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House No., Street, Barangay Malanday, Valenzuela City" />
                      {errors.address && <div className="bf-error">{errors.address}</div>}
                    </div>
                  </div>
                </div>

                <div className="bf-group">
                  <div className="bf-group__title">{t("prog_identification", "Identification")}</div>
                  <div className="bf-form--tight">
                    <div className="bf-field bf-field--full">
                      <div className="bf-label">{t("prog_valid_id_label", "Valid ID or Barangay Clearance")} {reqPill}</div>
                      <label className={`bf-photo${form.idFile ? " is-filled" : ""}${errors.idFile ? " is-error" : ""}`}>
                        <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleIdFile} style={{ display: "none" }} />
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {form.idFile
                            ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                            : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>}
                        </svg>
                        <span className="bf-photo__text">
                          {form.idFile ? (
                            <>
                              <strong>{t("doc_id_added", "ID added")}</strong>
                              <small>{form.idFile} · {t("doc_tap_change", "Tap to change")}</small>
                            </>
                          ) : (
                            <>
                              <strong>{t("doc_tap_add_id", "Tap here to add your ID")}</strong>
                              <small>{t("doc_id_guideline", "A photo or scan. JPG, PNG or PDF, up to 5MB")}</small>
                            </>
                          )}
                        </span>
                      </label>
                      {form.idFile && (
                        <button type="button" className="bf-secondary dz-remove" onClick={() => set("idFile", "")}>
                          {t("doc_remove_file", "Remove this file")}
                        </button>
                      )}
                      {errors.idFile && <div className="bf-error">{errors.idFile}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Step 2: Choose program ── */}
          {step === 2 && (
            <section className="bz-card">
              <h3 className="bz-heading">{t("prog_step_choose", "Choose Program")}</h3>
              <p className="bz-text">{t("prog_step2_hint", "Select the community program you want to join.")}</p>

              {loadingPrograms ? (
                <div className="bz-text">Loading programs…</div>
              ) : (
                <div className="lv-picks" role="radiogroup">
                  {programs.map((p) => {
                    const full = isFull(p);
                    const slotsNum = getSlotsNum(p);
                    const selected = form.programId === p.id;
                    const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
                    const activeReg = userActiveRegForProgram(p.id);
                    const disabled = full || !!activeReg;
                    const hasSlots = p.slots !== undefined && p.slots !== "";

                    return (
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        key={p.id}
                        className={`lv-pick${selected ? " is-active" : ""}`}
                        disabled={disabled}
                        onClick={() => set("programId", p.id)}
                      >
                        <span className="lv-pick__check">
                          {selected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                        </span>
                        <span className="lv-pick__body">
                          <span className="lv-pick__name">
                            {p.title}
                            {full && <span className="lv-pick__badge lv-pick__badge--full">{t("prog_badge_full", "Full")}</span>}
                            {activeReg && !full && <span className="lv-pick__badge">{t("prog_already_registered", "Registered")}</span>}
                          </span>
                          {(p.date || timeLabel) && (
                            <span className="lv-pick__meta">
                              {formatDate(p.date)}{p.endDate && p.endDate !== p.date ? ` – ${formatDate(p.endDate)}` : ""}{timeLabel ? ` · ${timeLabel}` : ""}
                            </span>
                          )}
                          {p.location && <span className="lv-pick__meta">{p.location}</span>}
                          {p.demographic && <span className="lv-pick__meta">{p.demographic}</span>}
                        </span>
                        {hasSlots && (
                          <span className={`lv-pick__slots${full ? " is-full" : slotsNum <= 5 ? " is-low" : ""}`}>
                            {full ? t("prog_badge_full", "Full") : `${slotsNum} left`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.programId && <div className="bf-error" style={{ marginTop: "0.8rem" }}>{errors.programId}</div>}
            </section>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <section className="bz-card">
              <h3 className="bz-heading">{t("prog_check_registration", "Check your registration")}</h3>
              <p className="bz-text">{t("prog_step3_hint", "Review your information before submitting.")}</p>

              <dl className="lv-review">
                {[
                  { label: t("doc_full_name", "Full Name"), value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") },
                  { label: t("doc_address", "Address"), value: form.address },
                  { label: t("profile_contact", "Contact Number"), value: form.contact },
                  { label: t("profile_email", "Email"), value: form.email || "—" },
                  { label: t("doc_id_uploaded", "ID Uploaded"), value: form.idFile || "—" },
                  { label: t("prog_type", "Program"), value: selectedProgram?.title || "—" },
                  {
                    label: t("fac_date", "Date"),
                    value: selectedProgram
                      ? formatDate(selectedProgram.date) + (selectedProgram.endDate && selectedProgram.endDate !== selectedProgram.date ? ` – ${formatDate(selectedProgram.endDate)}` : "")
                      : "—",
                  },
                  { label: t("fac_time", "Time"), value: [formatTime(selectedProgram?.startTime), formatTime(selectedProgram?.endTime)].filter(Boolean).join(" – ") || "—" },
                  { label: t("fac_location", "Location"), value: selectedProgram?.location || "—" },
                  { label: t("prog_demographic", "Demographic"), value: selectedProgram?.demographic || "—" },
                ].map((r, i) => (
                  <div key={i} className="lv-review__row">
                    <dt>{r.label}</dt>
                    <dd>{r.value}</dd>
                  </div>
                ))}
              </dl>

              {selectedProgram?.requirements?.length > 0 && (
                <div className="lv-chosen" style={{ marginTop: "1rem", marginBottom: 0 }}>
                  <div className="lv-chosen__label">{t("prog_requirements_label", "Requirements")}</div>
                  <ul className="dz-chosen-note" style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>
                    {selectedProgram.requirements.map((req, i) => <li key={i}>{req}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* ── Step 4: Done ── */}
          {step === 4 && (
            <section className="bz-card">
              <div className="bf-done">
                <span className="bf-done__icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </span>
                <h3 className="bz-heading">{t("prog_success_title", "Registration Submitted!")}</h3>
                <p className="bz-text">
                  You have successfully registered for <strong>{selectedProgram?.title}</strong>. Please wait for admin approval.
                </p>
                <div className="bt-ref">
                  <div className="bt-ref__label">Registration Number</div>
                  <div className="bt-ref__num">{regNum}</div>
                  <div className="bt-ref__hint">Save this to track your registration status</div>
                </div>
                <div className="bf-done__btns">
                  <button type="button" className="bf-submit dz-again" onClick={() => setView("myregs")}>View My Registrations</button>
                  <button type="button" className="bf-secondary dz-again" onClick={resetForm}>{t("close", "Done")}</button>
                </div>
              </div>
            </section>
          )}

          {errors.submit && <div className="bf-alert">{errors.submit}</div>}

          {step < 4 && (
            <div className="dz-actions">
              <button type="button" className="bf-submit" onClick={handleNext} disabled={submitting}>
                {submitting
                  ? t("prog_submitting_btn", "Submitting…")
                  : step === 3 ? t("prog_submit_reg_btn", "Submit Registration") : t("doc_next", "Next")}
                {!submitting && step < 3 && (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                )}
              </button>
              <button type="button" className="bf-secondary" onClick={goBackOrExit} disabled={submitting}>
                {step === 1 ? t("cancel", "Cancel") : t("back", "Previous")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
