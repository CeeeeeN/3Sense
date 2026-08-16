import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef, useCallback } from "react";
import { submitRegistration } from "../services/registration";
import {
  RegisIconUser, RegisIconCalendar, RegisIconClock, RegisIconPin, RegisIconPhone,
  RegisIconMail, RegisIconHome, RegisIconGlobe, RegisIconBriefcase, RegisIconBook,
  IconUsers, RegisIconHeart, IconFlag, RegisIconShield, RegisIconInfo,
  RegisIconReligion, RegisIconGradCap,
} from "../components/Icons";

// ─── ID Validation — mocked until backend Cloud Function is deployed ──────────
async function validateIsGovernmentId(imageBase64) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({
      isValid: true,
      reason: null,
      detectedType: "Government ID",
      idNumber: null,
    }), 1000)
  );
}

// ─── LIVE OCR INTEGRATION ─────────────────────────────────────────────────────
async function performLiveOCR(imageBase64) {
  try {
    const formData = new FormData();
    formData.append("base64Image", imageBase64);
    formData.append("apikey", "helloworld");
    formData.append("language", "eng");
    formData.append("isOverlayRequired", false);
    formData.append("detectOrientation", true);
    formData.append("scale", true);
    formData.append("OCREngine", 2);

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    if (result.IsErroredOnProcessing || !result.ParsedResults || !result.ParsedResults[0]) {
      throw new Error("OCR Processing Failed");
    }

    const text = result.ParsedResults[0].ParsedText;
    console.log("Live OCR Extracted Text:\n", text);

    let data = {
      idNumber: "", firstName: "", middleName: "", lastName: "",
      birthDate: "", houseNumber: "", street: "", province: "NCR"
    };

    const idMatch = text.match(/\d{4}\s*-\s*\d{4}\s*-\s*\d{4}\s*-\s*\d{4}/);
    if (idMatch) {
      data.idNumber = idMatch[0].replace(/\s/g, '');
    }

    const dobMatch = text.match(/(?:JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER|JAN|FEB|MAR|APR|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2},?\s+\d{4}/i);
    if (dobMatch) {
      const d = new Date(dobMatch[0].replace(/,/g, ''));
      if (!isNaN(d.getTime())) {
        data.birthDate = d.toISOString().split('T')[0];
      }
    }

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const cleanName = (str) => str.replace(/[^A-Z\sÑñ-]/ig, '').trim();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();

      const extractNextValidLine = (startIndex) => {
        for (let j = startIndex + 1; j < Math.min(startIndex + 4, lines.length); j++) {
          const nextLine = lines[j].toUpperCase();
          if (nextLine.match(/NAME|GIVEN|MIDDLE|LAST|DATE|BIRTH|ADDRESS|BLOOD|SEX|MALE|FEMALE|PHILIPPINES|REPUBLIKA|KAPANGANAKAN|TIRAHAN|APELYIDO|PANGALAN|GITNANG/)) continue;
          if (nextLine.match(/\d{4}-\d{4}/)) continue;

          const cleaned = cleanName(lines[j]);
          if (cleaned.length > 1) return cleaned;
        }
        return "";
      };

      const extractInlineOrNext = (keywordRegex) => {
        const parts = line.split(keywordRegex);
        if (parts.length > 1 && parts[parts.length - 1].trim().length > 1) {
          const inlineVal = cleanName(parts[parts.length - 1]);
          if (inlineVal) return inlineVal;
        }
        return extractNextValidLine(i);
      };

      if (/(?:LAST\s*NAME|APELYIDO)/i.test(line) && !data.lastName) {
        data.lastName = extractInlineOrNext(/(?:LAST\s*NAME|APELYIDO)/i);
      }
      else if (/(?:GIVEN\s*NAMES?|PANGALAN)/i.test(line) && !data.firstName) {
        data.firstName = extractInlineOrNext(/(?:GIVEN\s*NAMES?|PANGALAN)/i);
      }
      else if (/(?:MIDDLE\s*NAME|GITNANG\s*APELYIDO|GITNANG)/i.test(line) && !data.middleName) {
        data.middleName = extractInlineOrNext(/(?:MIDDLE\s*NAME|GITNANG\s*APELYIDO|GITNANG)/i);
      }
      else if (/(?:ADDRESS|TIRAHAN)/i.test(line) && !data.houseNumber) {
        let addrLine = line.split(/(?:ADDRESS|TIRAHAN)/i).pop().trim();
        if (!addrLine && lines[i + 1]) {
          addrLine = lines[i + 1].trim() + " " + (lines[i + 2] || "").trim();
        }
        if (addrLine) {
          const parts = addrLine.split(',');
          if (parts.length > 0) {
            const firstPart = parts[0].trim().split(' ');
            data.houseNumber = firstPart[0].replace(/[^0-9A-Z-]/ig, '');
            data.street = firstPart.slice(1).join(' ').replace(/[^A-Z0-9\s.-]/ig, '').trim();
          }
        }
      }
    }

    Object.keys(data).forEach(key => { if (!data[key]) delete data[key]; });

    return data;
  } catch (err) {
    console.error("Live OCR Error:", err);
    return {};
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const SvgIdCard = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <circle cx="8.5" cy="11.5" r="2" />
    <path d="M5.8 17c.4-1.5 1.5-2.2 2.7-2.2s2.3.7 2.7 2.2" strokeWidth="1.5" />
    <path d="M14 9h4M14 12h4M14 15h2" />
  </svg>
);
const SvgSelfie = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
const SvgPerson = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const SvgMapPin = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const SvgTag = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <circle cx="7" cy="7" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);
const SvgGradCap = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);
const SvgHome = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const SvgClipboard = ({ size = 26 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <rect x="8" y="2" width="8" height="4" rx="1.5" ry="1.5" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);
const SvgCheckCircle = ({ size = 44, color = "#2db17b" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const SvgXCircle = ({ size = 28, color = "#dc2626" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);
const SvgLoader = ({ size = 40 }) => (
  <svg className="reg-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#317D89" strokeWidth="2.2" strokeLinecap="round">
    <path d="M21 12a9 9 0 11-2.636-6.364" />
  </svg>
);
const SvgShield = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);
const SvgInfo = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
  </svg>
);
const SvgAlert = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
  </svg>
);
const SvgCamera = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const SvgUpload = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const SvgRefresh = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
  </svg>
);
const SvgArrowLeft = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
  </svg>
);
const SvgArrowRight = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);
const SvgCheck = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const SvgWheelchair = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="4" r="1.5" />
    <path d="M8.5 8.5l1.5 3.5h4l1 4" />
    <path d="M6 17.5a4 4 0 108 0" />
    <line x1="15" y1="8.5" x2="18" y2="8.5" />
  </svg>
);
const SvgSend = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const SvgHashtag = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const STEP_ICONS = [
  <SvgIdCard size={22} />,
  <SvgSelfie size={22} />,
  <SvgPerson size={22} />,
  <SvgMapPin size={22} />,
  <SvgTag size={22} />,
  <SvgGradCap size={22} />,
  <SvgHome size={22} />,
  <SvgClipboard size={22} />,
];

const STEPS = [
  { label: "ID Scan" },
  { label: "Selfie" },
  { label: "Personal Info" },
  { label: "Address" },
  { label: "Category" },
  { label: "Education" },
  { label: "Household" },
  { label: "Review & Submit" },
];

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
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
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

function Field({ label, required, hint, children }) {
  return (
    <div className="reg-field">
      <label className="reg-label">
        {label}{required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && <span className="reg-field-hint">{hint}</span>}
    </div>
  );
}

function InputField({ icon: Icon, autofilled, ...props }) {
  return (
    <div className="reg-input-wrap" style={{ position: "relative" }}>
      {Icon && <span className="reg-field-icon"><Icon /></span>}
      <input
        className={`reg-input${Icon ? "" : " no-icon"}`}
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
    <div className="reg-select-wrap">
      {Icon && <span className="reg-field-icon"><Icon /></span>}
      <select className={`reg-select${Icon ? "" : " no-icon"}`} {...props}>{children}</select>
    </div>
  );
}

function SectionIcon({ children }) {
  return <div className="reg-section-icon-wrap">{children}</div>;
}

function UploadErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <div className="reg-upload-error">
      <SvgAlert size={16} /> {msg}
    </div>
  );
}

function CameraError({ error, onUpload, fileRef }) {
  return (
    <div className="reg-camera-error">
      <div className="reg-camera-error-icon"><SvgAlert size={22} /></div>
      <p>{error}</p>
      <button className="reg-btn-ghost" onClick={() => { fileRef.current?.click(); }}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        <SvgUpload /> Upload Instead
      </button>
    </div>
  );
}

// ─── ID Scan Step ─────────────────────────────────────────────────────────────
function IdScanStep({ onConfirm, onSkip }) {
  const [mode, setMode] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [validationResult, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const cam = useCamera();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (JPG, PNG, WEBP).");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image file is too large. Maximum size is 10MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { setUploadError("Failed to read the file. Please try another image."); if (fileRef.current) fileRef.current.value = ""; };
    reader.onload = (ev) => { setPreview(ev.target.result); setMode("preview"); setUploadError(null); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => { setMode("camera"); await cam.start("environment"); };
  const capturePhoto = () => { const img = cam.capture(); cam.stop(); if (img) { setPreview(img); setMode("preview"); } };

  const retake = () => {
    setPreview(null); setResult(null); setUploadError(null);
    setMode("idle"); cam.stop();
    if (fileRef.current) fileRef.current.value = "";
  };

  const reverify = () => { setResult(null); setMode("preview"); };

  const confirm = async () => {
    setMode("validating"); setResult(null);
    const result = await validateIsGovernmentId(preview);
    setResult(result);
    if (result.isValid === false || result.isValid === null) { setMode("invalid"); return; }

    setMode("processing");
    const data = await performLiveOCR(preview);

    if (result.idNumber && !data.idNumber) data.idNumber = result.idNumber;
    setMode("done");
    setTimeout(() => onConfirm(preview, data), 700);
  };

  return (
    <div>
      <div className="reg-section-header">
        <SectionIcon><SvgIdCard size={24} /></SectionIcon>
        <div>
          <h3>Scan Your ID <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 400 }}>(Optional)</span></h3>
          <p>Take a photo or upload any valid government-issued ID. Data will be used to autofill your form.</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="reg-dropzone">
            <div className="reg-dropzone-icon-square"><SvgIdCard size={36} /></div>
            <p className="reg-dropzone-title">Position your ID within frame</p>
            <p className="reg-dropzone-subtitle">Accepted: PhilSys, Driver's License, Passport, Voter's ID, SSS, GSIS, PRC ID</p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <button type="button" className="reg-btn-primary" onClick={startCamera}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> Use Camera
              </button>
              <button type="button" className="reg-btn-ghost" onClick={() => fileRef.current?.click()}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgUpload /> Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            <UploadErrorMsg msg={uploadError} />
          </div>

          {/* Prominent Direct Skip Card Button */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onSkip}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.75rem",
                background: "#ffffff",
                border: "2px solid #317D89",
                borderRadius: "8px",
                color: "#317D89",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
              }}
            >
              Skip ID Upload &amp; Continue <SvgArrowRight />
            </button>
          </div>

          <div className="reg-info-box">
            <span style={{ color: "#317D89", flexShrink: 0 }}><SvgInfo size={17} /></span>
            <p>Your ID image is used only for identity verification and will be submitted as part of your registration for Barangay review.</p>
          </div>
        </div>
      )}

      {/* CAMERA */}
      {mode === "camera" && (
        <div className="reg-camera-wrap">
          {cam.error ? (
            <>
              <CameraError error={cam.error} fileRef={fileRef} />
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </>
          ) : (
            <div className="reg-camera-view">
              <video ref={cam.videoRef} className="reg-camera-video" playsInline muted />
              <div className="reg-camera-overlay">
                <div className="reg-camera-guide-id">
                  <div className="reg-camera-corner tl" />
                  <div className="reg-camera-corner tr" />
                  <div className="reg-camera-corner bl" />
                  <div className="reg-camera-corner br" />
                  <div className="reg-camera-guide-label">Align ID within frame</div>
                </div>
              </div>
            </div>
          )}
          {!cam.error && (
            <div className="reg-camera-actions">
              <button className="reg-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgArrowLeft /> Back
              </button>
              <button className="reg-btn-primary" onClick={capturePhoto}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> Capture
              </button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {mode === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="reg-id-preview-wrap">
            <img src={preview} alt="ID preview" />
          </div>
          <div className="reg-preview-notice">
            <SvgCheck size={15} /> Image captured — click Verify to check if this is a valid ID
          </div>
          <div className="reg-btn-group">
            <button className="reg-btn-ghost" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> Retake
            </button>
            <button className="reg-btn-primary" onClick={confirm}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgCheck /> Verify &amp; Extract
            </button>
          </div>
        </div>
      )}

      {/* VALIDATING */}
      {mode === "validating" && (
        <div className="reg-status-center">
          <div className="reg-status-icon loading"><SvgLoader /></div>
          <p className="reg-status-title">Verifying ID authenticity…</p>
          <p className="reg-status-sub">Checking that this is a valid government-issued ID</p>
        </div>
      )}

      {/* INVALID */}
      {mode === "invalid" && validationResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="reg-invalid-preview">
            <img src={preview} alt="Rejected ID" />
          </div>
          <div className={`reg-invalid-card ${validationResult.isValid === null ? "unavailable" : "rejected"}`}>
            <div className="reg-invalid-header">
              <div className={`reg-invalid-header-icon ${validationResult.isValid === null ? "unavailable" : "rejected"}`}>
                {validationResult.isValid === null
                  ? <SvgAlert size={22} />
                  : <SvgXCircle size={28} />}
              </div>
              <p className={`reg-invalid-title ${validationResult.isValid === null ? "unavailable" : "rejected"}`}>
                {validationResult.isValid === null ? "Verification Unavailable" : "Invalid ID Detected"}
              </p>
            </div>
            <p className="reg-invalid-reason">{validationResult.reason}</p>
            {validationResult.isValid === false && (
              <div className="reg-invalid-hint">
                Please upload a <strong>physical government-issued ID card</strong> — not a selfie or random photo.
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            {validationResult.isValid === null && (
              <button className="reg-btn-ghost" onClick={reverify}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgRefresh /> Re-verify Same Image
              </button>
            )}
            <button className="reg-btn-primary" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> Try Different Image
            </button>
            <button className="reg-btn-ghost" onClick={onSkip}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              Skip ID Upload →
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {mode === "processing" && (
        <div className="reg-status-center">
          <div className="reg-status-icon loading"><SvgLoader /></div>
          <p className="reg-status-title">Reading your ID…</p>
          <p className="reg-status-sub">Running live OCR, please wait a moment</p>
        </div>
      )}

      {/* DONE */}
      {mode === "done" && (
        <div className="reg-status-center">
          <div className="reg-status-icon success"><SvgCheckCircle size={40} color="#2db17b" /></div>
          <p className="reg-status-title">ID Verified — Data Extracted!</p>
          <p className="reg-status-sub">Autofilling your information now</p>
        </div>
      )}
    </div>
  );
}

// ─── Selfie Step ──────────────────────────────────────────────────────────────
function SelfieStep({ onConfirm }) {
  const [mode, setMode] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const cam = useCamera();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError("Please upload a valid image file (JPG, PNG, WEBP)."); if (fileRef.current) fileRef.current.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("Image file is too large. Maximum size is 10MB."); if (fileRef.current) fileRef.current.value = ""; return; }
    const reader = new FileReader();
    reader.onerror = () => { setUploadError("Failed to read the file. Please try another image."); if (fileRef.current) fileRef.current.value = ""; };
    reader.onload = (ev) => { setPreview(ev.target.result); setMode("preview"); setUploadError(null); };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => { setMode("camera"); await cam.start("user"); };
  const capturePhoto = () => { const img = cam.capture(); cam.stop(); if (img) { setPreview(img); setMode("preview"); } };
  const retake = () => { setPreview(null); setUploadError(null); setMode("idle"); cam.stop(); };

  return (
    <div>
      <div className="reg-section-header">
        <SectionIcon><SvgSelfie size={24} /></SectionIcon>
        <div>
          <h3>Take a Selfie</h3>
          <p>A clear photo of your face is required to verify your identity before registration.</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="reg-dropzone">
            <div className="reg-dropzone-icon-circle"><SvgPerson size={38} /></div>
            <p className="reg-dropzone-title">Face Verification Required</p>
            <p className="reg-dropzone-subtitle">Look directly at the camera with a neutral expression. Good lighting recommended.</p>
            <div className="reg-btn-group">
              <button className="reg-btn-primary" onClick={startCamera}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> Open Camera
              </button>

              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            <UploadErrorMsg msg={uploadError} />
          </div>
        </div>
      )}

      {/* CAMERA */}
      {mode === "camera" && (
        <div className="reg-camera-wrap">
          {cam.error ? (
            <>
              <CameraError error={cam.error} fileRef={fileRef} />
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </>
          ) : (
            <div className="reg-camera-view selfie">
              <video ref={cam.videoRef} className="reg-camera-video selfie" playsInline muted />
              <div className="reg-camera-overlay">
                <div className="reg-camera-guide-selfie" />
              </div>
              <div className="reg-camera-selfie-label">Position face within oval</div>
            </div>
          )}
          {!cam.error && (
            <div className="reg-camera-actions">
              <button className="reg-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgArrowLeft /> Back
              </button>
              <button className="reg-btn-primary" onClick={capturePhoto}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> Capture Selfie
              </button>
            </div>
          )}
        </div>
      )}

      {/* PREVIEW */}
      {mode === "preview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="reg-selfie-preview-center">
            <div className="reg-selfie-oval">
              <img src={preview} alt="Selfie" />
            </div>
          </div>
          <div className="reg-selfie-success">
            <SvgCheckCircle size={18} color="#1e8a5e" /> Selfie captured successfully
          </div>
          <div className="reg-btn-group">
            <button className="reg-btn-ghost" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> Retake
            </button>
            <button className="reg-btn-primary" onClick={() => onConfirm(preview)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgCheck /> Confirm Selfie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Registration Component ──────────────────────────────────────────────
export default function Registration({ onBack }) {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [idImage, setIdImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [autofilledFields, setAutofilledFields] = useState(new Set());
  const manuallyEdited = useRef(new Set());

  const [form, setForm] = useState({
    idNumber: "",
    firstName: "", middleName: "", lastName: "", suffix: "", religion: "",
    birthDate: "", age: "", birthPlace: "", sex: "Male", gender: "", genderOther: "", civilStatus: "",
    citizenship: "Filipino", contactNumber: "", email: "", residingSinceYear: "",
    houseNumber: "", street: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
    categories: [],
    pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
    educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
    totalMembers: "", householdClassification: "",
  });

  const total = STEPS.length;
  const progress = submitted ? 100 : (step / (total - 1)) * 100;
  const isPwd = form.categories.includes("PWD");

  const applyOcr = useCallback((data) => {
    const mapping = {
      firstName: "firstName", middleName: "middleName", lastName: "lastName",
      birthDate: "birthDate", idNumber: "idNumber",
      houseNumber: "houseNumber", street: "street", province: "province",
    };

    const filled = new Set();
    const updates = {};

    Object.entries(mapping).forEach(([ocrKey, formKey]) => {
      if (data[ocrKey] && !manuallyEdited.current.has(formKey)) {
        updates[formKey] = data[ocrKey];
        filled.add(formKey);
      }
    });

    if (data.birthDate && !manuallyEdited.current.has("birthDate")) {
      const dob = new Date(data.birthDate); const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
      updates.age = age > 0 ? String(age) : "";
    }

    setForm((prev) => ({ ...prev, ...updates }));
    setAutofilledFields((prev) => new Set([...prev, ...filled]));
  }, []);

  const set = (field) => (e) => {
    setErrorMsg("");
    manuallyEdited.current.add(field);
    setAutofilledFields((prev) => { const s = new Set(prev); s.delete(field); return s; });
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "birthDate" && e.target.value) {
      const dob = new Date(e.target.value); const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
      setForm((f) => ({ ...f, birthDate: e.target.value, age: age > 0 ? String(age) : "" }));
    }
  };

  const toggleCategory = (val) => setForm((f) => ({
    ...f,
    categories: f.categories.includes(val) ? f.categories.filter((c) => c !== val) : [...f.categories, val],
  }));

  const validateStep = () => {
    const missing = [];
    if (step === 1 && !selfieImage) { setErrorMsg("A selfie is required before proceeding."); return false; }
    if (step === 2) {
      if (!form.firstName.trim()) missing.push("First Name");
      if (!form.lastName.trim()) missing.push("Last Name");
      if (!form.birthDate) missing.push("Birth Date");
      if (!form.birthPlace.trim()) missing.push("Birth Place");
      if (!form.sex) missing.push("Sex");
      if (!form.civilStatus) missing.push("Civil Status");
      if (!form.citizenship.trim()) missing.push("Citizenship");
      if (!form.residingSinceYear) missing.push("Residing Since Year");
      if (!form.contactNumber.trim()) missing.push("Contact Number");
      else if (form.contactNumber.length < 10) missing.push("Valid Contact Number");
      if (!form.email.trim()) missing.push("Email Address");
      else if (!/\S+@\S+\.\S+/.test(form.email)) missing.push("Valid Email Address");
    }
    if (step === 3) {
      if (!form.houseNumber.trim()) missing.push("House / Unit Number");
      if (!form.street.trim()) missing.push("Street");
      if (!form.region.trim()) missing.push("Region");
      if (!form.province.trim()) missing.push("Province");
      if (!form.city.trim()) missing.push("City");
      if (!form.barangay.trim()) missing.push("Barangay");
    }
    if (step === 4 && isPwd) {
      if (!form.pwdStatus) missing.push("PWD Status");
      if (!form.disabilityType) missing.push("Disability Type");
    }
    if (step === 5) {
      if (!form.educationAttainment) missing.push("Highest Educational Attainment");
      if (!form.educationStatus) missing.push("Education Status");
      if (!form.employmentStatus) missing.push("Employment Status");
    }
    if (step === 6) {
      if (!form.totalMembers) missing.push("Number of Household Members");
      if (!form.householdClassification) missing.push("Household Classification");
    }
    if (step === 7 && !privacyAgreed) { setErrorMsg("You must agree to the Privacy Policy before submitting."); return false; }
    if (missing.length > 0) { setErrorMsg(`Please fill in required fields: ${missing.join(", ")}`); return false; }
    setErrorMsg(""); return true;
  };

  const goNext = async () => {
    if (!validateStep()) return;
    if (step < total - 1) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitRegistration({ ...form, idImage, selfieImage });
      const ref = "REF-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 99999)).padStart(5, "0");
      setRefNumber(ref);
      setSubmitted(true);

      setIdImage(null);
      setSelfieImage(null);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMsg("Failed to submit registration. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 0) { setErrorMsg(""); setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const handleCancel = () => {
    if (window.confirm("Are you sure you want to cancel? All entered data will be lost.")) { if (onBack) onBack(); }
  };

  const rv = (val) => val?.trim() || null;
  const af = (field) => autofilledFields.has(field);
  const formatDate = (d) => !d ? null : new Date(d + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const fullName = [form.firstName, form.middleName, form.lastName, form.suffix].filter(Boolean).join(" ") || null;
  const fullAddr = [form.houseNumber, form.street].filter(Boolean).join(" ") || null;

  function ReviewField({ label, value, full }) {
    return (
      <div className={`reg-review-field${full ? " full" : ""}`}>
        <div className="reg-review-field-label">{label}</div>
        <div className={`reg-review-field-value${!value ? " empty" : ""}`}>{value || "Not provided"}</div>
      </div>
    );
  }

  function ReviewSection({ icon, title, children }) {
    return (
      <div className="reg-review-section">
        <div className="reg-review-section-header">
          <span className="reg-review-section-icon">{icon}</span>
          <h4>{title}</h4>
        </div>
        <div className="reg-review-grid">{children}</div>
      </div>
    );
  }

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
              <div className="reg-stepper-line-fill" style={{ width: `${progress}%` }} />
            </div>
            {STEPS.map((s, i) => {
              const status = submitted || i < step ? "done" : i === step ? "active" : "";
              return (
                <div key={i} className={`reg-stepper-step ${status}`}>
                  <div className="reg-step-circle">
                    {status === "done"
                      ? <SvgCheck size={13} />
                      : <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{STEP_ICONS[i]}</span>}
                  </div>
                  <span className="reg-step-label">{s.label}</span>
                </div>
              );
            })}
          </div>

          <div className="reg-mobile-stepper">
            <div className="reg-mobile-stepper-top">
              <div className="reg-mobile-stepper-left">
                <div className="reg-mobile-step-badge">
                  {submitted ? <SvgCheck size={14} /> : step + 1}
                </div>
                <div className="reg-mobile-step-info">
                  <span className="reg-mobile-step-name">
                    {submitted ? "Submitted!" : STEPS[step].label}
                  </span>
                  <span className="reg-mobile-step-sub">
                    {submitted ? "Registration complete" : step < STEPS.length - 1 ? `Next: ${STEPS[step + 1].label}` : "Last step"}
                  </span>
                </div>
              </div>
              <span className="reg-mobile-step-count">
                {submitted ? `${STEPS.length}/${STEPS.length}` : `${step + 1} / ${STEPS.length}`}
              </span>
            </div>
            <div className="reg-mobile-progress-track">
              <div className="reg-mobile-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="reg-mobile-dots">
              {STEPS.map((_, i) => {
                const cls = submitted || i < step ? "done" : i === step ? "active" : "";
                return <div key={i} className={`reg-mobile-dot ${cls}`} />;
              })}
            </div>
          </div>
        </div>

        {/* CARD */}
        <div className="reg-card" key={submitted ? "success" : step}>
          {submitted ? (
            <div className="reg-success">
              <div className="reg-success-icon-wrap">
                <SvgCheckCircle size={64} color="#2db17b" />
              </div>
              <h2>Registration Submitted!</h2>
              <p>Your household registration request has been submitted and is now <strong>pending Barangay approval</strong>. You will receive a notification via email once reviewed.</p>
              <div className="reg-ref-badge">
                <span>Reference Number</span>
                <strong>{refNumber}</strong>
              </div>
              <button className="reg-btn-outline" onClick={onBack}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgArrowLeft /> Back to Home
              </button>
            </div>
          ) : (
            <>
              {/* STEP 0 — ID Scan */}
              {step === 0 && (
                <IdScanStep
                  onConfirm={(img, data) => { setIdImage(img); applyOcr(data); setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onSkip={() => { setIdImage(null); setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                />
              )}

              {/* STEP 1 — Selfie */}
              {step === 1 && (
                <SelfieStep onConfirm={(img) => { setSelfieImage(img); setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
              )}

              {/* STEP 2 — Personal Info */}
              {step === 2 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgPerson size={24} /></SectionIcon>
                    <div><h3>Personal Information</h3><p>Household Head — enter your basic personal details.</p></div>
                  </div>
                  {autofilledFields.size > 0 && (
                    <div className="reg-autofill-banner">
                      <SvgInfo size={16} />
                      <span>Some fields were autofilled from your ID scan. You may edit any autofilled field before submitting.</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <Field label="ID Number" hint="Optional or extracted from scanned ID. You may type it manually or update it.">
                      <InputField icon={SvgHashtag} type="text" placeholder="e.g. 1234-5678-9012-0000" value={form.idNumber} onChange={set("idNumber")} autofilled={af("idNumber")} />
                    </Field>
                    <div className="reg-form-grid cols-3">
                      <Field label="First Name" required><InputField icon={RegisIconUser} type="text" placeholder="Juan" value={form.firstName} onChange={set("firstName")} autofilled={af("firstName")} /></Field>
                      <Field label="Middle Name"><InputField icon={RegisIconUser} type="text" placeholder="Santos" value={form.middleName} onChange={set("middleName")} autofilled={af("middleName")} /></Field>
                      <Field label="Last Name" required><InputField icon={RegisIconUser} type="text" placeholder="Dela Cruz" value={form.lastName} onChange={set("lastName")} autofilled={af("lastName")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-3">
                      <Field label={<>Suffix <span style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional)</span></>}>
                        <SelectField icon={RegisIconUser} value={form.suffix} onChange={set("suffix")}>
                          <option value="">None</option>
                          <option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option>
                        </SelectField>
                      </Field>
                      <Field label="Religion"><InputField icon={RegisIconReligion} type="text" placeholder="Roman Catholic" value={form.religion} onChange={set("religion")} /></Field>
                      <Field label="Civil Status" required>
                        <SelectField icon={RegisIconHeart} value={form.civilStatus} onChange={set("civilStatus")}>
                          <option value="">Select status</option>
                          <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-3">
                      <Field label="Birth Date" required><InputField icon={RegisIconCalendar} type="date" value={form.birthDate} onChange={set("birthDate")} autofilled={af("birthDate")} /></Field>
                      <Field label="Age"><InputField icon={RegisIconClock} type="number" placeholder="Auto-computed" value={form.age} readOnly /></Field>
                      <Field label="Birth Place" required><InputField icon={RegisIconPin} type="text" placeholder="Valenzuela City" value={form.birthPlace} onChange={set("birthPlace")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Sex" required>
                        <div className="reg-radio-group">
                          {["Male", "Female"].map((v) => (
                            <label key={v} className="reg-radio-option">
                              <input type="radio" name="sex" value={v} checked={form.sex === v} onChange={set("sex")} />
                              <span className="reg-radio-label"><span className="reg-radio-dot" />{v}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                      <Field label="Gender">
                        <SelectField value={form.gender} onChange={set("gender")}>
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
                    <div className="reg-form-grid cols-2">
                      <Field label="Citizenship" required><InputField icon={IconFlag} type="text" placeholder="Filipino" value={form.citizenship} onChange={set("citizenship")} /></Field>
                      <Field label="Residing Since (Year)" required><InputField icon={RegisIconCalendar} type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={form.residingSinceYear} onChange={set("residingSinceYear")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Contact Number" required><InputField icon={RegisIconPhone} type="tel" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={set("contactNumber")} /></Field>
                      <Field label="Email Address" required hint="We'll send your approval notification here."><InputField icon={RegisIconMail} type="email" placeholder="yourname@email.com" value={form.email} onChange={set("email")} /></Field>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 — Address */}
              {step === 3 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgMapPin size={24} /></SectionIcon>
                    <div><h3>Address Information</h3><p>Enter your complete home address.</p></div>
                  </div>
                  {(af("houseNumber") || af("street") || af("province")) && (
                    <div className="reg-autofill-banner">
                      <SvgInfo size={16} />
                      <span>Address fields were partially autofilled from your ID. Please verify and complete if needed.</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label="House / Unit Number" required><InputField icon={RegisIconHome} type="text" placeholder="123" value={form.houseNumber} onChange={set("houseNumber")} autofilled={af("houseNumber")} /></Field>
                      <Field label="Street" required><InputField icon={RegisIconHome} type="text" placeholder="Malanday Street" value={form.street} onChange={set("street")} autofilled={af("street")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Region" required><InputField icon={RegisIconGlobe} type="text" value={form.region} readOnly /></Field>
                      <Field label="Province" required><InputField icon={RegisIconPin} type="text" placeholder="Bulacan" value={form.province} onChange={set("province")} autofilled={af("province")} /></Field>
                      <Field label="City / Municipality" required><InputField icon={RegisIconPin} type="text" value={form.city} readOnly /></Field>
                      <Field label="Barangay" required><InputField icon={RegisIconPin} type="text" value={form.barangay} readOnly /></Field>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 — Category */}
              {step === 4 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgTag size={24} /></SectionIcon>
                    <div><h3>Category Classification</h3><p>Select all categories that apply to you.</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="reg-checkbox-grid">
                      {["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"].map((cat) => (
                        <label key={cat} className="reg-check-option">
                          <input type="checkbox" checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)} />
                          <span className="reg-check-label">
                            <span className="reg-check-box">{form.categories.includes(cat) && <SvgCheck size={12} />}</span>
                            {cat}
                          </span>
                        </label>
                      ))}
                    </div>
                    {isPwd && (
                      <div className="reg-sub-fields">
                        <div className={`reg-sub-fields-title reg-pwd-title`}>
                          <SvgWheelchair size={16} /> PWD Additional Information
                        </div>
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
                </div>
              )}

              {/* STEP 5 — Education */}
              {step === 5 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgGradCap size={24} /></SectionIcon>
                    <div><h3>Education &amp; Employment</h3><p>Provide your educational background and employment details.</p></div>
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
                          <option>In School</option><option>Out of School Youth (OSY)</option>
                          <option>Out of School Children (OSC)</option><option>Graduate</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label="Occupation"><InputField icon={RegisIconBriefcase} type="text" placeholder="Teacher, Engineer..." value={form.occupation} onChange={set("occupation")} /></Field>
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

              {/* STEP 6 — Household */}
              {step === 6 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgHome size={24} /></SectionIcon>
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
                      <span style={{ color: "#317D89", flexShrink: 0 }}><SvgInfo size={17} /></span>
                      <p>After your registration is approved, you will be prompted to <strong>add individual household members</strong> using your assigned Household ID.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7 — Review */}
              {step === 7 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgClipboard size={24} /></SectionIcon>
                    <div><h3>Review &amp; Submit</h3><p>Please verify all information before submitting.</p></div>
                  </div>
                  <div className="reg-review-thumbnails">
                    <div className="reg-review-thumb">
                      <span className="reg-review-thumb-label">ID Photo</span>
                      {idImage ? (
                        <img src={idImage} alt="ID" className="reg-review-thumb-id" />
                      ) : (
                        <div style={{ padding: "0.8rem", fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>
                          Skipped (No ID uploaded)
                        </div>
                      )}
                    </div>
                    {selfieImage && (
                      <div className="reg-review-thumb">
                        <span className="reg-review-thumb-label">Selfie</span>
                        <img src={selfieImage} alt="Selfie" className="reg-review-thumb-selfie" />
                      </div>
                    )}
                  </div>

                  <ReviewSection icon={<SvgPerson size={18} />} title="Personal Information">
                    <ReviewField label="ID Number" value={rv(form.idNumber)} full />
                    <ReviewField label="Full Name" value={rv(fullName)} />
                    <ReviewField label="Birth Date" value={formatDate(form.birthDate)} />
                    <ReviewField label="Age" value={rv(form.age)} />
                    <ReviewField label="Birth Place" value={rv(form.birthPlace)} />
                    <ReviewField label="Sex" value={form.sex} />
                    <ReviewField label="Gender" value={form.gender === "Others" ? (rv(form.genderOther) || "Others") : rv(form.gender)} />
                    <ReviewField label="Civil Status" value={rv(form.civilStatus)} />
                    <ReviewField label="Religion" value={rv(form.religion)} />
                    <ReviewField label="Citizenship" value={rv(form.citizenship)} />
                    <ReviewField label="Residing Since" value={rv(form.residingSinceYear)} />
                    <ReviewField label="Contact Number" value={rv(form.contactNumber)} />
                    <ReviewField label="Email Address" value={rv(form.email)} full />
                  </ReviewSection>

                  <ReviewSection icon={<SvgMapPin size={18} />} title="Address">
                    <ReviewField label="House / Street" value={rv(fullAddr)} />
                    <ReviewField label="Barangay" value={rv(form.barangay)} />
                    <ReviewField label="City / Municipality" value={rv(form.city)} />
                    <ReviewField label="Province" value={rv(form.province)} />
                    <ReviewField label="Region" value={rv(form.region)} full />
                  </ReviewSection>

                  <ReviewSection icon={<SvgTag size={18} />} title="Category">
                    {form.categories.length === 0 ? (
                      <ReviewField label="Classifications" value={null} full />
                    ) : (
                      <div className="reg-review-field full">
                        <div className="reg-review-field-label">Classifications</div>
                        <div className="reg-review-field-value">
                          {form.categories.map((c) => <span key={c} className="reg-category-tag">{c}</span>)}
                        </div>
                      </div>
                    )}
                    {isPwd && <>
                      <ReviewField label="PWD Status" value={rv(form.pwdStatus)} />
                      <ReviewField label="Disability Type" value={form.disabilityType === "Others" ? (rv(form.disabilityTypeOther) || "Others") : rv(form.disabilityType)} />
                    </>}
                  </ReviewSection>

                  <ReviewSection icon={<SvgGradCap size={18} />} title="Education & Employment">
                    <ReviewField label="Highest Attainment" value={rv(form.educationAttainment)} />
                    <ReviewField label="Education Status" value={rv(form.educationStatus)} />
                    <ReviewField label="Occupation" value={rv(form.occupation)} />
                    <ReviewField label="Employment Status" value={rv(form.employmentStatus)} />
                  </ReviewSection>

                  <ReviewSection icon={<SvgHome size={18} />} title="Household Details">
                    <ReviewField label="No. of Members" value={rv(form.totalMembers)} />
                    <ReviewField label="Classification" value={rv(form.householdClassification)} />
                  </ReviewSection>

                  {/* Privacy */}
                  <div className="reg-privacy-section">
                    <div className="reg-privacy-header">
                      <SvgShield size={22} />
                      <h4>Privacy Policy &amp; Consent</h4>
                    </div>
                    <p className="reg-privacy-text">
                      Your personal information will be collected and processed in accordance with the{" "}
                      <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong>. The data you provide will be used strictly for system-related purposes such as account management and access to services.
                    </p>
                    <button type="button" className="reg-privacy-link" onClick={() => setShowPrivacyModal(true)}>
                      Read Full Privacy Policy →
                    </button>
                    <label className="reg-privacy-check-label">
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => { setPrivacyAgreed(e.target.checked); setErrorMsg(""); }}
                        style={{ marginTop: "3px", accentColor: "#317D89", width: "16px", height: "16px", flexShrink: 0 }}
                      />
                      <span className="reg-privacy-check-text">
                        I have read and agree to the <strong>Privacy Policy</strong> and the <strong>Data Privacy Act of 2012 (RA 10173)</strong>.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER ACTIONS - Always visible across all steps */}
        {!submitted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "800px", margin: "1.5rem auto 0 auto" }}>
            {errorMsg && (
              <div className="reg-footer-error">
                <SvgAlert size={16} /> {errorMsg}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <button type="button" className="reg-btn-cancel" onClick={handleCancel}>Cancel</button>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {step > 0 && (
                  <button type="button" className="reg-btn-ghost" onClick={goBack}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <SvgArrowLeft /> Back
                  </button>
                )}

                {step > 0 && step < total - 1 && (
                  <button type="button" className="reg-btn-primary" onClick={goNext}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    Continue <SvgArrowRight />
                  </button>
                )}

                {step === total - 1 && (
                  <button type="button" className="reg-btn-success" onClick={goNext}
                    disabled={!privacyAgreed || isSubmitting}
                    style={{
                      opacity: (privacyAgreed && !isSubmitting) ? 1 : 0.5,
                      cursor: (privacyAgreed && !isSubmitting) ? "pointer" : "not-allowed",
                      display: "inline-flex", alignItems: "center", gap: "0.5rem",
                    }}>
                    {isSubmitting
                      ? <><SvgLoader size={16} /> Submitting…</>
                      : <><SvgSend size={16} /> Confirm &amp; Submit</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRIVACY MODAL */}
      {showPrivacyModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
          onClick={(e) => e.target === e.currentTarget && setShowPrivacyModal(false)}>
          <div style={{ background: "#fff", borderRadius: "16px", maxWidth: "640px", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="reg-privacy-header" style={{ marginBottom: 0 }}>
                <SvgShield size={22} />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e3a5f" }}>Privacy Policy</h3>
              </div>
              <button onClick={() => setShowPrivacyModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#6b7280", lineHeight: 1 }}>
                &times;
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "1.5rem", flex: 1, fontSize: "0.875rem", color: "#374151" }}>
              <p style={{ marginBottom: "1rem" }}>This system complies with the <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its implementing rules and regulations.</p>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>Information Collected</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>Personal details (e.g., name, contact information)</li>
                <li>Account and profile data</li>
                <li>ID image and selfie photo for identity verification</li>
              </ul>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>Purpose of Collection</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>To manage and verify user accounts</li>
                <li>To provide access to system services</li>
                <li>To send relevant notifications and updates</li>
              </ul>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>Data Protection</h4>
              <p style={{ marginBottom: "1rem" }}>Appropriate organizational, physical, and technical security measures are implemented to protect personal data against unauthorized access, alteration, disclosure, or destruction.</p>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>Your Rights Under RA 10173</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>Right to be informed</li><li>Right to access</li><li>Right to object</li>
                <li>Right to correct</li><li>Right to erasure or blocking</li>
              </ul>
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setPrivacyAgreed(true); setShowPrivacyModal(false); }}
                style={{ background: "#317D89", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem 1.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCheck size={15} /> I Agree &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
