import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef, useCallback } from "react";
import { IconUser, IconCalendar, IconClock, IconPin, IconHome, IconGlobe, IconPhone, IconMail, IconHeart, IconBriefcase, IconGradCap, IconBook, IconShield, IconInfo, IconReligion, IconPlus, IconArrow, IconCheck, IconX } from "../components/Icons";
import { addHouseholdMember } from "../services/addMembers";
import { useSearchParams, useNavigate } from 'react-router-dom';

const AVATAR_COLORS = [
  "linear-gradient(135deg,#0d7a55,#13a87a)",
  "linear-gradient(135deg,#7c3aed,#a855f7)",
  "linear-gradient(135deg,#e8a020,#f5c04a)",
  "linear-gradient(135deg,#e03e3e,#f87171)",
  "linear-gradient(135deg,#0891b2,#22d3ee)",
];

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND PLACEHOLDER: validateIsGovernmentId
// ─────────────────────────────────────────────────────────────────────────────
// Calls a Firebase Cloud Function named "validateGovernmentId".
// The Cloud Function should use Google Cloud Vision or the Anthropic API
// (server-side — never expose API keys on the client) to check the image.
//
// Expected Cloud Function input:  { image: "data:image/jpeg;base64,..." }
// Expected Cloud Function output: { isValid: boolean, reason: string, detectedType: string | null }
//
// TODO (backend):
//   1. Create a Firebase Cloud Function named "validateGovernmentId"
//   2. Inside it, call Cloud Vision or Anthropic API with the base64 image
//   3. Return { isValid, reason, detectedType }
//   4. Deploy, then replace the TEMPORARY PLACEHOLDER block below with:
//
//      const { getFunctions, httpsCallable } = await import("firebase/functions");
//      const fn = httpsCallable(getFunctions(), "validateGovernmentId");
//      const result = await fn({ image: imageBase64 });
//      return result.data;
// ─────────────────────────────────────────────────────────────────────────────
async function validateIsGovernmentId(imageBase64) {
  try {
    // ── TEMPORARY PLACEHOLDER ──────────────────────────────────────────────
    // Simulates a valid response so the full UI flow works without a backend.
    // Delete this block and uncomment the Cloud Function call above when ready.
    return new Promise((resolve) =>
      setTimeout(() => resolve({
        isValid: true,
        reason: null,
        detectedType: "Government ID",
        idNumber: null,
      }), 1000)
    );
    // ──────────────────────────────────────────────────────────────────────
  } catch (err) {
    console.error("[validateIsGovernmentId] Error:", err);
    return { isValid: null, reason: "Verification service unavailable. Please try again.", detectedType: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND PLACEHOLDER: extractIdData  (was: mockExtractText)
// ─────────────────────────────────────────────────────────────────────────────
// Calls a Firebase Cloud Function named "extractIdData".
// The Cloud Function should run OCR (Google Cloud Vision Document AI recommended)
// on the ID image and return structured field data.
//
// Expected Cloud Function input:  { image: "data:image/jpeg;base64,..." }
// Expected Cloud Function output:
//   { firstName, middleName, lastName, birthDate, idNumber, houseNumber, street, province }
//
// TODO (backend):
//   1. Create a Firebase Cloud Function named "extractIdData"
//   2. Inside it, run OCR on the image and map results to the fields above
//   3. Deploy, then replace the TEMPORARY PLACEHOLDER block below with:
//
//      const { getFunctions, httpsCallable } = await import("firebase/functions");
//      const fn = httpsCallable(getFunctions(), "extractIdData");
//      const result = await fn({ image: imageBase64 });
//      return result.data;
// ─────────────────────────────────────────────────────────────────────────────
async function extractIdData(imageBase64) {
  try {
    // ── TEMPORARY PLACEHOLDER ──────────────────────────────────────────────
    // Returns hardcoded mock data so autofill UI can be tested end-to-end.
    // Delete this block and uncomment the Cloud Function call above when ready.
    return new Promise((resolve) =>
      setTimeout(() => resolve({
        firstName: "Maria",
        middleName: "Santos",
        lastName: "Dela Cruz",
        birthDate: "1990-05-15",
        idNumber: "1234-5678-9012-0000",
        houseNumber: "123",
        street: "Malanday Street",
        province: "Bulacan",
      }), 1800)
    );
    // ──────────────────────────────────────────────────────────────────────
  } catch (err) {
    console.error("[extractIdData] Error:", err);
    return {}; // Empty on failure — user fills fields manually
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SvgIdCard = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <circle cx="8.5" cy="11.5" r="2" />
    <path d="M5.8 17c.4-1.5 1.5-2.2 2.7-2.2s2.3.7 2.7 2.2" strokeWidth="1.5" />
    <path d="M14 9h4M14 12h4M14 15h2" />
  </svg>
);
const SvgSelfie = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const SvgCamera = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const SvgUpload = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const SvgRefresh = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);
const SvgCheck2 = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const SvgAlert = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
  </svg>
);
const SvgInfo2 = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
  </svg>
);
const SvgLoader = ({ size = 36 }) => (
  <svg style={{ animation: "am-spin 0.9s linear infinite", transformOrigin: "center" }} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#31547c" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 12a9 9 0 11-2.636-6.364" />
  </svg>
);
const SvgCheckCircle = ({ size = 40, color = "#0d7a55" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const SvgXCircle = ({ size = 26, color = "#dc2626" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const SvgPerson = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SvgBranch = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v12" /><circle cx="6" cy="18" r="3" /><circle cx="6" cy="3" r="3" /><circle cx="18" cy="9" r="3" />
    <path d="M6 9h6a3 3 0 013 3v3" />
  </svg>
);

// ─── Family Branch Step ───────────────────────────────────────────────────────
const DEFAULT_BRANCHES = ["Cruz Family", "Santos Family", "Rosa Family"];

function AmFamilyBranchStep({ onConfirm, householdID }) {
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [createError, setCreateError] = useState("");

  const handleCreate = () => {
    const name = newBranchName.trim();
    if (!name) { setCreateError("Please enter a branch name."); return; }
    if (branches.some(b => b.toLowerCase() === name.toLowerCase())) {
      setCreateError("This branch already exists."); return;
    }
    setBranches(prev => [...prev, name]);
    setSelected(name);
    setNewBranchName("");
    setCreateError("");
    setShowModal(false);
  };

  return (
    <div>
      <div className="am-scan-header">
        <div className="am-scan-icon-wrap"><SvgBranch size={22} /></div>
        <div>
          <h3 className="am-scan-title">Family Branch</h3>
          <p className="am-scan-sub">Which family branch does this member belong to?</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", margin: "1rem 0" }}>
        {branches.map(branch => (
          <label key={branch} style={{ cursor: "pointer" }}>
            <div
              className={`am-branch-card${selected === branch ? " selected" : ""}`}
              onClick={() => setSelected(branch)}
            >
              <span className="am-branch-radio">
                <span className="am-branch-radio-dot" />
              </span>
              <span className="am-branch-label">{branch}</span>
            </div>
          </label>
        ))}
      </div>

      <button
        className="am-btn am-btn-ghost"
        onClick={() => { setShowModal(true); setCreateError(""); setNewBranchName(""); }}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", marginBottom: "1.25rem" }}
      >
        <IconPlus /> Create New Family Branch
      </button>

      {selected && (
        <div className="am-form-actions" style={{ marginTop: 0 }}>
          <div />
          <button
            className="am-btn am-btn-primary"
            onClick={() => onConfirm(selected)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
          >
            Next: ID Scan <IconArrow />
          </button>
        </div>
      )}

      {/* CREATE NEW BRANCH MODAL */}
      {showModal && (
        <div className="am-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="am-modal" onClick={e => e.stopPropagation()}>
            <div className="am-modal-header">
              <h4 className="am-modal-title">Create New Family Branch</h4>
              <button className="am-modal-close" onClick={() => setShowModal(false)}><IconX /></button>
            </div>
            <div className="am-modal-body">
              <Field label="Family Branch Name" required>
                <InputField
                  icon={SvgBranch}
                  type="text"
                  placeholder="e.g. Reyes Family"
                  value={newBranchName}
                  onChange={e => { setNewBranchName(e.target.value); setCreateError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
              </Field>
              {createError && <div className="am-field-error" style={{ marginTop: "0.5rem" }}>⚠️ {createError}</div>}
            </div>
            <div className="am-modal-footer">
              <button className="am-btn am-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="am-btn am-btn-primary"
                onClick={handleCreate}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
              >
                <IconCheck /> Save Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Camera hook ──────────────────────────────────────────────────────────────
function useCamera() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);

  const start = useCallback(async (facingMode = "environment") => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setActive(true);
    } catch {
      setError("Camera access denied or unavailable. Please use file upload instead.");
    }
  }, []);

  const stop = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setActive(false);
  }, []);

  const capture = useCallback(() => {
    if (!videoRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  }, []);

  useEffect(() => () => stop(), [stop]);
  return { videoRef, active, error, start, stop, capture };
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div className="am-field">
      <label className="am-label">{label}{required && <span className="req"> *</span>}</label>
      {children}
      {hint && <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>{hint}</span>}
    </div>
  );
}

function InputField({ icon: Icon, readOnly, autofilled, ...props }) {
  return (
    <div className="am-input-wrap" style={{ position: "relative" }}>
      {Icon && <span className="am-field-icon"><Icon /></span>}
      <input
        className={`am-input${Icon ? "" : " no-icon"}`}
        readOnly={readOnly}
        style={autofilled ? { borderColor: "#31547c", background: "rgba(49,125,137,0.05)" } : {}}
        {...props}
      />
      {autofilled && (
        <span style={{
          position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
          background: "rgba(49,125,137,0.12)", color: "#31547c",
          fontSize: "0.58rem", fontWeight: 700, fontFamily: "'Poppins',sans-serif",
          padding: "2px 7px", borderRadius: "100px", letterSpacing: "0.05em",
          textTransform: "uppercase", pointerEvents: "none", whiteSpace: "nowrap",
        }}>✦ Auto</span>
      )}
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

// ─── ID Scan Step ─────────────────────────────────────────────────────────────
function AmIdScanStep({ onConfirm }) {
  // idle | camera | preview | validating | invalid | processing | done
  const [mode, setMode] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const cam = useCamera();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadErr(null);
    if (!file.type.startsWith("image/")) {
      setUploadErr("Please upload a valid image file (JPG, PNG, WEBP).");
      fileRef.current.value = ""; return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadErr("File too large. Max 10MB.");
      fileRef.current.value = ""; return;
    }
    const reader = new FileReader();
    reader.onerror = () => { setUploadErr("Failed to read file. Try another image."); fileRef.current.value = ""; };
    reader.onload = ev => { setPreview(ev.target.result); setMode("preview"); setUploadErr(null); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => { setMode("camera"); await cam.start("environment"); };
  const capturePhoto = () => { const img = cam.capture(); cam.stop(); if (img) { setPreview(img); setMode("preview"); } };
  const retake = () => { setPreview(null); setResult(null); setUploadErr(null); setMode("idle"); cam.stop(); if (fileRef.current) fileRef.current.value = ""; };
  const reverify = () => { setResult(null); setMode("preview"); };

  const confirm = async () => {
    setMode("validating"); setResult(null);

    // BACKEND: calls validateIsGovernmentId placeholder above
    const res = await validateIsGovernmentId(preview);
    setResult(res);
    if (res.isValid === false || res.isValid === null) { setMode("invalid"); return; }

    setMode("processing");

    // BACKEND: calls extractIdData placeholder above
    const data = await extractIdData(preview);
    if (res.idNumber && !data.idNumber) data.idNumber = res.idNumber;

    setMode("done");
    setTimeout(() => onConfirm(preview, data), 700);
  };

  return (
    <div>
      <div className="am-scan-header">
        <div className="am-scan-icon-wrap"><SvgIdCard size={22} /></div>
        <div>
          <h3 className="am-scan-title">Scan Your ID</h3>
          <p className="am-scan-sub">Take a photo or upload a valid government-issued ID. Data will autofill the form.</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="am-dropzone">
            <div className="am-dropzone-icon"><SvgIdCard size={32} /></div>
            <p className="am-dropzone-title">Position your ID within frame</p>
            <p className="am-dropzone-sub">Accepted: PhilSys, Driver's License, Passport, Voter's ID, SSS, GSIS, PRC ID</p>
            <div className="am-btn-group">
              <button className="am-btn am-btn-primary" onClick={startCamera} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgCamera /> Use Camera
              </button>
              <button className="am-btn am-btn-ghost" onClick={() => fileRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgUpload /> Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            {uploadErr && <div className="am-upload-error"><SvgAlert size={14} /> {uploadErr}</div>}
          </div>
          <div className="am-info-box">
            <SvgInfo2 size={15} />
            <p>Your ID image is used for identity verification and will be submitted with this member's record.</p>
          </div>
        </div>
      )}

      {/* CAMERA */}
      {mode === "camera" && (
        <div className="am-camera-wrap">
          {cam.error ? (
            <div className="am-camera-error">
              <SvgAlert size={20} />
              <p>{cam.error}</p>
              <button className="am-btn am-btn-ghost" onClick={() => fileRef.current?.click()} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgUpload /> Upload Instead
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
          ) : (
            <div className="am-camera-view">
              <video ref={cam.videoRef} className="am-camera-video" playsInline muted />
              <div className="am-camera-overlay">
                <div className="am-camera-guide-id">
                  <div className="am-camera-corner tl" /><div className="am-camera-corner tr" />
                  <div className="am-camera-corner bl" /><div className="am-camera-corner br" />
                  <div className="am-camera-guide-label">Align ID within frame</div>
                </div>
              </div>
            </div>
          )}
          {!cam.error && (
            <div className="am-camera-actions">
              <button className="am-btn am-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                ← Back
              </button>
              <button className="am-btn am-btn-primary" onClick={capturePhoto} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgCamera /> Capture
              </button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {mode === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="am-id-preview-wrap"><img src={preview} alt="ID preview" /></div>
          <div className="am-preview-notice"><SvgCheck2 size={13} /> Image captured — click Verify to continue</div>
          <div className="am-btn-group">
            <button className="am-btn am-btn-ghost" onClick={retake} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgRefresh /> Retake</button>
            <button className="am-btn am-btn-primary" onClick={confirm} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgCheck2 /> Verify &amp; Extract</button>
          </div>
        </div>
      )}

      {/* VALIDATING */}
      {mode === "validating" && (
        <div className="am-status-center">
          <div className="am-status-icon loading"><SvgLoader /></div>
          <p className="am-status-title">Verifying ID…</p>
          <p className="am-status-sub">Checking that this is a valid government-issued ID</p>
        </div>
      )}

      {/* INVALID */}
      {mode === "invalid" && result && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="am-invalid-preview"><img src={preview} alt="Rejected ID" /></div>
          <div className={`am-invalid-card ${result.isValid === null ? "unavailable" : "rejected"}`}>
            <div className="am-invalid-header">
              <span className={`am-invalid-header-icon ${result.isValid === null ? "unavailable" : "rejected"}`}>
                {result.isValid === null ? <SvgAlert size={20} /> : <SvgXCircle size={24} />}
              </span>
              <p className={`am-invalid-title ${result.isValid === null ? "unavailable" : "rejected"}`}>
                {result.isValid === null ? "Verification Unavailable" : "Invalid ID Detected"}
              </p>
            </div>
            <p className="am-invalid-reason">{result.reason}</p>
          </div>
          <div className="am-btn-group">
            {result.isValid === null && (
              <button className="am-btn am-btn-ghost" onClick={reverify} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgRefresh /> Re-verify</button>
            )}
            <button className="am-btn am-btn-primary" onClick={retake} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgRefresh /> Try Different Image</button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {mode === "processing" && (
        <div className="am-status-center">
          <div className="am-status-icon loading"><SvgLoader /></div>
          <p className="am-status-title">Reading your ID…</p>
          <p className="am-status-sub">Running OCR, please wait</p>
        </div>
      )}

      {/* DONE */}
      {mode === "done" && (
        <div className="am-status-center">
          <div className="am-status-icon success"><SvgCheckCircle size={38} /></div>
          <p className="am-status-title">ID Verified — Data Extracted!</p>
          <p className="am-status-sub">Autofilling your information now</p>
        </div>
      )}
    </div>
  );
}

// ─── Selfie Step ──────────────────────────────────────────────────────────────
function AmSelfieStep({ onConfirm }) {
  const [mode, setMode] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [uploadErr, setUploadErr] = useState(null);
  const cam = useCamera();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadErr(null);
    if (!file.type.startsWith("image/")) { setUploadErr("Please upload a valid image file."); fileRef.current.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { setUploadErr("File too large. Max 10MB."); fileRef.current.value = ""; return; }
    const reader = new FileReader();
    reader.onerror = () => { setUploadErr("Failed to read file."); fileRef.current.value = ""; };
    reader.onload = ev => { setPreview(ev.target.result); setMode("preview"); setUploadErr(null); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => { setMode("camera"); await cam.start("user"); };
  const capturePhoto = () => { const img = cam.capture(); cam.stop(); if (img) { setPreview(img); setMode("preview"); } };
  const retake = () => { setPreview(null); setUploadErr(null); setMode("idle"); cam.stop(); };

  // TODO (backend): Optionally call a Firebase Cloud Function "verifySelfie"
  // after confirmation for liveness / face-match against the ID photo.
  // Input:  { selfie: base64, idImage: base64 }
  // Output: { isLive: boolean, faceMatch: boolean, reason: string }

  return (
    <div>
      <div className="am-scan-header">
        <div className="am-scan-icon-wrap"><SvgSelfie size={22} /></div>
        <div>
          <h3 className="am-scan-title">Take a Selfie</h3>
          <p className="am-scan-sub">A clear photo of the member's face is required before proceeding.</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="am-dropzone">
            <div className="am-dropzone-icon-circle"><SvgPerson size={34} /></div>
            <p className="am-dropzone-title">Face Verification Required</p>
            <p className="am-dropzone-sub">Look directly at the camera with a neutral expression.</p>
            <div className="am-btn-group">
              <button className="am-btn am-btn-primary" onClick={startCamera} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgCamera /> Open Camera
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            {uploadErr && <div className="am-upload-error"><SvgAlert size={14} /> {uploadErr}</div>}
          </div>
        </div>
      )}

      {/* CAMERA */}
      {mode === "camera" && (
        <div className="am-camera-wrap">
          {cam.error ? (
            <div className="am-camera-error">
              <SvgAlert size={20} />
              <p>{cam.error}</p>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
          ) : (
            <div className="am-camera-view selfie">
              <video ref={cam.videoRef} className="am-camera-video selfie" playsInline muted />
              <div className="am-camera-overlay">
                <div className="am-camera-guide-selfie" />
              </div>
              <div className="am-camera-selfie-label">Position face within oval</div>
            </div>
          )}
          {!cam.error && (
            <div className="am-camera-actions">
              <button className="am-btn am-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>← Back</button>
              <button className="am-btn am-btn-primary" onClick={capturePhoto} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgCamera /> Capture Selfie</button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {mode === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="am-selfie-preview-center">
            <div className="am-selfie-oval"><img src={preview} alt="Selfie" /></div>
          </div>
          <div className="am-selfie-success"><SvgCheckCircle size={16} /> Selfie captured successfully</div>
          <div className="am-btn-group">
            <button className="am-btn am-btn-ghost" onClick={retake} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgRefresh /> Retake</button>
            <button className="am-btn am-btn-primary" onClick={() => onConfirm(preview)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}><SvgCheck2 /> Confirm Selfie</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Form steps tabs ──────────────────────────────────────────────────────────
const BLANK_FORM = {
  firstName: "", middleName: "", lastName: "", suffix: "", religion: "",
  birthDate: "", age: "", birthPlace: "", sex: "Male", gender: "", genderOther: "", civilStatus: "",
  contactNumber: "", email: "", residingSinceYear: "",
  houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
  categories: [],
  pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
  educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
  sameAddress: false,
  isBranchHead: false,
};

const OUTER_STEPS = ["Family Branch", "ID Scan", "Selfie", "Personal Info", "Address", "Category", "Education"];
const FORM_TABS = ["Personal Info", "Address", "Category", "Education"];

export default function AddMembers({ onBack, onDone, householdID: propHouseholdID, hhAddress }) {
  const [outerStep, setOuterStep] = useState(0); // 0=FamilyBranch, 1=IDScan, 2=Selfie, 3=formTabs
  const [familyBranch, setFamilyBranch] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [autofilledFields, setAutofilledFields] = useState(new Set());
  const manuallyEdited = useRef(new Set());

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState(1);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [showToast, setShowToast] = useState(false);
  const [memberError, setMemberError] = useState("");
  const toastRef = useRef(null);
  const householdID = propHouseholdID || searchParams.get("hhID");

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const handleDone = () => {
    if (onDone) onDone();
    else navigate('/');
  };

  useEffect(() => {
    if (showToast) {
      clearTimeout(toastRef.current);
      toastRef.current = setTimeout(() => setShowToast(false), 3000);
    }
  }, [showToast]);

  // ─── OCR autofill ───────────────────────────────────────────────────────────
  const applyOcr = useCallback((data) => {
    const mapping = {
      firstName: "firstName", middleName: "middleName", lastName: "lastName",
      birthDate: "birthDate",
      houseNumber: "houseNumber", street: "street", province: "province",
    };
    const filled = new Set();
    setForm(prev => {
      const next = { ...prev };
      Object.entries(mapping).forEach(([ocrKey, formKey]) => {
        if (data[ocrKey] && !manuallyEdited.current.has(formKey)) { next[formKey] = data[ocrKey]; filled.add(formKey); }
      });
      if (data.birthDate && !manuallyEdited.current.has("birthDate")) {
        const dob = new Date(data.birthDate); const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
        next.age = age > 0 ? String(age) : "";
      }
      return next;
    });
    setAutofilledFields(filled);
  }, []);

  const set = (field) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    manuallyEdited.current.add(field);
    setAutofilledFields(prev => { const s = new Set(prev); s.delete(field); return s; });
    setForm(f => {
      const next = { ...f, [field]: val };
      if (field === "birthDate" && e.target.value) {
        const dob = new Date(e.target.value); const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        next.age = age > 0 ? String(age) : "";
      }
      return next;
    });
  };

  const af = (field) => autofilledFields.has(field);

  const toggleCategory = (val) => setForm(f => ({
    ...f,
    categories: f.categories.includes(val) ? f.categories.filter(c => c !== val) : [...f.categories, val],
  }));

  const handleSameAddress = (checked) => {
    if (checked && hhAddress) {
      setForm(f => ({ ...f, sameAddress: true, houseNumber: hhAddress.houseNumber || "", street: hhAddress.street || "", region: hhAddress.region || "", province: hhAddress.province || "", city: hhAddress.city || "", barangay: hhAddress.barangay || "" }));
    } else {
      setForm(f => ({ ...f, sameAddress: false, houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday" }));
    }
  };

  // ─── Validation ─────────────────────────────────────────────────────────────
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
      else if (form.contactNumber.replace(/\D/g, "").length < 10) missing.push("Valid Contact Number");
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
    if (missing.length > 0) { setMemberError(`Please fill in required fields: ${missing.join(", ")}`); return false; }
    setMemberError(""); return true;
  };

  const goNext = (nextTab) => {
    if (!validateTab(tab)) return;
    if (tab === 1 && form.isBranchHead && members.some(m => m.familyBranch === familyBranch && m.isBranchHead)) {
      setMemberError("Branch already has a head");
      return;
    }
    setTab(nextTab); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = (prevTab) => { setMemberError(""); setTab(prevTab); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const addMember = async () => {
    if (!validateTab(1) || !validateTab(4)) { setTab(1); return; }
    if (form.isBranchHead && members.some(m => m.familyBranch === familyBranch && m.isBranchHead)) {
      setMemberError("Branch already has a head"); setTab(1); return;
    }
    const fullName = [form.firstName, form.middleName, form.lastName, form.suffix].filter(Boolean).join(" ") || `Member ${members.length + 1}`;
    const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "M");
    const color = AVATAR_COLORS[members.length % AVATAR_COLORS.length];
    try {
      // BACKEND: calls addHouseholdMember — this already goes to Firebase via your services/addMembers file
      // TODO (backend): make sure addHouseholdMember also saves idImage and selfieImage to Firebase Storage
      // and stores the download URLs in the member's Firestore document.
      await addHouseholdMember(householdID, {
        ...form,
        familyBranch,
        idImage,
        selfieImage,
        categories: form.categories || [],
      });
    } catch (err) { alert("Failed to save member: " + err.message); return; }

    setMembers(m => [...m, {
      fullName, initials, color, familyBranch, isBranchHead: form.isBranchHead,
      meta: [form.sex, form.age ? `${form.age} yrs` : null, form.civilStatus].filter(Boolean).join(" · "),
    }]);

    // Reset for next member
    setForm({ ...BLANK_FORM });
    setIdImage(null);
    setSelfieImage(null);
    setFamilyBranch(null);
    setAutofilledFields(new Set());
    manuallyEdited.current = new Set();
    setTab(1);
    setOuterStep(0); // back to Family Branch step for next member
    setMemberError("");
    setShowToast(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeMember = (i) => setMembers(m => m.filter((_, idx) => idx !== i));

  const addrPreview = hhAddress
    ? [hhAddress.houseNumber, hhAddress.street, hhAddress.barangay, hhAddress.city].filter(Boolean).join(", ")
    : "No address found from registration.";

  const isPwd = Array.isArray(form.categories) && form.categories.includes("PWD");

  const totalOuter = OUTER_STEPS.length;
  const currentOuter = outerStep === 0 ? 0 : outerStep === 1 ? 1 : outerStep === 2 ? 2 : 2 + tab;
  const outerProgress = (currentOuter / (totalOuter - 1)) * 100;

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
          <span>{householdID || "MAL-XXXX-XXXXX"}</span>
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

        {/* MEMBERS LIST — grouped by family branch */}
        {members.length > 0 && (() => {
          // Build ordered unique branch list (preserving insertion order)
          const branchOrder = [];
          members.forEach(m => { if (!branchOrder.includes(m.familyBranch)) branchOrder.push(m.familyBranch); });
          return (
            <div className="am-branch-groups">
              {branchOrder.map(branch => {
                const branchMembers = members.filter(m => m.familyBranch === branch);
                const headIdx = members.findIndex(m => m.familyBranch === branch && m.isBranchHead);
                return (
                  <div key={branch} className="am-branch-group">
                    <div className="am-branch-group-header">
                      <span className="am-branch-group-icon"><SvgBranch size={14} /></span>
                      <span className="am-branch-group-title">{branch}</span>
                      <span className="am-branch-group-count">{branchMembers.length} {branchMembers.length === 1 ? "member" : "members"}</span>
                    </div>
                    <div className="am-branch-group-body">
                      {branchMembers.map((m) => {
                        const globalIdx = members.indexOf(m);
                        return (
                          <div key={globalIdx} className={`am-member-chip${m.isBranchHead ? " head" : ""}`}>
                            <div className="am-chip-avatar" style={{ background: m.color }}>{m.initials}</div>
                            <div className="am-chip-info">
                              <div className="am-chip-name">
                                {m.fullName}
                                {m.isBranchHead && <span className="am-chip-badge">⭐ Branch Head</span>}
                              </div>
                              <div className="am-chip-meta">{m.meta || "Added just now"}</div>
                            </div>
                            <button className="am-chip-remove" onClick={() => removeMember(globalIdx)}><IconX /></button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* FORM CARD */}
        <div className="am-form-card">
          <div className="am-form-card-header">
            <h3>
              <IconPlus /> Add New Member
              <span className="am-member-count-badge">Member {members.length + 1}</span>
            </h3>
            <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => {
              setForm({ ...BLANK_FORM }); setTab(1); setOuterStep(0);
              setIdImage(null); setSelfieImage(null); setFamilyBranch(null);
              setAutofilledFields(new Set()); manuallyEdited.current = new Set();
            }}>
              Clear Form
            </button>
          </div>

          {/* ── OUTER STEPPER (desktop) ── */}
          <div className="am-outer-stepper">
            {OUTER_STEPS.map((label, i) => {
              const isDone = i < currentOuter;
              const isActive = i === currentOuter;
              return (
                <div key={i} className={`am-outer-step ${isDone ? "done" : isActive ? "active" : ""}`}>
                  <div className="am-outer-step-num">{isDone ? "✓" : i + 1}</div>
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          {/* ── OUTER STEPPER (mobile) ── */}
          <div className="am-outer-stepper-mobile">
            <div className="am-mobile-outer-top">
              <div className="am-mobile-outer-left">
                <div className="am-mobile-outer-badge">{currentOuter + 1}</div>
                <div className="am-mobile-outer-info">
                  <span className="am-mobile-outer-name">{OUTER_STEPS[currentOuter]}</span>
                  <span className="am-mobile-outer-sub">
                    {currentOuter < totalOuter - 1 ? `Next: ${OUTER_STEPS[currentOuter + 1]}` : "Last step"}
                  </span>
                </div>
              </div>
              <span className="am-mobile-outer-count">{currentOuter + 1} / {totalOuter}</span>
            </div>
            <div className="am-mobile-outer-track">
              <div className="am-mobile-outer-fill" style={{ width: `${outerProgress}%` }} />
            </div>
            <div className="am-mobile-outer-dots">
              {OUTER_STEPS.map((_, i) => (
                <div key={i} className={`am-mobile-outer-dot ${i < currentOuter ? "done" : i === currentOuter ? "active" : ""}`} />
              ))}
            </div>
          </div>

          {/* ── STEP 0: FAMILY BRANCH ── */}
          {outerStep === 0 && (
            <AmFamilyBranchStep
              householdID={householdID}
              onConfirm={(branch) => {
                setFamilyBranch(branch);
                setOuterStep(1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}

          {/* ── STEP 1: ID SCAN ── */}
          {outerStep === 1 && (
            <div>
              <AmIdScanStep
                onConfirm={(img, data) => {
                  setIdImage(img);
                  applyOcr(data);
                  setOuterStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
              <div style={{ marginTop: "1rem" }}>
                <button className="am-btn am-btn-ghost" onClick={() => setOuterStep(0)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                  ← Back to Family Branch
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: SELFIE ── */}
          {outerStep === 2 && (
            <div>
              <AmSelfieStep
                onConfirm={(img) => {
                  setSelfieImage(img);
                  setOuterStep(3);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
              <div style={{ marginTop: "1rem" }}>
                <button className="am-btn am-btn-ghost" onClick={() => setOuterStep(1)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                  ← Back to ID Scan
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3+: FORM TABS ── */}
          {outerStep === 3 && (
            <div>
              {autofilledFields.size > 0 && tab === 1 && (
                <div className="am-autofill-banner">
                  <SvgInfo2 size={14} />
                  <span>Some fields were autofilled from your ID scan. You may edit them before submitting.</span>
                </div>
              )}
              {autofilledFields.size > 0 && tab === 2 && (
                <div className="am-autofill-banner">
                  <SvgInfo2 size={14} />
                  <span>Address fields were partially autofilled from your ID. Please verify.</span>
                </div>
              )}

              {tab === 2 && (
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
              )}

              {/* INNER STEPPER (form tabs) */}
              <div className="am-inner-stepper">
                {FORM_TABS.map((label, i) => {
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
                      <Field label="First Name" required><InputField icon={IconUser} type="text" placeholder="Maria" value={form.firstName} onChange={set("firstName")} autofilled={af("firstName")} /></Field>
                      <Field label="Middle Name"><InputField icon={IconUser} type="text" placeholder="Santos" value={form.middleName} onChange={set("middleName")} autofilled={af("middleName")} /></Field>
                      <Field label="Last Name" required><InputField icon={IconUser} type="text" placeholder="Dela Cruz" value={form.lastName} onChange={set("lastName")} autofilled={af("lastName")} /></Field>
                    </div>
                    <div className="am-form-grid cols-3">
                      <Field label={<>Suffix <span style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional)</span></>}>
                        <SelectField icon={IconUser} value={form.suffix} onChange={set("suffix")}>
                          <option value="">None</option>
                          <option>Jr.</option><option>Sr.</option><option>II</option><option>III</option>
                        </SelectField>
                      </Field>
                      <Field label="Religion"><InputField icon={IconReligion} type="text" placeholder="Roman Catholic" value={form.religion} onChange={set("religion")} /></Field>
                      <Field label="Civil Status" required>
                        <SelectField icon={IconHeart} value={form.civilStatus} onChange={set("civilStatus")}>
                          <option value="">Select</option>
                          <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="am-form-grid cols-3">
                      <Field label="Birth Date" required><InputField icon={IconCalendar} type="date" value={form.birthDate} onChange={set("birthDate")} autofilled={af("birthDate")} /></Field>
                      <Field label="Age"><InputField icon={IconClock} type="number" placeholder="Auto" value={form.age} readOnly /></Field>
                      <Field label="Birth Place" required><InputField icon={IconPin} type="text" placeholder="Valenzuela City" value={form.birthPlace} onChange={set("birthPlace")} /></Field>
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
                      <Field label="Gender">
                        <SelectField icon={IconUser} value={form.gender} onChange={set("gender")}>
                          <option value="">Select gender</option>
                          <option>Cisgender</option>
                          <option>Non-binary</option>
                          <option>Transgender Man</option>
                          <option>Transgender Woman</option>
                          <option>Genderqueer</option>
                          <option>Others</option>
                          <option>Prefer not to say</option>
                        </SelectField>
                      </Field>
                    </div>
                    {form.gender === "Others" && (
                      <Field label="Please specify gender">
                        <InputField type="text" placeholder="Please specify" value={form.genderOther} onChange={set("genderOther")} />
                      </Field>
                    )}
                    <div className="am-form-grid cols-2">
                      <Field label="Contact Number" required><InputField icon={IconPhone} type="tel" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={set("contactNumber")} /></Field>
                      <Field label="Email Address" required hint="Used for account notifications."><InputField icon={IconMail} type="email" placeholder="email@example.com" value={form.email} onChange={set("email")} /></Field>
                    </div>
                    <div className="am-form-grid cols-2">
                      <Field label="Residing Since (Year)" required><InputField icon={IconCalendar} type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={form.residingSinceYear} onChange={set("residingSinceYear")} /></Field>
                    </div>

                    {/* Branch Head Toggle */}
                    <div className="am-special-checks">
                      <label className="am-special-check">
                        <input
                          type="checkbox"
                          checked={form.isBranchHead}
                          onChange={e => {
                            const checked = e.target.checked;
                            const alreadyHasHead = members.some(m => m.familyBranch === familyBranch && m.isBranchHead);
                            if (checked && alreadyHasHead) {
                              setMemberError(`Branch already has a head`);
                            } else {
                              setMemberError("");
                            }
                            set("isBranchHead")(e);
                          }}
                        />
                        <span className="am-special-check-label">
                          <span className="am-check-icon-box">{form.isBranchHead && "✓"}</span>
                          <span className="am-check-text">
                            <strong>Set as Branch Head</strong>
                            <span>Designate this member as the head of {familyBranch || "the selected family branch"}</span>
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                  {memberError && <div className="am-field-error">⚠️ {memberError}</div>}
                  <div className="am-form-actions">
                    <button className="am-btn am-btn-ghost" onClick={() => { setOuterStep(2); setMemberError(""); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>← Back</button>
                    <button className="am-btn am-btn-primary" onClick={() => goNext(2)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>Next: Address <IconArrow /></button>
                  </div>
                </div>
              )}

              {/* TAB 2: Address */}
              {tab === 2 && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div className="am-form-grid cols-2">
                      <Field label="House / Unit Number" required><InputField icon={IconHome} type="text" placeholder="123" value={form.houseNumber} readOnly={form.sameAddress} onChange={set("houseNumber")} autofilled={af("houseNumber")} /></Field>
                      <Field label="Street" required><InputField icon={IconHome} type="text" placeholder="Malanday Street" value={form.street} readOnly={form.sameAddress} onChange={set("street")} autofilled={af("street")} /></Field>
                    </div>
                    <div className="am-form-grid cols-2">
                      <Field label="Region" required><InputField icon={IconGlobe} type="text" value={form.region} readOnly /></Field>
                      <Field label="Province" required><InputField icon={IconPin} type="text" placeholder="Bulacan" value={form.province} readOnly={form.sameAddress} onChange={set("province")} autofilled={af("province")} /></Field>
                    </div>
                    <div className="am-form-grid cols-2">
                      <Field label="City / Municipality" required><InputField icon={IconPin} type="text" value={form.city} readOnly /></Field>
                      <Field label="Barangay" required><InputField icon={IconPin} type="text" value={form.barangay} readOnly /></Field>
                    </div>
                  </div>
                  {memberError && <div className="am-field-error">⚠️ {memberError}</div>}
                  <div className="am-form-actions">
                    <button className="am-btn am-btn-ghost" onClick={() => goBack(1)}>← Back</button>
                    <button className="am-btn am-btn-primary" onClick={() => goNext(3)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>Next: Category <IconArrow /></button>
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
                          <span className="am-check-label"><span className="am-check-box">{form.categories.includes(cat) && "✓"}</span>{cat}</span>
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
                              <option>Physical Disability</option>
                              <option>Visual Disability</option>
                              <option>Hearing Disability</option>
                              <option>Speech Impairment</option>
                              <option>Intellectual Disability</option>
                              <option>Learning Disability</option>
                              <option>Psychosocial Disability</option>
                              <option>Multiple Disabilities</option>
                              <option>Chronic Illness</option>
                              <option>Rare Disease</option>
                              <option>Others</option>
                            </SelectField>
                          </Field>
                        </div>
                        {form.disabilityType === "Others" && (
                          <Field label="Please specify disability type">
                            <InputField type="text" placeholder="Please specify" value={form.disabilityTypeOther} onChange={set("disabilityTypeOther")} />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="am-form-actions">
                    <button className="am-btn am-btn-ghost" onClick={() => goBack(2)}>← Back</button>
                    <button className="am-btn am-btn-primary" onClick={() => goNext(4)} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>Next: Education <IconArrow /></button>
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
                          <option>In School</option><option>Out of School Youth (OSY)</option><option>Out of School Children (OSC)</option><option>Graduate</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="am-form-grid cols-2">
                      <Field label="Occupation"><InputField icon={IconBriefcase} type="text" placeholder="Teacher, Student..." value={form.occupation} onChange={set("occupation")} /></Field>
                      <Field label="Employment Status" required>
                        <SelectField icon={IconBriefcase} value={form.employmentStatus} onChange={set("employmentStatus")}>
                          <option value="">Select</option>
                          <option>Employed</option><option>Unemployed</option>
                        </SelectField>
                      </Field>
                    </div>
                  </div>
                  {memberError && <div className="am-field-error">⚠️ {memberError}</div>}
                  <div className="am-form-actions">
                    <button className="am-btn am-btn-ghost" onClick={() => goBack(3)}>← Back</button>
                    <button className="am-btn am-btn-primary" onClick={addMember} style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                      <IconCheck /> Add Member
                    </button>
                  </div>
                </div>
              )}
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