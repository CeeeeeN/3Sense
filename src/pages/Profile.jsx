import { useState, useEffect, useRef } from "react";
import barangayLogo from "./barangay-logo.jpg";
import Navbar from "./Navbar";
import { getMemberProfile, updateMemberProfile } from "../services/profile";
import QRCode from "qrcode";

const QR_PAT = [
  true,true,true,false,true,
  true,false,true,true,false,
  true,true,false,true,true,
  false,true,true,false,true,
  true,false,true,true,true,
];

const TABS = ["Personal", "Address", "Category", "Education", "Household"];
const CATS = ["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"];

const BLANK = {
  firstName:"", middleName:"", lastName:"", suffix:"",
  birthDate:"", birthPlace:"", sex:"Male", civilStatus:"",
  citizenship:"", religion:"", contactNumber:"", email:"",
  houseNumber:"", street:"", region:"", province:"", city:"", barangay:"",
  sameAddress: false,
  categories:[],
  pwdStatus:"", disabilityType:"",
  educationAttainment:"", educationStatus:"", occupation:"", employmentStatus:"",
  totalMembers:"", householdClassification:"",
};

const STATUS_MAP = {
  "Clear Case":   { label: "Clear Case",   cls: "clear",     color: "#0d7a55", desc: "This resident has no pending cases or violations on record." },
  "Pending Case": { label: "Pending Case", cls: "pending",   color: "#e8a020", desc: "This resident has a case currently under review." },
  "Violation":    { label: "Violation",    cls: "violation", color: "#e03e3e", desc: "This resident has a recorded violation." },
};

const IconQR      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>;
const ProfileIconUser    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ProfileIconPin     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconTag     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>;
const IconGrad    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>;
const IconHome2   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const ProfileIconShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconHistory = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4.08"/><polyline points="3 3 3 9 9 9"/></svg>;
const IconEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconDl      = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const ProfileIconX       = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const ProfileIconArrow   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
const IconSave    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;


function InfoItem({ label, value }) {
  return (
    <div className="pf-info-item">
      <div className="pf-info-label">{label}</div>
      <div className={`pf-info-val${!value ? " empty" : ""}`}>{value || "Not provided"}</div>
    </div>
  );
}

function Card({ icon: Icon, title, tag, children }) {
  return (
    <div className="pf-card">
      <div className="pf-card-header">
        <div className="pf-card-icon"><Icon /></div>
        <span className="pf-card-title">{title}</span>
        {tag && <span className="pf-section-tag">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, req, children }) {
  return (
    <div className="pf-field">
      <label className="pf-lbl">{label}{req && <span className="req"> *</span>}</label>
      {children}
    </div>
  );
}

/** Format an ISO date string for display */
function formatHistoryDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export default function Profile({ onBack, onNavigate, householdID, memberID, userRole }) {
  const [data, setData]       = useState({ ...BLANK });
  const [draft, setDraft]     = useState({ ...BLANK });
  const [open, setOpen]       = useState(false);
  const [tab, setTab]         = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [qrUrl, setQrUrl]     = useState("");
  const qrCanvasRef           = useRef(null);

  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(" ");

  // Load member profile from Firestore on mount
  useEffect(() => {
    console.log("[Profile] householdID:", householdID, "memberID:", memberID);
    if (!householdID || !memberID) {
      console.warn("[Profile] Missing householdID or memberID — skipping load.");
      setLoading(false);
      return;
    }
    getMemberProfile(householdID, memberID)
      .then(profile => {
        console.log("[Profile] Loaded:", profile);
        setData(profile);
        setLoading(false);
      })
      .catch(err => {
        console.error("[Profile] Error:", err);
        setLoading(false);
      });
  }, [householdID, memberID]);

  // Generate QR code whenever fullName or householdID changes
  useEffect(() => {
    if (!fullName && !householdID) return;
    const qrData = JSON.stringify({
      householdID: householdID,
      memberID: memberID,
      name: fullName || "Resident",
      role: data.role || "member",
      barangay: data.barangay || "Malanday",
    });
    QRCode.toDataURL(qrData, { width: 180, margin: 1, color: { dark: "#0d7a55", light: "#ffffff" } })
      .then(url => setQrUrl(url))
      .catch(console.error);
  }, [fullName, householdID, memberID, data.role, data.barangay]);

  const openModal  = () => { setDraft({ ...data }); setTab(0); setOpen(true); };
  const closeModal = () => setOpen(false);

  const computeSameAddress = () => {
    if (data.role !== "head" && data.sameAddress) {
      const addressFields = ["houseNumber", "street", "barangay", "city", "province", "region"];
      const isUnchanged = addressFields.every(field => draft[field] === data[field]);
      return isUnchanged;
    }
    return false;
  };

  const save = async () => {
    if (!householdID || !memberID) { alert("Missing household or member info."); return; }
    setSaving(true);
    try {
      const payload = { ...draft, sameAddress: computeSameAddress() };
      await updateMemberProfile(householdID, memberID, payload);
      setData({ ...payload });
      setOpen(false);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.download = `${householdID}-${fullName || "member"}-QR.png`;
    link.href = qrUrl;
    link.click();
  };

  const normalizeCategories = (cats) => {
    let list = [];
    if (Array.isArray(cats)) list = cats;
    else if (typeof cats === "string") list = cats.split(",").map(s => s.trim()).filter(Boolean);
    
    // strip out emojis to clean up old DB state
    return list.map(c => {
       let cln = c.replace(/[^\w\s-]/gi, '').trim();
       if (cln === "Indigenous") cln = "Indigenous People";
       return cln;
    });
  };

  const addressFields = ["houseNumber", "street", "barangay", "city", "province", "region"];

  const set = f => e => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDraft(d => ({
      ...d,
      [f]: value,
      sameAddress: addressFields.includes(f) ? false : d.sameAddress,
    }));
  };

  const toggleCat = cat => setDraft(d => {
    const current = normalizeCategories(d.categories);
    return {
      ...d,
      categories: current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat],
    };
  });

  const normalizedDataCategories = normalizeCategories(data.categories);
  const normalizedDraftCategories = normalizeCategories(draft.categories);
  const isPwd = normalizedDataCategories.includes("PWD");
  const draftPwd = normalizedDraftCategories.includes("PWD");

  // Live record status from Firestore
  const currentStatus = data.adminStatus || "Clear Case";
  const sInfo = STATUS_MAP[currentStatus] || STATUS_MAP["Clear Case"];
  const statusHistory = Array.isArray(data.statusHistory) ? data.statusHistory : [];

  return (
    <div className="pf-root">
      {/* NAV */}
      <Navbar activePage="profile" householdID={householdID} onNavigate={onNavigate} userName={[data.firstName, data.lastName].filter(Boolean).join(" ") || ""} userRole={userRole} />

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--muted)", fontSize: "0.9rem" }}>
          Loading profile...
        </div>
      )}

      {!loading && <div className="pf-page">

        {/* HEADER */}
        <div className="pf-page-header">
          <div>
            <h1>My Profile</h1>
            <p>Manage your personal information and barangay records.</p>
          </div>
          <button className="pf-btn-primary" onClick={openModal}>
            <IconEdit /> Edit Profile
          </button>
        </div>

        {/* 1. QR */}
        <Card icon={IconQR} title="Personal QR Code">
          <div className="pf-qr-wrap">
            <div className="pf-qr-box" style={{ padding: 0, background: "#fff", borderRadius: 8, overflow: "hidden" }}>
              {qrUrl
                ? <img src={qrUrl} alt="Personal QR Code" style={{ width: 160, height: 160, display: "block" }} />
                : <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: "0.75rem" }}>Generating...</div>
              }
            </div>
            <div className="pf-qr-info">
              <div className="pf-qr-name">{fullName || "Your Full Name"}</div>
              <div className="pf-qr-id">{householdID || "HH-XXXX-XXXXX"} · {data.role === "head" ? "Household Head" : "Member"}</div>
              <div className="pf-qr-verified"><span className="dot" /> Verified Resident</div>
              <div className="pf-qr-meta">
                <div><div className="pf-qr-ml">Barangay</div><div className="pf-qr-mv">{data.barangay || "—"}</div></div>
                <div><div className="pf-qr-ml">City</div><div className="pf-qr-mv">{data.city || "—"}</div></div>
                <div>
                  <div className="pf-qr-ml">Record</div>
                  <div className="pf-qr-mv" style={{ color: sInfo.color }}>{sInfo.label}</div>
                </div>
              </div>
              <button className="pf-btn-dl" onClick={downloadQR} disabled={!qrUrl}><IconDl /> Download QR Code</button>
            </div>
          </div>
        </Card>

        {/* 2. PERSONAL INFO */}
        <Card icon={ProfileIconUser} title="Personal Information">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="pf-info-grid c3">
              <InfoItem label="First Name" value={data.firstName} />
              <InfoItem label="Middle Name" value={data.middleName} />
              <InfoItem label="Last Name" value={data.lastName} />
            </div>
            <div className="pf-info-grid">
              <InfoItem label="Date of Birth" value={data.birthDate} />
              <InfoItem label="Birth Place" value={data.birthPlace} />
              <InfoItem label="Sex" value={data.sex} />
              <InfoItem label="Civil Status" value={data.civilStatus} />
              <InfoItem label="Citizenship" value={data.citizenship} />
              <InfoItem label="Religion" value={data.religion} />
              <InfoItem label="Contact Number" value={data.contactNumber} />
              <InfoItem label="Email Address" value={data.email} />
            </div>
          </div>
        </Card>

        {/* 3. ADDRESS */}
        <Card icon={ProfileIconPin} title="Address Information">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="pf-info-grid">
              <InfoItem label="House / Unit Number" value={data.houseNumber} />
              <InfoItem label="Street" value={data.street} />
              <InfoItem label="Barangay" value={data.barangay} />
              <InfoItem label="City / Municipality" value={data.city} />
              <InfoItem label="Province" value={data.province} />
              <InfoItem label="Region" value={data.region} />
            </div>
          </div>
        </Card>

        {/* 4. CATEGORY */}
        <Card icon={IconTag} title="Category">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="pf-cat-grid">
              {data.categories && data.categories.length > 0
                ? data.categories.map(cat => (
                    <div key={cat} className="pf-chip on">
                      {cat}
                    </div>
                  ))
                : <div className="pf-chip off">No categories assigned</div>
              }
            </div>
            {isPwd && (
              <div className="pf-subfields">
                <div className="pf-subtitle">♿ PWD Details</div>
                <div className="pf-info-grid">
                  <InfoItem label="PWD Status" value={data.pwdStatus} />
                  <InfoItem label="Disability Type" value={data.disabilityType} />
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 5. EDUCATION */}
        <Card icon={IconGrad} title="Education & Employment">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="pf-info-grid">
              <InfoItem label="Highest Educational Attainment" value={data.educationAttainment} />
              <InfoItem label="Education Status" value={data.educationStatus} />
              <InfoItem label="Occupation" value={data.occupation} />
              <InfoItem label="Employment Status" value={data.employmentStatus} />
            </div>
          </div>
        </Card>

        {/* 6. HOUSEHOLD */}
        <Card icon={IconHome2} title="Household Information">
          <div className="pf-info-grid c3">
            <InfoItem label="Household ID" value={householdID} />
            <InfoItem label="Total Members" value={data.totalMembers} />
            <InfoItem label="Classification" value={data.householdClassification} />
          </div>
        </Card>

        {/* 7. RECORD STATUS — live from Firestore */}
        <Card icon={ProfileIconShield} title="Barangay Record Status" tag="Circumstances">
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div className={`pf-status-badge ${sInfo.cls}`}>
              <span className="pf-sdot" />{sInfo.label}
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
              <strong style={{ color: "var(--text)", fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem" }}>Current Standing: </strong>
              {sInfo.desc}
            </div>
          </div>

          {/* Remarks & Incident (only when set) */}
          {(data.adminRemarks || data.adminIncident) && (
            <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "0.9rem 1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {data.adminRemarks && (
                <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55 }}>
                  <strong style={{ fontFamily: "'Poppins',sans-serif" }}>Remarks: </strong>{data.adminRemarks}
                </div>
              )}
              {data.adminIncident && (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
                  <strong style={{ fontFamily: "'Poppins',sans-serif", color: "var(--text)" }}>Incident: </strong>{data.adminIncident}
                </div>
              )}
            </div>
          )}

          {/* Last updated attribution */}
          {data.adminLastUpdatedBy && (
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1rem", fontStyle: "italic" }}>
              Last updated by <strong style={{ fontStyle: "normal" }}>{data.adminLastUpdatedBy}</strong>
              {data.adminLastUpdatedByPosition ? ` (${data.adminLastUpdatedByPosition})` : ""}
              {data.adminLastUpdatedAt ? ` · ${data.adminLastUpdatedAt}` : ""}
            </div>
          )}

          {/* Status history log */}
          <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
              Case History
            </div>

            {statusHistory.length > 0 ? (
              statusHistory.map((entry, i) => {
                const dotColor = entry.status === "Clear Case"
                  ? "#0d7a55"
                  : entry.status === "Pending Case"
                    ? "#e8a020"
                    : "#e03e3e";
                const byLine = [
                  entry.setBy,
                  entry.setByPosition ? `(${entry.setByPosition})` : null,
                ].filter(Boolean).join(" ");

                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 5 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", fontFamily: "'Poppins',sans-serif" }}>
                        Status set to "{entry.status}"
                        {entry.remarks ? ` — ${entry.remarks}` : ""}
                      </div>
                      {entry.incident && (
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 1 }}>
                          {entry.incident}
                        </div>
                      )}
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                        {formatHistoryDate(entry.setAt)} · by {byLine}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                No status changes recorded yet.
              </div>
            )}
          </div>
        </Card>

        {/* 8. TRANSACTIONS */}
        <Card icon={IconHistory} title="Service & Transaction History">
          <div className="pf-table-wrap">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { service: "Barangay Clearance",           date: "Feb 14, 2026", status: "completed", remarks: "Issued successfully" },
                  { service: "Certificate of Indigency",     date: "Jan 30, 2026", status: "completed", remarks: "Issued successfully" },
                  { service: "Business Permit Endorsement",  date: "Jan 15, 2026", status: "rejected",  remarks: "Incomplete requirements" },
                  { service: "MPH Reservation",              date: "Dec 20, 2025", status: "completed", remarks: "Event completed" },
                  { service: "Barangay ID Request",          date: "Nov 11, 2025", status: "pending",   remarks: "Under processing" },
                ].map((tx, i) => (
                  <tr key={i}>
                    <td><div className="pf-tx-name">{tx.service}</div></td>
                    <td><div className="pf-tx-date">{tx.date}</div></td>
                    <td>
                      <span className={`pf-tx-badge ${tx.status}`}>
                        <span className="pf-tx-bdot" />
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{tx.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom spacer */}
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />

      </div>}

      {/* ── EDIT MODAL ── */}
      {open && (
        <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pf-modal">

            {/* Header */}
            <div className="pf-modal-head">
              <div>
                <h3>Edit Profile</h3>
                <p>Fill in your personal information</p>
              </div>
              <button className="pf-modal-close" onClick={closeModal}><ProfileIconX /></button>
            </div>

            {/* Tabs */}
            <div className="pf-modal-tabs">
              {TABS.map((t, i) => (
                <div key={i} className={`pf-modal-tab${i === tab ? " active" : i < tab ? " done" : ""}`} onClick={() => setTab(i)}>
                  <div className="pf-tab-num">{i < tab ? "✓" : i + 1}</div>{t}
                </div>
              ))}
            </div>

            {/* Body */}
            <div className="pf-modal-body">

              {/* TAB 0 — Personal */}
              {tab === 0 && <>
                <div className="fg c3">
                  <Field label="First Name" req><input className="pf-inp" placeholder="Maria" value={draft.firstName} onChange={set("firstName")} /></Field>
                  <Field label="Middle Name"><input className="pf-inp" placeholder="Santos" value={draft.middleName} onChange={set("middleName")} /></Field>
                  <Field label="Last Name" req><input className="pf-inp" placeholder="Dela Cruz" value={draft.lastName} onChange={set("lastName")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Suffix">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.suffix} onChange={set("suffix")}><option value="">None</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option></select></div>
                  </Field>
                  <Field label="Religion"><input className="pf-inp" placeholder="Roman Catholic" value={draft.religion} onChange={set("religion")} /></Field>
                </div>
                <div className="fg c3">
                  <Field label="Date of Birth" req><input className="pf-inp" type="date" value={draft.birthDate} onChange={set("birthDate")} /></Field>
                  <Field label="Birth Place"><input className="pf-inp" placeholder="Valenzuela City" value={draft.birthPlace} onChange={set("birthPlace")} /></Field>
                  <Field label="Citizenship"><input className="pf-inp" placeholder="Filipino" value={draft.citizenship} onChange={set("citizenship")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Sex" req>
                    <div className="pf-radio-row">
                      {["Male", "Female"].map(v => (
                        <label key={v} className="pf-radio-opt">
                          <input type="radio" name="sex" value={v} checked={draft.sex === v} onChange={set("sex")} />
                          <span className="pf-radio-lbl">{v}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Civil Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.civilStatus} onChange={set("civilStatus")}><option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></div>
                  </Field>
                </div>
                <div className="fg">
                  <Field label="Contact Number"><input className="pf-inp" type="tel" placeholder="09XX XXX XXXX" value={draft.contactNumber} onChange={set("contactNumber")} /></Field>
                  <Field label="Email Address"><input className="pf-inp" type="email" placeholder="email@example.com" value={draft.email} onChange={set("email")} /></Field>
                </div>
              </>}

              {/* TAB 1 — Address */}
              {tab === 1 && <>
                <div className="fg">
                  <Field label="House / Unit Number" req><input className="pf-inp" placeholder="123" value={draft.houseNumber} onChange={set("houseNumber")} /></Field>
                  <Field label="Street" req><input className="pf-inp" placeholder="Malanday Street" value={draft.street} onChange={set("street")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Region">
                    <div className="pf-sel-wrap">
                      <select className="pf-sel" value={draft.region} onChange={set("region")} disabled={draft.sameAddress}>
                        <option value="">Select region</option>
                        <option>NCR – National Capital Region</option>
                        <option>Region I – Ilocos Region</option>
                        <option>Region II – Cagayan Valley</option>
                        <option>Region III – Central Luzon</option>
                        <option>Region IV-A – CALABARZON</option>
                        <option>Region IV-B – MIMAROPA</option>
                        <option>Region V – Bicol Region</option>
                        <option>Region VI – Western Visayas</option>
                        <option>Region VII – Central Visayas</option>
                        <option>Region VIII – Eastern Visayas</option>
                        <option>Region IX – Zamboanga Peninsula</option>
                        <option>Region X – Northern Mindanao</option>
                        <option>Region XI – Davao Region</option>
                        <option>Region XII – SOCCSKSARGEN</option>
                        <option>Region XIII – Caraga</option>
                        <option>CAR – Cordillera Administrative Region</option>
                        <option>BARMM – Bangsamoro</option>
                      </select>
                    </div>
                  </Field>
                  <Field label="Province"><input className="pf-inp" placeholder="Metro Manila" value={draft.province} onChange={set("province")} readOnly={draft.sameAddress} /></Field>
                </div>
                <div className="fg">
                  <Field label="City / Municipality" req><input className="pf-inp" placeholder="Valenzuela City" value={draft.city} onChange={set("city")} /></Field>
                  <Field label="Barangay" req><input className="pf-inp" placeholder="Malanday" value={draft.barangay} onChange={set("barangay")} /></Field>
                </div>
              </>}

              {/* TAB 2 — Category */}
              {tab === 2 && <>
                {(() => {
                  const draftCategories = Array.isArray(draft.categories) ? draft.categories : [];
                  return (
                    <div className="pf-chk-grid">
                      {CATS.map(cat => (
                        <label key={cat} className="pf-chk-opt">
                          <input type="checkbox" checked={draftCategories.includes(cat)} onChange={() => toggleCat(cat)} />
                          <span className="pf-chk-lbl">
                            <span className="pf-chk-box">{draftCategories.includes(cat) ? "✓" : ""}</span>
                            {cat}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })()}
                {draftPwd && (
                  <div className="pf-subfields">
                    <div className="pf-subtitle">♿ PWD Details</div>
                    <div className="fg">
                      <Field label="PWD Status">
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.pwdStatus} onChange={set("pwdStatus")}><option value="">Select</option><option>Children with Disabilities</option><option>Person with Disabilities</option></select></div>
                      </Field>
                      <Field label="Disability Type">
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.disabilityType} onChange={set("disabilityType")}><option value="">Select</option><option>Inborn</option><option>Accident</option><option>Mental</option><option>Other</option></select></div>
                      </Field>
                    </div>
                  </div>
                )}
              </>}

              {/* TAB 3 — Education */}
              {tab === 3 && <>
                <div className="fg">
                  <Field label="Highest Educational Attainment">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationAttainment} onChange={set("educationAttainment")}><option value="">Select</option><option>Elementary</option><option>High School</option><option>College</option><option>Post Graduate</option><option>Vocational</option></select></div>
                  </Field>
                  <Field label="Education Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationStatus} onChange={set("educationStatus")}><option value="">Select</option><option>In School</option><option>Out of School Youth (OSY)</option><option>Graduate</option></select></div>
                  </Field>
                </div>
                <div className="fg">
                  <Field label="Occupation"><input className="pf-inp" placeholder="e.g. Teacher, Student" value={draft.occupation} onChange={set("occupation")} /></Field>
                  <Field label="Employment Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.employmentStatus} onChange={set("employmentStatus")}><option value="">Select</option><option>Employed</option><option>Unemployed</option><option>Self-employed</option><option>Student</option></select></div>
                  </Field>
                </div>
              </>}

              {/* TAB 4 — Household */}
              {tab === 4 && <>
                <div className="fg">
                  <Field label="Total Members"><input className="pf-inp" type="number" min="1" placeholder="e.g. 4" value={draft.totalMembers} onChange={set("totalMembers")} /></Field>
                  <Field label="Household Classification">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.householdClassification} onChange={set("householdClassification")}><option value="">Select</option><option>Class A</option><option>Class B</option><option>Class C</option><option>Class D</option><option>Class E</option></select></div>
                  </Field>
                </div>
              </>}

            </div>

            {/* Footer */}
            <div className="pf-modal-foot">
              <button className="pf-btn-ghost" onClick={tab === 0 ? closeModal : () => setTab(t => t - 1)}>
                {tab === 0 ? "Cancel" : "← Back"}
              </button>
              <div style={{ display: "flex", gap: "0.65rem" }}>
                {tab < TABS.length - 1
                  ? <button className="pf-btn-primary" onClick={() => setTab(t => t + 1)}>Next <ProfileIconArrow /></button>
                  : <button className="pf-btn-primary" onClick={save} disabled={saving}><IconSave /> {saving ? "Saving..." : "Save Changes"}</button>
                }
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}