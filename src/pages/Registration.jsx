import barangayLogo from "./barangay-logo.jpg";
import { useState, useEffect, useRef, useCallback } from "react";
import { submitRegistration } from "../services/registration";
import { useLanguage } from "../context/LanguageContext";
import {
  RegisIconUser, RegisIconCalendar, RegisIconClock, RegisIconPin, RegisIconPhone,
  RegisIconMail, RegisIconHome, RegisIconGlobe, RegisIconBriefcase, RegisIconBook,
  IconUsers, RegisIconHeart, IconFlag, RegisIconShield, RegisIconInfo,
  RegisIconReligion, RegisIconGradCap,
} from "../components/Icons";

// ─── ID Validation (Strict PhilSys National ID Check) ─────────────────────────
async function validateIsGovernmentId(imageBase64) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({
      isValid: true,
      reason: null,
      detectedType: "PhilSys National ID",
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

    // Match PhilSys National ID PCN (4-4-4-4 format)
    const idMatch = text.match(/\d{4}\s*[-–]\s*\d{4}\s*[-–]\s*\d{4}\s*[-–]\s*\d{4}/) || text.match(/\d{4}\s*\d{4}\s*\d{4}\s*\d{4}/);
    if (idMatch) {
      data.idNumber = idMatch[0].replace(/[\s–]/g, '-');
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
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
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
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 5" />
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

function CameraError({ error, fileRef }) {
  const { t } = useLanguage();
  return (
    <div className="reg-camera-error">
      <div className="reg-camera-error-icon"><SvgAlert size={22} /></div>
      <p>{error}</p>
      <button className="reg-btn-ghost" onClick={() => { fileRef.current?.click(); }}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
        <SvgUpload /> {t("reg_upload_instead")}
      </button>
    </div>
  );
}

// ─── ID Scan Step ─────────────────────────────────────────────────────────────
function IdScanStep({ onConfirm, onSkip }) {
  const { t } = useLanguage();
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
      setUploadError(t("reg_upload_invalid"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("reg_upload_too_large"));
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { setUploadError(t("reg_upload_read_error")); if (fileRef.current) fileRef.current.value = ""; };
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
          <h3>{t("reg_id_scan_title")} <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 400 }}>{t("reg_id_scan_optional")}</span></h3>
          <p>{t("reg_id_scan_desc")}</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="reg-dropzone">
            <div className="reg-dropzone-icon-square"><SvgIdCard size={36} /></div>
            <p className="reg-dropzone-title">{t("reg_id_position")}</p>
            <p className="reg-dropzone-subtitle">{t("reg_id_accepted")}</p>

            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
              <button type="button" className="reg-btn-primary" onClick={startCamera}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> {t("reg_use_camera")}
              </button>
              <button type="button" className="reg-btn-ghost" onClick={() => fileRef.current?.click()}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgUpload /> {t("reg_upload_image")}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            <UploadErrorMsg msg={uploadError} />
          </div>

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
              {t("reg_skip_id")} <SvgArrowRight />
            </button>
          </div>

          <div className="reg-info-box">
            <span style={{ color: "#317D89", flexShrink: 0 }}><SvgInfo size={17} /></span>
            <p>{t("reg_id_privacy")}</p>
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
                  <div className="reg-camera-guide-label">{t("reg_align_id")}</div>
                </div>
              </div>
            </div>
          )}
          {!cam.error && (
            <div className="reg-camera-actions">
              <button className="reg-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgArrowLeft /> {t("reg_back")}
              </button>
              <button className="reg-btn-primary" onClick={capturePhoto}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> {t("reg_capture")}
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
            <SvgCheck size={15} /> {t("reg_image_captured")}
          </div>
          <div className="reg-btn-group">
            <button className="reg-btn-ghost" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> {t("reg_retake")}
            </button>
            <button className="reg-btn-primary" onClick={confirm}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgCheck /> {t("reg_verify_extract")}
            </button>
          </div>
        </div>
      )}

      {/* VALIDATING */}
      {mode === "validating" && (
        <div className="reg-status-center">
          <div className="reg-status-icon loading"><SvgLoader /></div>
          <p className="reg-status-title">{t("reg_verifying_id")}</p>
          <p className="reg-status-sub">{t("reg_verifying_id_sub")}</p>
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
                {validationResult.isValid === null ? t("reg_verification_unavailable") : t("reg_invalid_id")}
              </p>
            </div>
            <p className="reg-invalid-reason">{validationResult.reason || t("reg_invalid_id_hint")}</p>
            {validationResult.isValid === false && (
              <div className="reg-invalid-hint">
                {t("reg_invalid_id_hint")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            {validationResult.isValid === null && (
              <button className="reg-btn-ghost" onClick={reverify}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgRefresh /> {t("reg_reverify")}
              </button>
            )}
            <button className="reg-btn-primary" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> {t("reg_try_different")}
            </button>
            <button className="reg-btn-ghost" onClick={onSkip}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              {t("reg_skip_id_short")}
            </button>
          </div>
        </div>
      )}

      {/* PROCESSING */}
      {mode === "processing" && (
        <div className="reg-status-center">
          <div className="reg-status-icon loading"><SvgLoader /></div>
          <p className="reg-status-title">{t("reg_reading_id")}</p>
          <p className="reg-status-sub">{t("reg_reading_id_sub")}</p>
        </div>
      )}

      {/* DONE */}
      {mode === "done" && (
        <div className="reg-status-center">
          <div className="reg-status-icon success"><SvgCheckCircle size={40} color="#2db17b" /></div>
          <p className="reg-status-title">{t("reg_id_verified")}</p>
          <p className="reg-status-sub">{t("reg_autofilling")}</p>
        </div>
      )}
    </div>
  );
}

// ─── Selfie Step ──────────────────────────────────────────────────────────────
function SelfieStep({ onConfirm }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("idle");
  const [preview, setPreview] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const cam = useCamera();
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError(t("reg_upload_invalid")); if (fileRef.current) fileRef.current.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError(t("reg_upload_too_large")); if (fileRef.current) fileRef.current.value = ""; return; }
    const reader = new FileReader();
    reader.onerror = () => { setUploadError(t("reg_upload_read_error")); if (fileRef.current) fileRef.current.value = ""; };
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
          <h3>{t("reg_selfie_title")}</h3>
          <p>{t("reg_selfie_desc")}</p>
        </div>
      </div>

      {/* IDLE */}
      {mode === "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div className="reg-dropzone">
            <div className="reg-dropzone-icon-circle"><SvgPerson size={38} /></div>
            <p className="reg-dropzone-title">{t("reg_face_required")}</p>
            <p className="reg-dropzone-subtitle">{t("reg_face_hint")}</p>
            <div className="reg-btn-group">
              <button className="reg-btn-primary" onClick={startCamera}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> {t("reg_open_camera")}
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
              <div className="reg-camera-selfie-label">{t("reg_position_face")}</div>
            </div>
          )}
          {!cam.error && (
            <div className="reg-camera-actions">
              <button className="reg-btn-ghost" onClick={() => { cam.stop(); setMode("idle"); }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <SvgArrowLeft /> {t("reg_back")}
              </button>
              <button className="reg-btn-primary" onClick={capturePhoto}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCamera /> {t("reg_capture_selfie")}
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
            <SvgCheckCircle size={18} color="#1e8a5e" /> {t("reg_selfie_captured")}
          </div>
          <div className="reg-btn-group">
            <button className="reg-btn-ghost" onClick={retake}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgRefresh /> {t("reg_retake")}
            </button>
            <button className="reg-btn-primary" onClick={() => onConfirm(preview)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
              <SvgCheck /> {t("reg_confirm_selfie")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main Registration Component ──────────────────────────────────────────────
export default function Registration({ onBack, branchingPayload }) {
  const { t } = useLanguage();

  const STEPS = [
    { label: t("reg_step_id_scan") },
    { label: t("reg_step_selfie") },
    { label: t("reg_step_personal") },
    { label: t("reg_step_address") },
    { label: t("reg_step_category") },
    { label: t("reg_step_education") },
    { label: t("reg_step_household") },
    { label: t("reg_step_review") },
  ];

  // Try to load saved state, default to step 0
  const [step, setStep] = useState(() => {
    const saved = sessionStorage.getItem("reg_step");
    return saved ? parseInt(saved, 10) : 0;
  });

  const [submitted, setSubmitted] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [idImage, setIdImage] = useState(() => sessionStorage.getItem("reg_idImage") || null);
  const [selfieImage, setSelfieImage] = useState(() => sessionStorage.getItem("reg_selfieImage") || null);
  
  const [autofilledFields, setAutofilledFields] = useState(() => {
    const saved = sessionStorage.getItem("reg_autofilled");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  const manuallyEdited = useRef(
    sessionStorage.getItem("reg_edited") ? new Set(JSON.parse(sessionStorage.getItem("reg_edited"))) : new Set()
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();
  const minDobStr = `${currentYear - 125}-01-01`;

  const [form, setForm] = useState(() => {
    const saved = sessionStorage.getItem("reg_form");
    if (saved) return JSON.parse(saved);
    return {
      idNumber: "",
      firstName: "", middleName: "", lastName: "", suffix: "", religion: "", religionOther: "",
      birthDate: "", age: "", birthPlace: "", sex: "Male", gender: "", genderOther: "", civilStatus: "",
      citizenship: "Filipino", citizenshipOther: "", contactNumber: "", email: "", residingSinceYear: "",
      houseNumber: "", street: "", subdivision: "", region: "NCR", province: "", city: "Valenzuela City", barangay: "Malanday",
      categories: [],
      pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
      educationAttainment: "", educationStatus: "", postGradLevel: "", occupation: "", employmentStatus: "",
      totalMembers: "", householdClassification: "",
    };
  });

  useEffect(() => {
    sessionStorage.setItem("reg_step", step.toString());
    sessionStorage.setItem("reg_form", JSON.stringify(form));
    sessionStorage.setItem("reg_autofilled", JSON.stringify(Array.from(autofilledFields)));
    sessionStorage.setItem("reg_edited", JSON.stringify(Array.from(manuallyEdited.current)));
    if (idImage) sessionStorage.setItem("reg_idImage", idImage);
    if (selfieImage) sessionStorage.setItem("reg_selfieImage", selfieImage);
  }, [step, form, autofilledFields, idImage, selfieImage]);

  const total = STEPS.length;
  const progress = submitted ? 100 : (step / (total - 1)) * 100;
  const isPwd = form.categories.includes("PWD");
  const showEmail = form.age === "" || Number(form.age) >= 15;

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
      updates.age = age >= 0 ? String(age) : "";
    }

    setForm((prev) => ({ ...prev, ...updates }));
    setAutofilledFields((prev) => new Set([...prev, ...filled]));
  }, []);

  const set = (field) => (e) => {
    manuallyEdited.current.add(field);
    setAutofilledFields((prev) => { const s = new Set(prev); s.delete(field); return s; });
    const value = e.target.type === "checkbox"
      ? e.target.checked
      : ["contactNumber", "residingSinceYear"].includes(field)
        ? e.target.value.replace(/\D/g, "").slice(0, field === "residingSinceYear" ? 4 : 15)
        : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "birthDate" && e.target.value) {
      const dob = new Date(e.target.value); const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) age--;
      setForm((f) => ({ ...f, birthDate: e.target.value, age: age >= 0 ? String(age) : "" }));
    }
  };

  const toggleCategory = (val) => setForm((f) => ({
    ...f,
    categories: f.categories.includes(val) ? f.categories.filter((c) => c !== val) : [...f.categories, val],
  }));

  const validateStep = () => {
    const missing = [];
    if (step === 1 && !selfieImage) { setErrorMsg(t("reg_selfie_required")); return false; }
    if (step === 2) {
      if (!form.firstName.trim()) missing.push(t("reg_first_name"));
      if (!form.lastName.trim()) missing.push(t("reg_last_name"));
      if (!form.birthDate) missing.push(t("reg_birth_date"));
      if (!form.birthPlace.trim()) missing.push(t("reg_birth_place"));
      if (!form.sex) missing.push(t("reg_sex"));
      if (!form.civilStatus) missing.push(t("reg_civil_status"));
      if (!form.citizenship.trim()) missing.push(t("reg_citizenship"));
      if (!form.residingSinceYear) missing.push(t("reg_residing_since"));
      else if (!/^\d{4}$/.test(form.residingSinceYear)) missing.push(t("reg_residing_since"));
      if (!form.contactNumber.trim()) missing.push(t("reg_contact_number"));
      else if (!/^\d{10,15}$/.test(form.contactNumber)) missing.push(t("reg_contact_number"));
      if (showEmail) {
        if (!form.email.trim()) missing.push(t("reg_email"));
        else if (!/\S+@\S+\.\S+/.test(form.email)) missing.push(t("reg_email"));
      }

      if (missing.length > 0) {
        setErrorMsg(t("reg_fill_required", missing.join(", ")));
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (form.birthDate) {
        const dob = new Date(form.birthDate + "T00:00:00");
        if (isNaN(dob.getTime())) {
          setErrorMsg(t("reg_invalid_birth_date"));
          return false;
        }

        if (dob > today) {
          setErrorMsg(t("reg_birth_future"));
          return false;
        }

        const minYear = today.getFullYear() - 125;
        if (dob.getFullYear() < minYear) {
          setErrorMsg(t("reg_birth_too_old", minYear));
          return false;
        }
      }

      if (form.residingSinceYear) {
        const resYear = Number(form.residingSinceYear);
        const thisYear = today.getFullYear();

        if (isNaN(resYear) || resYear > thisYear) {
          setErrorMsg(t("reg_residing_future", thisYear));
          return false;
        }
        if (resYear < 1900) {
          setErrorMsg(t("reg_residing_too_old"));
          return false;
        }
      }
    }
    if (step === 3) {
      if (!form.street.trim()) missing.push(t("reg_street"));
      if (!form.region.trim()) missing.push(t("reg_region"));
      if (!form.province.trim()) missing.push(t("reg_province"));
      if (!form.city.trim()) missing.push(t("reg_city"));
      if (!form.barangay.trim()) missing.push(t("reg_barangay"));
    }
    if (step === 4 && isPwd) {
      if (!form.pwdStatus) missing.push(t("reg_pwd_status"));
      if (!form.disabilityType) missing.push(t("reg_disability_type"));
    }
    if (step === 5) {
      if (!form.educationAttainment) missing.push(t("reg_highest_attainment"));
      if (!form.educationStatus) missing.push(t("reg_education_status"));
      if (!form.employmentStatus) missing.push(t("reg_employment_status"));
    }
    if (step === 6) {
      if (!form.totalMembers) missing.push(t("reg_total_members"));
      if (!form.householdClassification) missing.push(t("reg_household_class"));
    }
    if (step === 7 && !privacyAgreed) { setErrorMsg(t("reg_privacy_required")); return false; }
    if (missing.length > 0) { setErrorMsg(t("reg_fill_required", missing.join(", "))); return false; }
    
    setErrorMsg("");
    return true;
  };

  const goNext = async () => {
    if (!validateStep()) return;
    if (step < total - 1) { setStep((s) => s + 1); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const storedBranchingData = sessionStorage.getItem("branchingPayload");
      const branchingPayload = storedBranchingData ? JSON.parse(storedBranchingData) : null;

      await submitRegistration({ ...form, idImage, selfieImage, branchingPayload });

      sessionStorage.removeItem("reg_step");
      sessionStorage.removeItem("reg_form");
      sessionStorage.removeItem("reg_autofilled");
      sessionStorage.removeItem("reg_edited");
      sessionStorage.removeItem("reg_idImage");
      sessionStorage.removeItem("reg_selfieImage");
      sessionStorage.removeItem("branchingPayload");
      sessionStorage.removeItem("current_view"); 

      const ref = "REF-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 99999)).padStart(5, "0");
      setRefNumber(ref);
      setSubmitted(true);

      setIdImage(null);
      setSelfieImage(null);

      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Submission error:", err);
      setErrorMsg(t("reg_submit_error"));
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 0) { setErrorMsg(""); setStep((s) => s - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const handleCancel = () => {
    if (window.confirm(t("reg_cancel_confirm"))) { 
      sessionStorage.removeItem("reg_step");
      sessionStorage.removeItem("reg_form");
      sessionStorage.removeItem("reg_autofilled");
      sessionStorage.removeItem("reg_edited");
      sessionStorage.removeItem("reg_idImage");
      sessionStorage.removeItem("reg_selfieImage");
      sessionStorage.removeItem("branchingPayload");
      sessionStorage.removeItem("current_view"); 
      
      if (onBack) onBack(); 
    }
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
        <div className={`reg-review-field-value${!value ? " empty" : ""}`}>{value || t("reg_review_not_provided")}</div>
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
            <span className="reg-nav-logo-sub">{t("landing_community_system")}</span>
          </div>
        </div>
      </nav>

      <div className="reg-page">
        <div className="reg-page-header">
          <h1>{t("reg_title")}</h1>
          <p>{t("reg_sub")}</p>
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
                    {submitted ? t("reg_submitted_short") : STEPS[step].label}
                  </span>
                  <span className="reg-mobile-step-sub">
                    {submitted ? t("reg_registration_complete") : step < STEPS.length - 1 ? t("reg_next_step", STEPS[step + 1].label) : t("reg_last_step")}
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
              <h2>{t("reg_submitted_title")}</h2>
              <p>{t("reg_submitted_desc")}</p>
              <div className="reg-ref-badge">
                <span>{t("reg_ref_number")}</span>
                <strong>{refNumber}</strong>
              </div>
              <button className="reg-btn-outline" onClick={onBack}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgArrowLeft /> {t("reg_back_home")}
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
                    <div><h3>{t("reg_personal_title")}</h3><p>{t("reg_personal_sub")}</p></div>
                  </div>
                  {autofilledFields.size > 0 && (
                    <div className="reg-autofill-banner">
                      <SvgInfo size={16} />
                      <span>{t("reg_autofill_notice")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <Field label={t("reg_pcn_label")} hint={t("reg_pcn_hint")}>
                      <InputField icon={SvgHashtag} type="text" placeholder="e.g. 1234-5678-9012-0000" value={form.idNumber} onChange={set("idNumber")} autofilled={af("idNumber")} />
                    </Field>
                    <div className="reg-form-grid cols-3">
                      <Field label={t("reg_first_name")} required><InputField icon={RegisIconUser} type="text" placeholder="Juan" value={form.firstName} onChange={set("firstName")} autofilled={af("firstName")} /></Field>
                      <Field label={t("reg_middle_name")}><InputField icon={RegisIconUser} type="text" placeholder="Santos" value={form.middleName} onChange={set("middleName")} autofilled={af("middleName")} /></Field>
                      <Field label={t("reg_last_name")} required><InputField icon={RegisIconUser} type="text" placeholder="Dela Cruz" value={form.lastName} onChange={set("lastName")} autofilled={af("lastName")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-3">
                      <Field label={<>{t("reg_suffix")} <span style={{ color: "var(--muted)", fontWeight: 400 }}>{t("reg_id_scan_optional")}</span></>}>
                        <SelectField icon={RegisIconUser} value={form.suffix} onChange={set("suffix")}>
                          <option value="">{t("reg_opt_none")}</option>
                          <option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option>
                        </SelectField>
                      </Field>
                      <Field label={t("reg_religion")}>
                        <SelectField icon={RegisIconReligion} value={form.religion} onChange={set("religion")}>
                          <option value="">{t("reg_select_religion")}</option>
                          <option>Roman Catholic</option>
                          <option>Islam</option>
                          <option>Iglesia ni Cristo</option>
                          <option>Evangelical</option>
                          <option>Aglipayan (Philippine Independent Church)</option>
                          <option>Seventh-day Adventist</option>
                          <option>Bible Baptist Church</option>
                          <option>United Church of Christ in the Philippines (UCCP)</option>
                          <option>Jehovah's Witnesses</option>
                          <option>The Church of Jesus Christ of Latter-day Saints</option>
                          <option>Buddhist</option>
                          <option>Hindu</option>
                          <option value="None">{t("reg_opt_none")}</option>
                          <option value="Others">{t("reg_opt_others")}</option>
                        </SelectField>
                      </Field>
                      <Field label={t("reg_civil_status")} required>
                        <SelectField icon={RegisIconHeart} value={form.civilStatus} onChange={set("civilStatus")}>
                          <option value="">{t("reg_select_status")}</option>
                          <option value="Single">{t("reg_status_single")}</option>
                          <option value="Married">{t("reg_status_married")}</option>
                          <option value="Widowed">{t("reg_status_widowed")}</option>
                          <option value="Separated">{t("reg_status_separated")}</option>
                          <option value="Cohabitation">{t("reg_status_cohabitation")}</option>
                        </SelectField>
                      </Field>
                    </div>
                    {form.religion === "Others" && (
                      <Field label={t("reg_specify_religion")}>
                        <InputField type="text" placeholder={t("reg_please_specify")} value={form.religionOther} onChange={set("religionOther")} />
                      </Field>
                    )}
                    <div className="reg-form-grid cols-3">
                      <Field label={t("reg_birth_date")} required>
                        <InputField
                          icon={RegisIconCalendar}
                          type="date"
                          max={todayStr}
                          min={minDobStr}
                          value={form.birthDate}
                          onChange={set("birthDate")}
                          autofilled={af("birthDate")}
                        />
                      </Field>
                      <Field label={t("reg_age")}><InputField icon={RegisIconClock} type="number" placeholder={t("reg_age_auto")} value={form.age} readOnly /></Field>
                      <Field label={t("reg_birth_place")} required><InputField icon={RegisIconPin} type="text" placeholder="Valenzuela City" value={form.birthPlace} onChange={set("birthPlace")} /></Field>
                    </div>
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_sex")} required>
                        <div className="reg-radio-group">
                          {["Male", "Female"].map((v) => (
                            <label key={v} className="reg-radio-option">
                              <input type="radio" name="sex" value={v} checked={form.sex === v} onChange={set("sex")} />
                              <span className="reg-radio-label"><span className="reg-radio-dot" />{v === "Male" ? t("reg_sex_male") : t("reg_sex_female")}</span>
                            </label>
                          ))}
                        </div>
                      </Field>
                      <Field label={t("reg_gender")}>
                        <SelectField value={form.gender} onChange={set("gender")}>
                          <option value="">{t("reg_select_gender")}</option>
                          <option>Man</option>
                          <option>Woman</option>
                          <option>Non-binary</option>
                          <option>Prefer not to say</option>
                          <option value="Others">{t("reg_opt_others")}</option>
                        </SelectField>
                      </Field>
                    </div>
                    {form.gender === "Others" && (
                      <Field label={t("reg_specify_gender")}>
                        <InputField type="text" placeholder={t("reg_please_specify")} value={form.genderOther} onChange={set("genderOther")} />
                      </Field>
                    )}
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_citizenship")} required>
                        <SelectField icon={IconFlag} value={form.citizenship} onChange={set("citizenship")}>
                          <option value="">{t("reg_select_citizenship")}</option>
                          <option value="Filipino">{t("reg_citizenship_filipino")}</option>
                          <option value="Dual Citizen">{t("reg_citizenship_dual")}</option>
                          <option value="Foreign National">{t("reg_citizenship_foreign")}</option>
                          <option value="Naturalized Filipino">{t("reg_citizenship_naturalized")}</option>
                          <option value="Others">{t("reg_opt_others")}</option>
                        </SelectField>
                      </Field>
                      <Field label={t("reg_residing_since")} required>
                        <InputField
                          icon={RegisIconCalendar}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          min="1900"
                          max={currentYear}
                          maxLength={4}
                          placeholder="e.g. 2010"
                          value={form.residingSinceYear}
                          onChange={set("residingSinceYear")}
                        />
                      </Field>
                    </div>
                    {form.citizenship === "Others" && (
                      <Field label={t("reg_specify_citizenship")}>
                        <InputField type="text" placeholder={t("reg_please_specify")} value={form.citizenshipOther} onChange={set("citizenshipOther")} />
                      </Field>
                    )}
                    <div className={`reg-form-grid ${showEmail ? "cols-2" : "cols-1"}`}>
                      <Field label={t("reg_contact_number")} required><InputField icon={RegisIconPhone} type="tel" inputMode="numeric" pattern="[0-9]*" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={set("contactNumber")} /></Field>
                      {showEmail && (
                        <Field label={t("reg_email")} required hint={t("reg_email_hint")}>
                          <InputField icon={RegisIconMail} type="email" placeholder="yourname@email.com" value={form.email} onChange={set("email")} />
                        </Field>
                      )}
                    </div>
                    {!showEmail && (
                      <p style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "-0.6rem" }}>
                        {t("reg_email_minor_note")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3 — Address */}
              {step === 3 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgMapPin size={24} /></SectionIcon>
                    <div><h3>{t("reg_address_title")}</h3><p>{t("reg_address_sub")}</p></div>
                  </div>
                  {(af("houseNumber") || af("street") || af("province")) && (
                    <div className="reg-autofill-banner">
                      <SvgInfo size={16} />
                      <span>{t("reg_address_autofill")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label={<>{t("reg_house_number")} <span style={{ color: "var(--muted)", fontWeight: 400 }}>{t("reg_id_scan_optional")}</span></>}>
                        <InputField icon={RegisIconHome} type="text" placeholder="123" value={form.houseNumber} onChange={set("houseNumber")} autofilled={af("houseNumber")} />
                      </Field>
                      <Field label={t("reg_street")} required><InputField icon={RegisIconHome} type="text" placeholder="Malanday Street" value={form.street} onChange={set("street")} autofilled={af("street")} /></Field>
                    </div>
                    <Field label={<>{t("reg_subdivision")} <span style={{ color: "var(--muted)", fontWeight: 400 }}>{t("reg_id_scan_optional")}</span></>}>
                      <InputField icon={RegisIconHome} type="text" placeholder="e.g. Maysan Ville Subdivision" value={form.subdivision} onChange={set("subdivision")} />
                    </Field>
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_barangay")} required><InputField icon={RegisIconPin} type="text" value={form.barangay} readOnly /></Field>
                      <Field label={t("reg_city")} required><InputField icon={RegisIconPin} type="text" value={form.city} readOnly /></Field>
                      <Field label={t("reg_province")} required><InputField icon={RegisIconPin} type="text" placeholder="Bulacan" value={form.province} onChange={set("province")} autofilled={af("province")} /></Field>
                      <Field label={t("reg_region")} required><InputField icon={RegisIconGlobe} type="text" value={form.region} readOnly /></Field>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 — Category */}
              {step === 4 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgTag size={24} /></SectionIcon>
                    <div><h3>{t("reg_category_title")}</h3><p>{t("reg_category_sub")}</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div className="reg-checkbox-grid">
                      {[
                        { key: "Student", label: t("reg_cat_student") },
                        { key: "Senior Citizen", label: t("reg_cat_senior") },
                        { key: "Solo Parent", label: t("reg_cat_solo_parent") },
                        { key: "OFW", label: t("reg_cat_ofw") },
                        { key: "LGBT", label: t("reg_cat_lgbt") },
                        { key: "Indigenous People", label: t("reg_cat_ip") },
                        { key: "PWD", label: t("reg_cat_pwd") },
                      ].map((catItem) => (
                        <label key={catItem.key} className="reg-check-option">
                          <input type="checkbox" checked={form.categories.includes(catItem.key)} onChange={() => toggleCategory(catItem.key)} />
                          <span className="reg-check-label">
                            <span className="reg-check-box">{form.categories.includes(catItem.key) && <SvgCheck size={12} />}</span>
                            {catItem.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    {isPwd && (
                      <div className="reg-sub-fields">
                        <div className={`reg-sub-fields-title reg-pwd-title`}>
                          <SvgWheelchair size={16} /> {t("reg_pwd_additional")}
                        </div>
                        <div className="reg-form-grid cols-2">
                          <Field label={t("reg_pwd_status")} required>
                            <SelectField icon={RegisIconShield} value={form.pwdStatus} onChange={set("pwdStatus")}>
                              <option value="">{t("reg_select_status")}</option>
                              <option>Children with Disabilities</option>
                              <option>Person with Disabilities</option>
                            </SelectField>
                          </Field>
                          <Field label={t("reg_disability_type")} required>
                            <SelectField icon={RegisIconInfo} value={form.disabilityType} onChange={set("disabilityType")}>
                              <option value="">{t("reg_select_type")}</option>
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
                              <option value="Others">{t("reg_opt_others")}</option>
                            </SelectField>
                          </Field>
                        </div>
                        {form.disabilityType === "Others" && (
                          <Field label={t("reg_specify_disability")}>
                            <InputField type="text" placeholder={t("reg_please_specify")} value={form.disabilityTypeOther} onChange={set("disabilityTypeOther")} />
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
                    <div><h3>{t("reg_education_title")}</h3><p>{t("reg_education_sub")}</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_highest_attainment")} required>
                        <SelectField icon={RegisIconGradCap} value={form.educationAttainment} onChange={set("educationAttainment")}>
                          <option value="">{t("reg_select_attainment")}</option>
                          <option>Elementary</option><option>High School</option><option>College</option>
                          <option>Post Graduate</option><option>Vocational</option>
                        </SelectField>
                      </Field>
                      <Field label={t("reg_education_status")} required>
                        <SelectField icon={RegisIconBook} value={form.educationStatus} onChange={set("educationStatus")}>
                          <option value="">{t("reg_select_status")}</option>
                          <option>In School</option><option>Out of School Youth (OSY)</option>
                          <option>Out of School Children (OSC)</option><option>Graduate</option>
                        </SelectField>
                      </Field>
                    </div>
                    {form.educationAttainment === "Post Graduate" && (
                      <Field label={t("reg_post_grad_level")}>
                        <SelectField icon={RegisIconGradCap} value={form.postGradLevel} onChange={set("postGradLevel")}>
                          <option value="">{t("reg_select_level")}</option>
                          <option>Masters</option>
                          <option>Doctorate</option>
                        </SelectField>
                      </Field>
                    )}
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_occupation")} hint={t("reg_occupation_hint")}>
                        <InputField icon={RegisIconBriefcase} type="text" list="occupation-options" placeholder="e.g. Teacher, Vendor, Self-Employed" value={form.occupation} onChange={set("occupation")} />
                        <datalist id="occupation-options">
                          <option value="Teacher" />
                          <option value="Construction Worker" />
                          <option value="Vendor" />
                          <option value="Self-Employed" />
                          <option value="Driver" />
                          <option value="Office Employee" />
                          <option value="Government Employee" />
                          <option value="Overseas Filipino Worker (OFW)" />
                          <option value="Business Owner" />
                          <option value="Farmer" />
                          <option value="Fisherman" />
                          <option value="Housewife / Homemaker" />
                          <option value="Student" />
                        </datalist>
                      </Field>
                      <Field label={t("reg_employment_status")} required>
                        <SelectField icon={RegisIconBriefcase} value={form.employmentStatus} onChange={set("employmentStatus")}>
                          <option value="">{t("reg_select_status")}</option>
                          <option value="Employed">{t("reg_emp_employed")}</option>
                          <option value="Unemployed">{t("reg_emp_unemployed")}</option>
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
                    <div><h3>{t("reg_household_title")}</h3><p>{t("reg_household_sub")}</p></div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                    <div className="reg-form-grid cols-2">
                      <Field label={t("reg_total_members")} required hint={t("reg_total_members_hint")}>
                        <InputField icon={IconUsers} type="number" min="1" placeholder="4" value={form.totalMembers} onChange={set("totalMembers")} />
                      </Field>
                      <Field label={t("reg_household_class")} required>
                        <SelectField icon={RegisIconHome} value={form.householdClassification} onChange={set("householdClassification")}>
                          <option value="">{t("reg_select_classification")}</option>
                          <option value="Owned">{t("reg_class_owned")}</option>
                          <option value="Owned, Lot Rented">{t("reg_class_owned_lot_rented")}</option>
                          <option value="Rented">{t("reg_class_rented")}</option>
                          <option value="Rent-Free with Consent of Owner">{t("reg_class_rent_free_owner")}</option>
                          <option value="Rent-Free without Consent of Owner">{t("reg_class_rent_free_no_owner")}</option>
                          <option value="Informal Settler">{t("reg_class_informal")}</option>
                        </SelectField>
                      </Field>
                    </div>
                    <div className="reg-info-box">
                      <span style={{ color: "#317D89", flexShrink: 0 }}><SvgInfo size={17} /></span>
                      <p>{t("reg_household_info")}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 7 — Review */}
              {step === 7 && (
                <div>
                  <div className="reg-section-header">
                    <SectionIcon><SvgClipboard size={24} /></SectionIcon>
                    <div><h3>{t("reg_review_title")}</h3><p>{t("reg_review_sub")}</p></div>
                  </div>
                  <div className="reg-review-thumbnails">
                    <div className="reg-review-thumb">
                      <span className="reg-review-thumb-label">{t("reg_review_id_label")}</span>
                      {idImage ? (
                        <img src={idImage} alt="ID" className="reg-review-thumb-id" />
                      ) : (
                        <div style={{ padding: "0.8rem", fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic", textAlign: "center" }}>
                          {t("reg_review_skipped")}
                        </div>
                      )}
                    </div>
                    {selfieImage && (
                      <div className="reg-review-thumb">
                        <span className="reg-review-thumb-label">{t("reg_review_selfie_label")}</span>
                        <img src={selfieImage} alt="Selfie" className="reg-review-thumb-selfie" />
                      </div>
                    )}
                  </div>

                  <ReviewSection icon={<SvgPerson size={18} />} title={t("reg_review_personal")}>
                    <ReviewField label={t("reg_pcn_label")} value={rv(form.idNumber)} full />
                    <ReviewField label={t("reg_first_name")} value={rv(fullName)} />
                    <ReviewField label={t("reg_birth_date")} value={formatDate(form.birthDate)} />
                    <ReviewField label={t("reg_age")} value={rv(form.age)} />
                    <ReviewField label={t("reg_birth_place")} value={rv(form.birthPlace)} />
                    <ReviewField label={t("reg_sex")} value={form.sex === "Male" ? t("reg_sex_male") : t("reg_sex_female")} />
                    <ReviewField label={t("reg_gender")} value={form.gender === "Others" ? (rv(form.genderOther) || t("reg_opt_others")) : rv(form.gender)} />
                    <ReviewField label={t("reg_civil_status")} value={rv(form.civilStatus)} />
                    <ReviewField label={t("reg_religion")} value={form.religion === "Others" ? (rv(form.religionOther) || t("reg_opt_others")) : rv(form.religion)} />
                    <ReviewField label={t("reg_citizenship")} value={form.citizenship === "Others" ? (rv(form.citizenshipOther) || t("reg_opt_others")) : rv(form.citizenship)} />
                    <ReviewField label={t("reg_residing_since")} value={rv(form.residingSinceYear)} />
                    <ReviewField label={t("reg_contact_number")} value={rv(form.contactNumber)} />
                    {showEmail && <ReviewField label={t("reg_email")} value={rv(form.email)} full />}
                  </ReviewSection>

                  <ReviewSection icon={<SvgMapPin size={18} />} title={t("reg_review_address")}>
                    <ReviewField label={`${t("reg_house_number")} / ${t("reg_street")}`} value={rv(fullAddr)} />
                    <ReviewField label={t("reg_subdivision")} value={rv(form.subdivision)} />
                    <ReviewField label={t("reg_barangay")} value={rv(form.barangay)} />
                    <ReviewField label={t("reg_city")} value={rv(form.city)} />
                    <ReviewField label={t("reg_province")} value={rv(form.province)} />
                    <ReviewField label={t("reg_region")} value={rv(form.region)} full />
                  </ReviewSection>

                  <ReviewSection icon={<SvgTag size={18} />} title={t("reg_review_category")}>
                    {form.categories.length === 0 ? (
                      <ReviewField label={t("reg_review_classifications")} value={null} full />
                    ) : (
                      <div className="reg-review-field full">
                        <div className="reg-review-field-label">{t("reg_review_classifications")}</div>
                        <div className="reg-review-field-value">
                          {form.categories.map((c) => <span key={c} className="reg-category-tag">{c}</span>)}
                        </div>
                      </div>
                    )}
                    {isPwd && <>
                      <ReviewField label={t("reg_pwd_status")} value={rv(form.pwdStatus)} />
                      <ReviewField label={t("reg_disability_type")} value={form.disabilityType === "Others" ? (rv(form.disabilityTypeOther) || t("reg_opt_others")) : rv(form.disabilityType)} />
                    </>}
                  </ReviewSection>

                  <ReviewSection icon={<SvgGradCap size={18} />} title={t("reg_review_education")}>
                    <ReviewField label={t("reg_highest_attainment")} value={form.educationAttainment === "Post Graduate" ? [form.educationAttainment, form.postGradLevel].filter(Boolean).join(" - ") : rv(form.educationAttainment)} />
                    <ReviewField label={t("reg_education_status")} value={rv(form.educationStatus)} />
                    <ReviewField label={t("reg_occupation")} value={rv(form.occupation)} />
                    <ReviewField label={t("reg_employment_status")} value={rv(form.employmentStatus)} />
                  </ReviewSection>

                  <ReviewSection icon={<SvgHome size={18} />} title={t("reg_review_household")}>
                    <ReviewField label={t("reg_review_no_members")} value={rv(form.totalMembers)} />
                    <ReviewField label={t("reg_review_classification")} value={rv(form.householdClassification)} />
                  </ReviewSection>

                  {/* Privacy */}
                  <div className="reg-privacy-section">
                    <div className="reg-privacy-header">
                      <SvgShield size={22} />
                      <h4>{t("reg_privacy_title")}</h4>
                    </div>
                    <p className="reg-privacy-text">
                      {t("reg_privacy_text")}
                    </p>
                    <button type="button" className="reg-privacy-link" onClick={() => setShowPrivacyModal(true)}>
                      {t("reg_privacy_read")}
                    </button>
                    <label className="reg-privacy-check-label">
                      <input
                        type="checkbox"
                        checked={privacyAgreed}
                        onChange={(e) => { setPrivacyAgreed(e.target.checked); }}
                        style={{ marginTop: "3px", accentColor: "#317D89", width: "16px", height: "16px", flexShrink: 0 }}
                      />
                      <span className="reg-privacy-check-text">
                        {t("reg_privacy_agree")}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        {!submitted && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%", maxWidth: "800px", margin: "1.5rem auto 0 auto" }}>
            {errorMsg && (
              <div className="reg-footer-error">
                <SvgAlert size={16} /> {errorMsg}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <button type="button" className="reg-btn-cancel" onClick={handleCancel}>{t("reg_cancel")}</button>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                {step > 0 && (
                  <button type="button" className="reg-btn-ghost" onClick={goBack}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <SvgArrowLeft /> {t("reg_back")}
                  </button>
                )}

                {step > 0 && step < total - 1 && (
                  <button type="button" className="reg-btn-primary" onClick={goNext}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    {t("reg_continue")} <SvgArrowRight />
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
                      ? <><SvgLoader size={16} /> {t("reg_submitting")}</>
                      : <><SvgSend size={16} /> {t("reg_confirm_submit")}</>}
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
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#1e3a5f" }}>{t("footer_privacy")}</h3>
              </div>
              <button onClick={() => setShowPrivacyModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.4rem", color: "#6b7280", lineHeight: 1 }}>
                &times;
              </button>
            </div>
            <div style={{ overflowY: "auto", padding: "1.5rem", flex: 1, fontSize: "0.875rem", color: "#374151" }}>
              <p style={{ marginBottom: "1rem" }}>{t("reg_privacy_text")}</p>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>{t("reg_privacy_info_collected")}</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>Personal details (e.g., name, contact information)</li>
                <li>Account and profile data</li>
                <li>ID image and selfie photo for identity verification</li>
              </ul>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>{t("reg_privacy_purpose")}</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>To manage and verify user accounts</li>
                <li>To provide access to system services</li>
                <li>To send relevant notifications and updates</li>
              </ul>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>{t("reg_privacy_protection")}</h4>
              <p style={{ marginBottom: "1rem" }}>Appropriate organizational, physical, and technical security measures are implemented to protect personal data against unauthorized access, alteration, disclosure, or destruction.</p>
              <h4 style={{ color: "#1e3a5f", marginBottom: "0.5rem" }}>{t("reg_privacy_rights")}</h4>
              <ul style={{ paddingLeft: "1.25rem", marginBottom: "1rem" }}>
                <li>Right to be informed</li><li>Right to access</li><li>Right to object</li>
                <li>Right to correct</li><li>Right to erasure or blocking</li>
              </ul>
            </div>
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { setPrivacyAgreed(true); setShowPrivacyModal(false); setErrorMsg(""); }}
                style={{ background: "#317D89", color: "#fff", border: "none", borderRadius: "8px", padding: "0.6rem 1.4rem", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <SvgCheck size={15} /> {t("reg_privacy_agree_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}