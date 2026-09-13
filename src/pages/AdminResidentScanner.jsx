import { useState, useEffect, useRef, useCallback } from "react";
import AdminLayout from "../components/AdminLayout";
import "../AdminStyle.css";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  or,
  FieldPath,
} from "firebase/firestore";

const loadJsQR = () =>
  new Promise((resolve, reject) => {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error("Failed to load jsQR library."));
    document.head.appendChild(s);
  });

const fmtDate = (ts) => {
  if (!ts) return "-";
  try {
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
  } catch { return "-"; }
};

const statusColors = (status = "") => {
  const s = status.toLowerCase();
  if (["approved", "claimed", "returned", "completed", "clear case"].some(k => s.includes(k)))
    return { bg: "#dcfce7", color: "#166534" };
  if (["pending", "received", "submitted", "registered"].some(k => s.includes(k)))
    return { bg: "#fef9c3", color: "#854d0e" };
  if (["rejected", "violation", "overdue", "unreturned"].some(k => s.includes(k)))
    return { bg: "#fee2e2", color: "#991b1b" };
  if (s.includes("pending case"))
    return { bg: "#fef3c7", color: "#92400e" };
  return { bg: "#e5e7eb", color: "#374151" };
};

const StatusBadge = ({ status }) => {
  const { bg, color } = statusColors(status);
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "12px", fontSize: "0.78rem",
      fontWeight: 600, display: "inline-block", background: bg, color,
      whiteSpace: "nowrap",
    }}>
      {status || "-"}
    </span>
  );
};

const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const IconQR = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" />
  </svg>
);
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const IconCheck = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconMonitor = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

function DesktopBlock() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "55vh", padding: "3rem 2rem", textAlign: "center",
    }}>
      <div style={{ color: "#94a3b8", marginBottom: "1.25rem" }}><IconMonitor /></div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.75rem" }}>
        Mobile &amp; Tablet Only
      </h2>
      <p style={{ color: "#64748b", maxWidth: "380px", lineHeight: 1.7, fontSize: "0.92rem", margin: 0 }}>
        The Resident QR Scanner requires camera access and is only available on mobile and tablet devices.
        Please open this page on your phone or tablet.
      </p>
      <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "6px", color: "#94a3b8", fontSize: "0.8rem" }}>
        <IconShield /> Admin-only feature • Camera required
      </div>
    </div>
  );
}

function InfoRow({ label, value, full }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : undefined }}>
      <p style={{ margin: 0, fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
        {label}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: "0.87rem", color: "#1e293b", fontWeight: 500, wordBreak: "break-word" }}>
        {value || "-"}
      </p>
    </div>
  );
}

function RecordList({ items, showCategory }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {items.map((item, i) => (
        <div key={item.id || i} style={{
          background: "#f8fafc", borderRadius: "10px", padding: "10px 14px",
          border: "1px solid #e2e8f0",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.87rem", color: "#1e293b", wordBreak: "break-word" }}>
                {item.name}
              </p>
              <p style={{ margin: "3px 0 0", fontSize: "0.76rem", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                {showCategory && item.category && (
                  <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: "10px", padding: "1px 8px", fontWeight: 600, fontSize: "0.72rem" }}>
                    {item.category}
                  </span>
                )}
                {item.type && !showCategory && (
                  <span style={{ color: "#94a3b8" }}>{item.type}</span>
                )}
                <span>{fmtDate(item.date)}</span>
                {item.refNum && <span style={{ color: "#94a3b8" }}>• {item.refNum}</span>}
              </p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#64748b" }}>
      <div className="scan-spinner" style={{ margin: "0 auto 12px" }} />
      <p style={{ margin: 0, fontSize: "0.88rem" }}>Loading records...</p>
    </div>
  );
}
function EmptyState({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
      <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.88rem" }}>{label}</p>
    </div>
  );
}
function ErrorState({ msg }) {
  return (
    <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
      <p style={{ margin: 0, color: "#ef4444", fontSize: "0.88rem" }}>{msg}</p>
    </div>
  );
}

function ResidentModal({ profile, onClose, onScanAnother }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [records, setRecords] = useState({ programs: [], services: [], transactions: [] });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const TABS = [
    { id: "basic", label: "Basic Info" },
    { id: "programs", label: "Programs" },
    { id: "services", label: "Services" },
    { id: "transactions", label: "Transactions" },
  ];

  useEffect(() => {
    if (!profile) return;
    const { residentID, UID, userID } = profile;

    const fetchAll = async () => {
      setLoading(true);
      setFetchError("");
      try {
        const conditions = [];
        if (UID) conditions.push(where("UID", "==", UID));
        if (residentID) conditions.push(where("residentID", "==", residentID));
        if (userID) conditions.push(where("userID", "==", userID));

        const buildQuery = (col, dateField) => {
          if (conditions.length === 0) return null;
          const idQuery = conditions.length === 1 ? conditions[0] : or(...conditions);
          try {
            return query(collection(db, col), idQuery, orderBy(dateField, "desc"), limit(50));
          } catch {
            return query(collection(db, col), idQuery, limit(50));
          }
        };

        const runQuery = async (col, dateField, mapper) => {
          const q = buildQuery(col, dateField);
          if (!q) return [];
          try {
            const snap = await getDocs(q);
            return snap.docs.map(mapper);
          } catch {
            try {
              const idQuery = conditions.length === 1 ? conditions[0] : or(...conditions);
              const q2 = query(collection(db, col), idQuery, limit(50));
              const snap2 = await getDocs(q2);
              const docs = snap2.docs.map(mapper);
              docs.sort((a, b) => {
                const ta = a._ts?.toDate ? a._ts.toDate() : new Date(a._ts || 0);
                const tb = b._ts?.toDate ? b._ts.toDate() : new Date(b._ts || 0);
                return tb - ta;
              });
              return docs;
            } catch { return []; }
          }
        };

        const [lhDocs, docReqs, facReqs, eqReqs, incReqs, bswdReqs] = await Promise.all([
          runQuery("livelihoodRegistrations", "submittedAt", d => ({
            id: d.id, _ts: d.data().submittedAt,
            type: "Livelihood Program",
            name: d.data().programName || "Livelihood Program",
            date: d.data().submittedAt,
            status: d.data().status || "Pending",
            refNum: d.data().regNum || "",
          })),
          runQuery("document_requests", "submittedAt", d => ({
            id: d.id, _ts: d.data().submittedAt,
            type: "Document Request",
            name: d.data().documentType || "Document Request",
            date: d.data().submittedAt,
            status: d.data().status || "Pending",
            refNum: d.data().requestID || "",
          })),
          runQuery("facility_reservations", "submittedAt", d => ({
            id: d.id, _ts: d.data().submittedAt,
            type: "Facility Reservation",
            name: d.data().facilityName || "Facility",
            date: d.data().submittedAt,
            status: d.data().status || "Pending",
            refNum: d.data().reservationID || "",
          })),
          runQuery("equipment_rentals", "submittedAt", d => {
            const raw = d.data();
            let st = raw.status || "Pending";
            if (st === "Claimed" && raw.returnDate) {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              if (new Date(raw.returnDate + "T00:00:00") < today) st = "Overdue";
            }
            return {
              id: d.id, _ts: raw.submittedAt,
              type: "Equipment Rental",
              name: raw.equipmentName || "Equipment",
              date: raw.submittedAt,
              status: st,
              refNum: raw.rentalID || "",
            };
          }),
          runQuery("incidentReports", "submittedAt", d => ({
            id: d.id, _ts: d.data().submittedAt,
            type: "Incident Report",
            name: d.data().incidentType || "Incident Report",
            date: d.data().submittedAt,
            status: d.data().status || "Submitted",
            refNum: d.data().refNum || "",
          })),
          runQuery("bswdReports", "submittedAt", d => ({
            id: d.id, _ts: d.data().submittedAt,
            type: "BSWD Report",
            name: d.data().type === "tip" ? "Anonymous Tip" : "BSWD Report",
            date: d.data().submittedAt,
            status: d.data().status || "Submitted",
            refNum: d.data().refNum || "",
          })),
        ]);

        let attendees = [];
        if (residentID) {
          try {
            const attSnap = await getDocs(query(
              collectionGroup(db, "attendees"),
              where("residentID", "==", residentID),
              limit(50)
            ));
            attendees = attSnap.docs.map(d => ({
              id: d.id, _ts: d.data().registeredAt || d.data().createdAt,
              type: "Program",
              name: d.data().programName || d.data().eventName || "Barangay Program",
              date: d.data().registeredAt || d.data().createdAt,
              status: d.data().status || "Registered",
              refNum: d.data().refNum || "",
            }));
          } catch { }
        }

        const sortByDate = arr => [...arr].sort((a, b) => {
          const ta = a._ts?.toDate ? a._ts.toDate() : new Date(a._ts || 0);
          const tb = b._ts?.toDate ? b._ts.toDate() : new Date(b._ts || 0);
          return tb - ta;
        });

        const services = [...docReqs, ...facReqs, ...eqReqs, ...incReqs, ...bswdReqs];
        const transactions = [
          ...docReqs.map(r => ({ ...r, category: "Document" })),
          ...facReqs.map(r => ({ ...r, category: "Facility" })),
          ...eqReqs.map(r => ({ ...r, category: "Equipment" })),
          ...incReqs.map(r => ({ ...r, category: "Peace & Order" })),
          ...bswdReqs.map(r => ({ ...r, category: "BSWD" })),
          ...lhDocs.map(r => ({ ...r, category: "Livelihood" })),
        ];

        setRecords({
          programs: sortByDate([...lhDocs, ...attendees]),
          services: sortByDate(services),
          transactions: sortByDate(transactions),
        });
      } catch (err) {
        console.error("[ResidentModal]", err);
        setFetchError("Failed to load records. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [profile]);

  const fullName = [profile.firstName, profile.middleName, profile.lastName, profile.suffix]
    .filter(Boolean).join(" ") || "Resident";
  const address = [profile.houseNumber, profile.street, profile.barangay, profile.city]
    .filter(Boolean).join(", ") || "-";

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1100,
        background: "rgba(15,23,42,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "20px 20px 0 0",
        width: "100%", maxWidth: "640px", maxHeight: "92dvh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 -8px 48px rgba(0,0,0,0.25)",
      }}>
        <div style={{
          padding: "1.1rem 1.2rem 0.8rem",
          borderBottom: "1px solid #e2e8f0",
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: "12px", flexShrink: 0,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
              {fullName}
            </h2>
            <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>{profile.householdID}</span>
              <StatusBadge status={profile.adminStatus || "Clear Case"} />
            </div>
          </div>
          <button id="ars-modal-close" onClick={onClose} style={{
            border: "none", background: "#f1f5f9", borderRadius: "50%",
            width: "32px", height: "32px", cursor: "pointer", color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <IconX />
          </button>
        </div>

        <div style={{
          display: "flex", borderBottom: "1px solid #e2e8f0",
          overflowX: "auto", flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "0.6rem 1rem", border: "none", background: "none",
              cursor: "pointer", whiteSpace: "nowrap", fontSize: "0.82rem",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? "#0d7a55" : "#64748b",
              borderBottom: activeTab === t.id ? "2.5px solid #0d7a55" : "2.5px solid transparent",
            }}>
              {t.label}
              {t.id !== "basic" && !loading && (
                <span style={{
                  marginLeft: "5px", fontSize: "0.7rem", fontWeight: 600,
                  background: "#e2e8f0", borderRadius: "10px", padding: "1px 6px",
                  color: "#64748b",
                }}>
                  {t.id === "programs" ? records.programs.length
                    : t.id === "services" ? records.services.length
                    : records.transactions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.2rem 1.5rem" }}>
          {activeTab === "basic" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              <InfoRow label="Household No." value={profile.householdID} full />
              <InfoRow label="Resident ID" value={profile.residentID} full />
              <InfoRow label="Barangay UID" value={profile.UID || "-"} full />
              <InfoRow label="Role" value={profile.role} />
              <InfoRow label="Sex" value={profile.sex} />
              <InfoRow label="Birth Date" value={profile.birthDate} />
              <InfoRow label="Age" value={profile.age ? `${profile.age} yrs` : "-"} />
              <InfoRow label="Civil Status" value={profile.civilStatus} />
              <InfoRow label="Religion" value={profile.religion} />
              <InfoRow label="Citizenship" value={profile.citizenship} />
              <InfoRow label="Contact" value={profile.contactNumber} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Address" value={address} full />
              <InfoRow
                label="Categories"
                value={Array.isArray(profile.categories) && profile.categories.length
                  ? profile.categories.join(", ") : "None"}
                full
              />
              {profile.pwdStatus && <InfoRow label="PWD Status" value={profile.pwdStatus} />}
              {profile.disabilityType && <InfoRow label="Disability" value={profile.disabilityType} />}
              <InfoRow label="Education" value={profile.educationAttainment} />
              <InfoRow label="Ed. Status" value={profile.educationStatus} />
              <InfoRow label="Employment" value={profile.employmentStatus} />
              <InfoRow label="Occupation" value={profile.occupation} />
              {(profile.adminRemarks || profile.adminIncident) && (
                <div style={{
                  gridColumn: "1 / -1", background: "#fef2f2",
                  border: "1px solid #fca5a5", borderLeft: "3px solid #ef4444",
                  borderRadius: "8px", padding: "10px 14px", marginTop: "4px",
                }}>
                  {profile.adminRemarks && (
                    <p style={{ margin: "0 0 4px", fontSize: "0.83rem", color: "#991b1b" }}>
                      <strong>Remarks:</strong> {profile.adminRemarks}
                    </p>
                  )}
                  {profile.adminIncident && (
                    <p style={{ margin: 0, fontSize: "0.83rem", color: "#991b1b" }}>
                      <strong>Incident:</strong> {profile.adminIncident}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "programs" && (
            loading ? <LoadingState /> :
            fetchError ? <ErrorState msg={fetchError} /> :
            records.programs.length === 0
              ? <EmptyState label="No program history found for this resident." />
              : <RecordList items={records.programs} />
          )}

          {activeTab === "services" && (
            loading ? <LoadingState /> :
            fetchError ? <ErrorState msg={fetchError} /> :
            records.services.length === 0
              ? <EmptyState label="No service history found for this resident." />
              : <RecordList items={records.services} />
          )}

          {activeTab === "transactions" && (
            loading ? <LoadingState /> :
            fetchError ? <ErrorState msg={fetchError} /> :
            records.transactions.length === 0
              ? <EmptyState label="No transaction history found for this resident." />
              : <RecordList items={records.transactions} showCategory />
          )}
        </div>

        <div style={{
          padding: "0.8rem 1.2rem", borderTop: "1px solid #e2e8f0",
          display: "flex", justifyContent: "flex-end", gap: "8px",
          background: "#f8fafc", flexShrink: 0,
        }}>
          <button id="ars-scan-another-btn" onClick={onScanAnother} style={{
            padding: "0.5rem 1rem", borderRadius: "8px",
            border: "1.5px solid #0d7a55", background: "transparent",
            color: "#0d7a55", fontWeight: 600, cursor: "pointer", fontSize: "0.86rem",
            display: "flex", alignItems: "center", gap: "5px",
          }}>
            <IconRefresh /> Scan Another
          </button>
          <button id="ars-done-btn" onClick={onClose} style={{
            padding: "0.5rem 1.2rem", borderRadius: "8px",
            border: "none", background: "#0d7a55",
            color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.86rem",
          }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ResidentScanner() {
  const [camState, setCamState] = useState("idle");
  const [camError, setCamError] = useState("");
  const [flash, setFlash] = useState(false);
  const [scanError, setScanError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [residentProfile, setResidentProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const jsQRRef = useRef(null);
  const scanning = useRef(false);

  const stopCamera = useCallback(() => {
    scanning.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const startCamera = async () => {
    setScanError("");
    setCamState("requesting");
    setCamError("");
    try {
      if (!jsQRRef.current) jsQRRef.current = await loadJsQR();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState("active");
      scanning.current = true;
      tick();
    } catch (err) {
      setCamError(
        err.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions and try again."
          : `Camera unavailable: ${err.message}`
      );
      setCamState("error");
    }
  };

  const tick = () => {
    if (!scanning.current) return;
    rafRef.current = requestAnimationFrame(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2) { tick(); return; }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQRRef.current?.(imgData.data, imgData.width, imgData.height, {
        inversionAttempts: "dontInvert",
      });
      if (code?.data) {
        onQRDetected(code.data);
      } else {
        tick();
      }
    });
  };

  const onQRDetected = async (rawData) => {
    scanning.current = false;

    const memberID = rawData.trim();

    if (!memberID || memberID.startsWith("{") || memberID.startsWith("http")) {
      setScanError("Unrecognized QR format. Please scan a valid Resident Profile QR.");
      scanning.current = true;
      tick();
      return;
    }

    setFlash(true);
    setTimeout(() => setFlash(false), 650);
    setFetching(true);
    setScanError("");
    stopCamera();
    setCamState("idle");

    try {
      const snap = await getDocs(query(
        collectionGroup(db, "residents"),
        where(FieldPath.documentId(), "==", memberID),
        limit(1)
      ));

      if (snap.empty) {
        setScanError("Resident not found. The QR may be outdated or the account may have been removed.");
        setFetching(false);
        return;
      }

      const resDoc = snap.docs[0];
      const householdID = resDoc.ref.parent.parent?.id;
      if (!householdID) {
        setScanError("Could not resolve the resident's household. Please try again.");
        setFetching(false);
        return;
      }

      const d = resDoc.data();
      setResidentProfile({
        residentID: memberID,
        householdID,
        UID: d.UID || "",
        userID: d.userID || "",
        role: d.role || "Member",
        firstName: d.firstName || "",
        middleName: d.middleName || "",
        lastName: d.lastName || "",
        suffix: d.suffix || "",
        sex: d.sex || "",
        birthDate: d.birthDate || "",
        age: d.age ?? null,
        birthPlace: d.birthPlace || "",
        civilStatus: d.civilStatus || "",
        religion: d.religion || "",
        citizenship: d.citizenship || "",
        contactNumber: d.contactNumber || "",
        email: d.email || "",
        houseNumber: d.houseNumber || "",
        street: d.street || "",
        barangay: d.barangay || "",
        city: d.city || "",
        province: d.province || "",
        region: d.region || "",
        categories: Array.isArray(d.categories) ? d.categories : [],
        pwdStatus: d.pwdStatus || "",
        disabilityType: d.disabilityType || "",
        educationAttainment: d.educationAttainment || "",
        educationStatus: d.educationStatus || "",
        occupation: d.occupation || "",
        employmentStatus: d.employmentStatus || "",
        adminStatus: d.adminStatus || "Clear Case",
        adminRemarks: d.adminRemarks || "",
        adminIncident: d.adminIncident || "",
      });
      setShowModal(true);
    } catch (err) {
      console.error("[AdminResidentScanner]", err);
      setScanError("Failed to retrieve resident record. Check your connection and try again.");
    } finally {
      setFetching(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setResidentProfile(null);
    setScanError("");
  };

  const handleScanAnother = () => {
    setShowModal(false);
    setResidentProfile(null);
    setScanError("");
    startCamera();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100dvh - 120px)" }}>
      <div style={{ position: "relative", minHeight: "390px", height: "52dvh", overflow: "hidden", flexShrink: 0, background: "#0f172a" }}>
        <video ref={videoRef} className="scan-viewfinder" playsInline muted autoPlay
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className={`scan-overlay${flash ? " scan-overlay--flash" : ""}`}
          style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>

          <div className="scan-overlay__band">
            <div className="scan-topbar">
              <span className="scan-topbar__eyebrow" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <IconQR /> Resident Profile Scanner
              </span>
              {camState === "active" && (
                <span className="scan-live-badge">
                  <span className="scan-live-dot" /> LIVE
                </span>
              )}
            </div>
          </div>

          <div className="scan-overlay__row" style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div className="scan-overlay__side" />
            <div className={`scan-finder${flash ? " scan-finder--hit" : ""}`} style={{ width: "min(52vw, 210px)", height: "min(52vw, 210px)" }}>
              <span className="scan-corner scan-corner--tl" />
              <span className="scan-corner scan-corner--tr" />
              <span className="scan-corner scan-corner--bl" />
              <span className="scan-corner scan-corner--br" />
              {camState === "active" && !flash && <span className="scan-line" />}
              {flash && <div className="scan-found-overlay"><IconCheck /></div>}
            </div>
            <div className="scan-overlay__side" />
          </div>

          <div className="scan-overlay__bottom" style={{ padding: "0.75rem 1.25rem 1.5rem", gap: "0.6rem" }}>
            {camState === "idle" && !fetching && (
              <>
                <p className="scan-overlay__hint">Tap below to open your camera</p>
                <button id="ars-open-camera-btn" className="scan-start-btn" onClick={startCamera} style={{ marginBottom: "4px" }}>
                  <IconCamera /> Open Camera
                </button>
              </>
            )}
            {camState === "requesting" && (
              <>
                <span className="scan-spinner" />
                <p className="scan-overlay__hint">Requesting camera access...</p>
              </>
            )}
            {camState === "active" && (
              <p className="scan-overlay__hint scan-overlay__hint--active">
                Align the Resident Profile QR within the frame
              </p>
            )}
            {camState === "error" && (
              <div className="scan-error-block">
                <p className="scan-error-msg">{camError}</p>
                <button id="ars-retry-camera-btn" className="scan-retry-btn" onClick={startCamera}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {fetching && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(15,23,42,0.78)",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "12px",
          }}>
            <span className="scan-spinner" style={{ borderTopColor: "#0d7a55" }} />
            <p style={{ color: "#e2e8f0", fontSize: "0.88rem", margin: 0 }}>Looking up resident...</p>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: "1.1rem 1.2rem", background: "#f8fafc" }}>
        {scanError && (
          <div id="ars-scan-error" style={{
            background: "#fef2f2", border: "1px solid #fca5a5",
            borderLeft: "3px solid #ef4444", borderRadius: "10px",
            padding: "12px 14px", marginBottom: "1rem",
            display: "flex", alignItems: "flex-start", gap: "10px",
          }}>
            <span style={{ color: "#ef4444", fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>!</span>
            <div>
              <p style={{ margin: 0, color: "#991b1b", fontWeight: 600, fontSize: "0.86rem" }}>Scan Error</p>
              <p style={{ margin: "3px 0 0", color: "#991b1b", fontSize: "0.82rem" }}>{scanError}</p>
              <button
                id="ars-retry-scan-btn"
                onClick={() => { setScanError(""); if (camState === "idle") startCamera(); }}
                style={{ marginTop: "6px", border: "none", background: "none", color: "#0d7a55", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem", padding: 0 }}
              >
                Try again &rarr;
              </button>
            </div>
          </div>
        )}

        <div style={{
          background: "#fff", borderRadius: "12px",
          padding: "1rem 1.1rem", border: "1px solid #e2e8f0",
        }}>
          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "0.88rem", color: "#1e293b" }}>
            How to use
          </p>
          <ol style={{ margin: 0, paddingLeft: "1.2rem", color: "#64748b", fontSize: "0.82rem", lineHeight: 1.75 }}>
            <li>Tap <strong>Open Camera</strong> above.</li>
            <li>Ask the resident to open their Profile QR in the 3S+ app.</li>
            <li>Align the QR within the frame - it scans automatically.</li>
            <li>The resident&apos;s full records will appear in a modal.</li>
          </ol>
        </div>
      </div>

      {showModal && residentProfile && (
        <ResidentModal
          profile={residentProfile}
          onClose={handleCloseModal}
          onScanAnother={handleScanAnother}
        />
      )}
    </div>
  );
}

export default function AdminResidentScanner() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsAdmin(false); setAuthChecked(true); return; }
      try {
        const snap = await getDocs(query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid),
          limit(1)
        ));
        setIsAdmin(!snap.empty);
      } catch {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  if (!authChecked) {
    return (
      <AdminLayout>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
          <span className="scan-spinner" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div style={{ textAlign: "center", padding: "4rem 1.5rem" }}>
          <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b" }}>Access Denied</p>
          <p style={{ color: "#64748b" }}>You are not authorized to access this feature.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="requests-container" style={{ padding: 0, overflow: "hidden" }}>
        <div className="requests-header" style={{ padding: "1.25rem 1.5rem 1rem" }}>
          <h1 className="requests-title">Resident QR Scanner</h1>
          <p className="requests-subtitle">
            Scan a resident&apos;s Profile QR to quickly view their records.
          </p>
        </div>
        {isMobile ? <ResidentScanner /> : <DesktopBlock />}
      </div>
    </AdminLayout>
  );
}
