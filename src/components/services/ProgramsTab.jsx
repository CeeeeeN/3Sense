import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, runTransaction } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { createNotification } from "../../services/notifications"; // 🆕
import { ChevronRightIcon } from "../Icons";

const getSaved = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback; }
  catch { return fallback; }
};

const COLOR_MAP = {
  teal:   { bar: "#317D89", badge: "rgba(49,125,137,0.10)",  text: "#317D89" },
  amber:  { bar: "#BDBD64", badge: "rgba(189,189,100,0.15)", text: "#7a7200" },
  green:  { bar: "#2DB17B", badge: "rgba(45,177,123,0.10)",  text: "#1e8a5e" },
  purple: { bar: "#703381", badge: "rgba(112,51,129,0.10)",  text: "#703381" },
};

function ProgramModal({ program, onClose, onRegister, isRegistering }) {
  const c = COLOR_MAP[program.color] || COLOR_MAP.teal;
  const slotsLeft = parseInt(program.slots || "0", 10);
  const isFull = slotsLeft <= 0;

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget && !isRegistering) onClose(); }}>
      <div className="pm-modal" role="dialog" aria-modal="true" style={{ display: "flex", flexDirection: "column" }}>
        <div className="pm-modal__bar" style={{ background: c.bar }} />
        <button className="pm-close" onClick={onClose} disabled={isRegistering} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className="pm-scroll" style={{ flex: 1 }}>
          <div className="pm-header">
            <div className="pm-header__tags">
              <span className="pm-badge" style={{ background: c.badge, color: c.text }}>{program.tag}</span>
              <span className={`sv-program-card__status sv-program-card__status--${program.status === "Open" ? "open" : "ongoing"}`}>{program.status}</span>
            </div>
            <h2 className="pm-title">{program.title || program.description}</h2>
            <p className="pm-fulldesc">{program.fullDesc || program.description}</p>
          </div>
          <div className="pm-details-grid">
            {[
              { icon: "calendar", label: "Date",             value: program.date },
              { icon: "clock",    label: "Time",             value: program.time },
              { icon: "pin",      label: "Location",         value: program.location },
              { icon: "users",    label: "For",              value: program.demographic },
              ...(program.slots !== undefined ? [{ icon: "slots", label: "Available Slots", value: `${program.slots} slots` }] : []),
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
          {program.requirements && program.requirements.length > 0 && (
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
          )}
        </div>
        <div style={{ padding: "20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: "12px", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px" }}>
          <button className="sv-btn-ghost" onClick={onClose} disabled={isRegistering}>Cancel</button>
          <button className="sv-btn-primary" style={{ background: isFull ? "#9ca3af" : c.text, opacity: isFull ? 0.7 : 1 }} disabled={isFull || isRegistering} onClick={onRegister}>
            {isRegistering ? "Registering..." : isFull ? "Program Full" : "Register Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProgramsTab({ userData }) {
  const [activeProgram, setActiveProgram] = useState(null);
  const [programs, setPrograms]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Programs"), (snapshot) => {
      setPrograms(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleRegister = async (programId) => {
    const activeUserId   = getSaved("userID", null);
    const activeUserName = getSaved("userName", "Resident");

    if (!activeUserId) return alert("Session expired or profile not selected. Please log in again.");
    setIsRegistering(true);

    try {
      const programRef  = doc(db, "Programs", programId);
      const attendeeRef = doc(db, "Programs", programId, "attendees", activeUserId);

      await runTransaction(db, async (transaction) => {
        const progDoc = await transaction.get(programRef);
        if (!progDoc.exists()) throw new Error("Program does not exist!");

        const data = progDoc.data();
        const currentSlots = parseInt(data.slots, 10);
        if (!data.slots) throw new Error("This program does not have a slot limit configured.");
        if (currentSlots <= 0) throw new Error("Sorry, this program is fully booked!");

        const checkAttendee = await transaction.get(attendeeRef);
        if (checkAttendee.exists()) throw new Error("You are already registered for this program!");

        transaction.set(attendeeRef, {
          userID:      activeUserId,
          userName:    activeUserName,
          programId:   programId,
          programName: data.description || data.title || "Program",
          programDate: data.date,
          status:      "Registered",
          createdAt:   new Date()
        });

        transaction.update(programRef, { slots: (currentSlots - 1).toString() });
      });

      // 🆕 Notify admins about new program registration
      const programTitle = activeProgram?.description || activeProgram?.title || "a program";
      await createNotification(
        "feedback",
        `${activeUserName} registered for the program "${programTitle}".`,
        activeUserName,
        ""
      );

      alert("Successfully registered for the program!");
      setActiveProgram(null);
    } catch (error) {
      console.error("Registration failed:", error);
      alert(error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Loading programs...</div>;
  if (programs.length === 0) return <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>No programs available at the moment.</div>;

  return (
    <>
      <div className="sv-programs-grid">
        {programs.map(p => (
          <div key={p.id} className="sv-program-card sv-program-card--teal">
            <div className="sv-program-card__bar" />
            <div className="sv-program-card__head">
              <span className="sv-program-card__tag">{p.demographic || "General"}</span>
              <span className={`sv-program-card__status sv-program-card__status--${p.status === "Open" ? "open" : "ongoing"}`}>{p.status || "Upcoming"}</span>
            </div>
            <div className="sv-program-card__title">{p.description || p.title}</div>
            <div className="sv-program-card__desc">{p.fullDescription || p.description}</div>
            <button className="sv-program-card__cta" onClick={() => setActiveProgram(p)}>Learn More <ChevronRightIcon /></button>
          </div>
        ))}
      </div>
      {activeProgram && (
        <ProgramModal
          program={{
            ...activeProgram,
            color: "teal",
            tag:      activeProgram.demographic || "General",
            title:    activeProgram.description || activeProgram.title,
            fullDesc: activeProgram.fullDescription || activeProgram.description,
            time:     activeProgram.time || `${activeProgram.startTime} - ${activeProgram.endTime}`,
            requirements: activeProgram.requirements || [],
          }}
          onClose={() => setActiveProgram(null)}
          onRegister={() => handleRegister(activeProgram.id)}
          isRegistering={isRegistering}
        />
      )}
    </>
  );
}