import { useState, useEffect, useRef } from "react";
import { BriefcaseIcon } from "../../Icons";
import { db } from "../../../firebase/firebase";
import {
  collection, onSnapshot, query, where,
  addDoc, serverTimestamp, orderBy, limit
} from "firebase/firestore";

// ── SESSION HELPER ─────────────────────────────────────────────────
const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

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
  if (s.includes("food") || s.includes("process")) return { label: "Manufacturing", color: "#17714d" };
  if (s.includes("business") || s.includes("negosyo")) return { label: "Business", color: "#1a56a0" };
  if (s.includes("craft") || s.includes("sew")) return { label: "Crafts", color: "#703381" };
  if (s.includes("farm") || s.includes("garden")) return { label: "Agriculture", color: "#8a6d00" };
  if (s.includes("tech") || s.includes("computer")) return { label: "Technology", color: "#0369a1" };
  return { label: "Training", color: "#1a56a0" };
};

const REG_STATUS_STYLE = {
  pending:   { label: "Pending",   color: "#8a6d00", bg: "rgba(202,138,4,0.14)",  icon: "clock" },
  approved:  { label: "Approved",  color: "#17714d", bg: "rgba(30,138,94,0.13)",  icon: "check" },
  rejected:  { label: "Rejected",  color: "#b71c1c", bg: "rgba(224,62,62,0.12)",  icon: "x" },
  completed: { label: "Completed", color: "#3f5d7e", bg: "rgba(94,122,153,0.14)", icon: "flag" },
};

// ── Icons ──────────────────────────────────────────────────────────
const Ico = ({ size = 22, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ICONS = {
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
  clock:    <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  pin:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>,
  check:    <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
  x:        <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>,
  flag:     <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
  file:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  upload:   <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
  list:     <><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></>,
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

// ── Description that clamps to 3 lines and expands with "more..." ───
function ExpandableDesc({ text }) {
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => { if (!open) setOverflowing(el.scrollHeight > el.clientHeight + 1); };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, open]);

  return (
    <div className="lv-desc-wrap">
      <div ref={ref} className={`lv-desc${open ? " is-open" : ""}`}>{text}</div>
      {(overflowing || open) && (
        <button type="button" className="lv-more" onClick={() => setOpen(o => !o)}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

const BLANK_FORM = {
  firstName: "", middleName: "", lastName: "",
  address: "", contact: "", email: "",
  idFile: "", programId: "",
};

// ── Component ──────────────────────────────────────────────────────
export default function LivelihoodTab({ userData, householdID, userName }) {
  const [view, setView] = useState("main");
  const [step, setStep] = useState(1);
  const [regNum, setRegNum] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const topRef = useRef(null);

  // ── Programs from Firestore (livelihood only) ────────────────────
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // ── All registrations (to count approved slots per program) ──────
  const [programApprovedCounts, setProgramApprovedCounts] = useState({});

  // ── My registrations ─────────────────────────────────────────────
  const [myRegs, setMyRegs] = useState([]);
  const [loadingMyRegs, setLoadingMyRegs] = useState(false);

  // ── Form ─────────────────────────────────────────────────────────
  const [form, setForm] = useState(BLANK_FORM);

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

  // Bring the person back to the top whenever the screen or step changes
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view, step]);

  // ── Real-time: Livelihood Programs ONLY ─────────────────────────
  useEffect(() => {
    // BOUNDED QUERY: Cap to the 50 most recent active livelihood programs
    const q = query(
      collection(db, "Programs"),
      where("programType", "==", "livelihood"),
      orderBy("updatedAt", "desc"),
      limit(50)
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
      }).filter(p => p.status !== "Completed"));
      setLoadingPrograms(false);
    }, (error) => {
      console.error("Error fetching livelihood programs:", error);
      setLoadingPrograms(false);
    });
    return () => unsub();
  }, []);

  // ── Real-time: Approved Slot Counts (Scoped & Bounded) ──────────
  useEffect(() => {
    if (programs.length === 0) return;

    const unsubs = programs.map((prog) => {
      // BOUNDED QUERY: Only fetch registrations for THIS specific program, capped at 300.
      const q = query(
        collection(db, "livelihoodRegistrations"),
        where("programId", "==", prog.id),
        limit(300)
      );

      return onSnapshot(q, (snap) => {
        const approved = snap.docs.filter(
          (d) => (d.data().status || "").toLowerCase() === "approved"
        ).length;
        setProgramApprovedCounts((prev) => ({ ...prev, [prog.id]: approved }));
      });
    });

    return () => unsubs.forEach((u) => u());
  }, [programs]);

  // ── Real-time: MY registrations (Decoupled Query) ──────────────────
  useEffect(() => {
    const activeUserId = userData?.userID || userData?.residentID || "";
    const hid = householdID || "";
    const userUID = userData?.UID || getSaved("UID", null);

    if (!activeUserId && !hid && !userUID) return;

    setLoadingMyRegs(true);

    const [queryField, queryValue] = userUID
      ? ["UID", userUID]
      : activeUserId
        ? ["userID", activeUserId]
        : ["householdID", hid];

    const q = query(
      collection(db, "livelihoodRegistrations"),
      where(queryField, "==", queryValue)
    );

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side to avoid composite index requirements
      docs.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setMyRegs(docs);
      setLoadingMyRegs(false);
    }, (err) => {
      console.error("My regs listener:", err);
      setLoadingMyRegs(false);
    });
    return () => unsub();
  }, [userData, householdID]);

  // ── Slot helpers ─────────────────────────────────────────────────
  const getApprovedCount = (programId) => programApprovedCounts[programId] || 0;

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
    if (!form.firstName.trim()) e.firstName = "Please type your first name.";
    if (!form.lastName.trim()) e.lastName = "Please type your last name.";
    if (!form.address.trim()) e.address = "Please type your address.";
    if (!String(form.contact || "").trim()) e.contact = "Please type your phone number.";
    if (!form.idFile) e.idFile = "Please add a photo or scan of your valid ID or Barangay Clearance.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.programId) e.programId = "Please tap the program you want to join.";
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

        // Permanent UID
        const userUID = userData?.UID || getSaved("UID", null);

        await addDoc(collection(db, "livelihoodRegistrations"), {
          regNum: reg,
          UID: userUID,
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
        setErrors({ submit: "Sorry, your registration could not be sent. Please try again." });
      }
      setSubmitting(false);
      return;
    }
    setStep(s => s + 1);
  };

  const resetForm = () => {
    setStep(1); setErrors({});
    setForm(BLANK_FORM);
    setView("main");
  };

  const STEP_LABELS = ["Your information", "Choose a program", "Check and send"];

  const BackButton = ({ label, onClick }) => (
    <button type="button" className="vz-back" onClick={onClick}>
      <ArrowLeft /> {label}
    </button>
  );

  const Hero = () => (
    <div className="svc-hero svc-hero--green bz-hero">
      <div className="svc-hero__inner">
        <div className="svc-hero__left">
          <div className="svc-hero__eyebrow"><span className="svc-hero__eyebrow-icon"><BriefcaseIcon /></span>Barangay Livelihood Program</div>
          <h2 className="svc-hero__title">Livelihood Skills Training</h2>
          <p className="svc-hero__sub">Learn new skills to improve your work or your income. Choose a training program below and register.</p>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VIEW: MAIN
  // ════════════════════════════════════════════════════════════════
  if (view === "main") return (
    <div className="bz-page">
      <Hero />

      <div className="bz-wrap" ref={topRef}>
        <button type="button" className="vz-choice lv-myregs" onClick={() => setView("myregs")}>
          <span className="vz-choice__icon vz-choice__icon--teal"><Ico size={30}>{ICONS.list}</Ico></span>
          <span className="vz-choice__body">
            <span className="vz-choice__title">My registrations</span>
            <span className="vz-choice__desc">See the programs you have already registered for.</span>
          </span>
          <span className="vz-choice__arrow"><ArrowRight /></span>
        </button>

        <section className="bz-card">
          <h3 className="bz-heading">Available training programs</h3>
          <p className="bz-text">Tap the green Register button on the program you want to join.</p>

          {loadingPrograms ? (
            <div className="lv-empty">Loading programs…</div>
          ) : programs.length === 0 ? (
            <div className="lv-empty">There are no livelihood programs right now. Please check back later.</div>
          ) : (
            <div className="lv-grid">
              {programs.map(p => {
                const slotsLeft = getSlotsLeft(p);
                const approved = getApprovedCount(p.id);
                const full = slotsLeft !== null && slotsLeft <= 0;
                const low = slotsLeft !== null && slotsLeft > 0 && slotsLeft <= 5;
                const tag = getTagStyle(p.demographic || p.title);
                const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
                const activeReg = userActiveRegForProgram(p.id);
                const activeStatus = (activeReg?.status || "").toLowerCase();
                const disabled = full || !!activeReg;

                let btnLabel = "Register now";
                if (full) btnLabel = "Program full";
                else if (activeReg && activeStatus === "approved") btnLabel = "You are approved";
                else if (activeReg) btnLabel = "You already registered";

                return (
                  <article key={p.id} className={`lv-card${full ? " is-full" : ""}`}>
                    <div className="lv-card__head">
                      <span className="lv-tag" style={{ background: `${tag.color}1a`, color: tag.color }}>{tag.label}</span>
                      {slotsLeft !== null && (
                        <span className={`lv-slots${full ? " is-full" : low ? " is-low" : ""}`}>
                          {full ? "Full" : `${slotsLeft} slot${slotsLeft !== 1 ? "s" : ""} left`}
                        </span>
                      )}
                    </div>

                    <h4 className="lv-card__title">{p.title}</h4>
                    <ExpandableDesc text={p.description || "—"} />

                    <ul className="lv-meta">
                      {p.date && <li><Ico>{ICONS.calendar}</Ico><span>{formatDate(p.date)}</span></li>}
                      {timeLabel && <li><Ico>{ICONS.clock}</Ico><span>{timeLabel}</span></li>}
                      {p.location && <li><Ico>{ICONS.pin}</Ico><span>{p.location}</span></li>}
                    </ul>

                    {p.slots > 0 && (
                      <div className="lv-bar" aria-hidden="true">
                        <div className="lv-bar__fill" style={{
                          width: `${Math.min((approved / p.slots) * 100, 100)}%`,
                          background: full ? "#c62828" : low ? "#b7791f" : "#1e8a5e",
                        }} />
                      </div>
                    )}

                    {activeReg && !full && (
                      <div className={`lv-status-note${activeStatus === "approved" ? " is-ok" : ""}`}>
                        <Ico size={20}>{activeStatus === "approved" ? ICONS.check : ICONS.clock}</Ico>
                        {activeStatus === "approved" ? "Your registration is approved." : "Your registration is waiting for review."}
                      </div>
                    )}

                    <button
                      type="button"
                      className="lv-register"
                      disabled={disabled}
                      onClick={() => { if (!disabled) { set("programId", p.id); setView("register"); setStep(1); } }}
                    >
                      {btnLabel}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <div className="bz-legal bd-legal">Program coordination: subject to available training programs and eligibility requirements</div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VIEW: MY REGISTRATIONS
  // ════════════════════════════════════════════════════════════════
  if (view === "myregs") return (
    <div className="bz-page">
      <Hero />

      <div className="bz-wrap" ref={topRef}>
        <section className="bz-card">
          <BackButton label="Back to programs" onClick={() => setView("main")} />
          <h3 className="bz-heading">My registrations</h3>
          <p className="bz-text">These are the programs you registered for.</p>

          {loadingMyRegs ? (
            <div className="lv-empty">Loading…</div>
          ) : myRegs.length === 0 ? (
            <div className="lv-empty">You have not registered for any program yet.</div>
          ) : (
            <div className="lv-regs">
              {myRegs.map(r => {
                const rawStatus = (r.status || "pending").toLowerCase();
                const sc = REG_STATUS_STYLE[rawStatus] || REG_STATUS_STYLE.pending;
                return (
                  <article key={r.id} className="lv-reg">
                    <div className="lv-reg__top">
                      <div>
                        <div className="lv-reg__name">{r.programName || "—"}</div>
                        <div className="lv-reg__date">{r.programDate ? formatDate(r.programDate) : "—"}</div>
                      </div>
                      <span className="lv-badge" style={{ background: sc.bg, color: sc.color }}>
                        <Ico size={20}>{ICONS[sc.icon]}</Ico> {sc.label}
                      </span>
                    </div>
                    <div className="lv-reg__ref">Reference number: <strong>{r.regNum || r.id}</strong></div>
                    {rawStatus === "rejected" && r.rejectReason && (
                      <div className="lv-reg__alert">Reason: {r.rejectReason}</div>
                    )}
                    {rawStatus === "pending" && (
                      <div className="lv-reg__wait"><Ico size={20}>{ICONS.clock}</Ico> Waiting for the admin to review it.</div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          <BackButton label="Back to programs" onClick={() => setView("main")} />
        </section>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════
  // VIEW: REGISTER FORM
  // ════════════════════════════════════════════════════════════════
  const programTimeLabel = [formatTime(selectedProgram?.startTime), formatTime(selectedProgram?.endTime)].filter(Boolean).join(" – ");

  return (
    <div className="bz-page">
      <Hero />

      <div className="bz-wrap" ref={topRef}>
        {step < 4 && (
          <section className="bz-card">
            <BackButton label="Back to programs" onClick={() => { setView("main"); setErrors({}); }} />

            {/* Steps */}
            <ol className="lv-steps" aria-label="Registration steps">
              {STEP_LABELS.map((label, i) => {
                const n = i + 1;
                const done = n < step;
                const active = n === step;
                return (
                  <li key={label} className={`lv-steps__item${done ? " is-done" : active ? " is-active" : ""}`} aria-current={active ? "step" : undefined}>
                    <span className="lv-steps__dot">
                      {done
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        : n}
                    </span>
                    <span className="lv-steps__label">{label}</span>
                  </li>
                );
              })}
            </ol>

            {/* Which program */}
            {selectedProgram && step !== 2 && (
              <div className="lv-chosen">
                <div className="lv-chosen__label">You are registering for</div>
                <div className="lv-chosen__title">{selectedProgram.title}</div>
                <ul className="lv-meta lv-meta--inline">
                  {selectedProgram.date && <li><Ico size={20}>{ICONS.calendar}</Ico><span>{formatDate(selectedProgram.date)}</span></li>}
                  {programTimeLabel && <li><Ico size={20}>{ICONS.clock}</Ico><span>{programTimeLabel}</span></li>}
                  {selectedProgram.location && <li><Ico size={20}>{ICONS.pin}</Ico><span>{selectedProgram.location}</span></li>}
                </ul>
              </div>
            )}

            {/* ── Step 1 ── */}
            {step === 1 && (
              <div className="bf-form lv-form">
                <h3 className="bz-heading">Your information</h3>

                <div className="bf-field">
                  <label className="bf-label" htmlFor="lv-first">First name <span className="bf-pill bf-pill--req">Required</span></label>
                  <input id="lv-first" className={`bf-input${errors.firstName ? " bf-input--error" : ""}`} value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Juan" />
                  {errors.firstName && <div className="bf-error">{errors.firstName}</div>}
                </div>
                <div className="bf-field">
                  <label className="bf-label" htmlFor="lv-middle">Middle name <span className="bf-pill">Optional</span></label>
                  <input id="lv-middle" className="bf-input" value={form.middleName} onChange={e => set("middleName", e.target.value)} placeholder="Santos" />
                </div>
                <div className="bf-field">
                  <label className="bf-label" htmlFor="lv-last">Last name <span className="bf-pill bf-pill--req">Required</span></label>
                  <input id="lv-last" className={`bf-input${errors.lastName ? " bf-input--error" : ""}`} value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Dela Cruz" />
                  {errors.lastName && <div className="bf-error">{errors.lastName}</div>}
                </div>
                <div className="bf-field">
                  <label className="bf-label" htmlFor="lv-address">Home address <span className="bf-pill bf-pill--req">Required</span></label>
                  <input id="lv-address" className={`bf-input${errors.address ? " bf-input--error" : ""}`} value={form.address} onChange={e => set("address", e.target.value)} placeholder="House No., Street, Barangay Malanday" />
                  {errors.address && <div className="bf-error">{errors.address}</div>}
                </div>
                <div className="bf-row">
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="lv-contact">Phone number <span className="bf-pill bf-pill--req">Required</span></label>
                    <input id="lv-contact" className={`bf-input${errors.contact ? " bf-input--error" : ""}`} value={form.contact} onChange={e => set("contact", e.target.value)} placeholder="0912 345 6789" />
                    {errors.contact && <div className="bf-error">{errors.contact}</div>}
                  </div>
                  <div className="bf-field">
                    <label className="bf-label" htmlFor="lv-email">Email <span className="bf-pill">Optional</span></label>
                    <input id="lv-email" className="bf-input" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="juan@email.com" />
                  </div>
                </div>

                <div className="bf-field">
                  <div className="bf-label">Valid ID or Barangay Clearance <span className="bf-pill bf-pill--req">Required</span></div>
                  <label className={`bf-photo${form.idFile ? " is-filled" : ""}${errors.idFile ? " is-error" : ""}`}>
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }} onChange={e => e.target.files[0] && set("idFile", e.target.files[0].name)} />
                    <Ico size={28}>{form.idFile ? ICONS.check : ICONS.upload}</Ico>
                    <span className="bf-photo__text">
                      {form.idFile ? (
                        <>
                          <strong>ID added</strong>
                          <small>{form.idFile} · Tap to change</small>
                        </>
                      ) : (
                        <>
                          <strong>Tap here to add your ID</strong>
                          <small>A photo or scan. JPG, PNG or PDF, up to 5MB</small>
                        </>
                      )}
                    </span>
                  </label>
                  {errors.idFile && <div className="bf-error">{errors.idFile}</div>}
                </div>
              </div>
            )}

            {/* ── Step 2 ── */}
            {step === 2 && (
              <div className="lv-form">
                <h3 className="bz-heading">Choose a program</h3>
                <p className="bz-text">Tap the program you want to join.</p>

                {loadingPrograms ? (
                  <div className="lv-empty">Loading programs…</div>
                ) : (
                  <div className="lv-picks" role="radiogroup" aria-label="Programs">
                    {programs.map(p => {
                      const slotsLeft = getSlotsLeft(p);
                      const full = slotsLeft !== null && slotsLeft <= 0;
                      const selected = form.programId === p.id;
                      const timeLabel = [formatTime(p.startTime), formatTime(p.endTime)].filter(Boolean).join(" – ");
                      const activeReg = userActiveRegForProgram(p.id);
                      const disabled = full || !!activeReg;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          className={`lv-pick${selected ? " is-active" : ""}`}
                          disabled={disabled}
                          onClick={() => !disabled && set("programId", p.id)}
                        >
                          <span className="lv-pick__check">
                            {selected && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                          <span className="lv-pick__body">
                            <span className="lv-pick__name">
                              {p.title}
                              {full && <span className="lv-pick__badge lv-pick__badge--full">Full</span>}
                              {activeReg && !full && <span className="lv-pick__badge">Already registered</span>}
                            </span>
                            {(p.date || timeLabel) && <span className="lv-pick__meta">{formatDate(p.date)}{timeLabel ? ` · ${timeLabel}` : ""}</span>}
                            {p.location && <span className="lv-pick__meta">{p.location}</span>}
                          </span>
                          {slotsLeft !== null && (
                            <span className={`lv-pick__slots${full ? " is-full" : slotsLeft <= 5 ? " is-low" : ""}`}>
                              {full ? "Full" : `${slotsLeft} left`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.programId && <div className="bf-error">{errors.programId}</div>}
              </div>
            )}

            {/* ── Step 3 ── */}
            {step === 3 && (
              <div className="lv-form">
                <h3 className="bz-heading">Check your information</h3>
                <p className="bz-text">Please check that everything is correct, then tap the green button to send.</p>

                <dl className="lv-review">
                  {[
                    { label: "Full name", value: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ") },
                    { label: "Address", value: form.address },
                    { label: "Phone number", value: form.contact },
                    { label: "Email", value: form.email || "—" },
                    { label: "ID added", value: form.idFile || "—" },
                    { label: "Program", value: selectedProgram?.title || "—" },
                    { label: "Date", value: formatDate(selectedProgram?.date) },
                    { label: "Time", value: programTimeLabel || "—" },
                    { label: "Place", value: selectedProgram?.location || "—" },
                  ].map((r) => (
                    <div key={r.label} className="lv-review__row">
                      <dt>{r.label}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>

                {errors.submit && <div className="bf-alert" style={{ marginTop: "0.9rem" }}>{errors.submit}</div>}
              </div>
            )}

            {/* Actions */}
            <div className="lv-actions">
              <button type="button" className="bf-submit lv-actions__next" onClick={handleNext} disabled={submitting}>
                {submitting ? "Sending, please wait..." : step === 3 ? "Send My Registration" : "Next"}
                {!submitting && step < 3 && <ArrowRight />}
              </button>
              {step > 1 && (
                <button type="button" className="bf-secondary lv-actions__prev" onClick={() => { setStep(s => s - 1); setErrors({}); }} disabled={submitting}>
                  <ArrowLeft /> Previous step
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Step 4: Success ── */}
        {step === 4 && (
          <section className="bz-card">
            <div className="bf-done">
              <span className="bf-done__icon"><BigCheck /></span>
              <h3 className="bz-heading">Registration sent. Thank you!</h3>
              <p className="bz-text">You registered for <strong>{selectedProgram?.title}</strong>. Please wait for the admin to review it.</p>

              <div className="bt-ref">
                <div className="bt-ref__label">Your registration number</div>
                <div className="bt-ref__num">{regNum}</div>
                <div className="bt-ref__hint">Write this number down. You can use it to follow your registration.</div>
              </div>

              <div className="bf-done__btns">
                <button type="button" className="bf-secondary" onClick={() => setView("myregs")}>View my registrations</button>
                <button type="button" className="bf-secondary" onClick={resetForm}>Done</button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}