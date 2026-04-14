import { useState, useEffect, useRef, useCallback } from "react";
import { processQRScan } from "../services/qrScanner";

// ── Load jsQR from CDN (no new npm dep needed) ──────────────────────────────
const loadJsQR = () =>
  new Promise((resolve, reject) => {
    if (window.jsQR) { resolve(window.jsQR); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => reject(new Error("Failed to load jsQR"));
    document.head.appendChild(s);
  });

// ── Icons ────────────────────────────────────────────────────────────────────
const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const ScanCheckCircleIcon = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ScanShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ScanInfoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ScanXIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ScanPhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

// ── Verified Popup ────────────────────────────────────────────────────────────
function VerifiedPopup({ service, onProceed, onClose }) {
  return (
    <div className="scan-popup-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="scan-popup">
        <button className="scan-popup__close" onClick={onClose}><ScanXIcon /></button>
        <div className="scan-popup__icon-wrap">
          <ScanCheckCircleIcon />
        </div>
        <div className="scan-popup__badge">Visit Verified</div>
        <h3 className="scan-popup__title">Scan Successful!</h3>
        <p className="scan-popup__sub">
          You may now submit feedback for <strong>{service.fullName}</strong>.
        </p>
        <div
          className="scan-popup__service-tag"
          style={{ background: service.bg, border: `1.5px solid ${service.border}`, color: service.color }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {service.icon} {service.name}
          </span>
        </div>
        <button className="scan-popup__btn" onClick={onProceed}>
          Proceed to Feedback Form →
        </button>
        <p className="scan-popup__note">
          <ScanInfoIcon /> Feedback is only accessible after a verified scan.
        </p>
      </div>
    </div>
  );
}

// ── Desktop Block (shown on non-mobile) ───────────────────────────────────────
function DesktopBlock() {
  return (
    <div className="scan-desktop-block">
      <div className="scan-desktop-block__card">
        <div className="scan-desktop-block__phone-frame">
          <div className="scan-desktop-block__phone-notch" />
          <div className="scan-desktop-block__phone-screen">
            <div className="scan-desktop-block__phone-cam" />
            <div className="scan-desktop-block__phone-lines">
              <span /><span /><span />
            </div>
          </div>
        </div>
        <h2 className="scan-desktop-block__title">Mobile-Only Feature</h2>
        <p className="scan-desktop-block__desc">
          The QR Scanner is designed for smartphones. Open this page on your mobile device to scan Barangay QR codes and submit feedback.
        </p>
        <div className="scan-desktop-block__chips">
          <span className="scan-desktop-block__chip"><ScanPhoneIcon /> Android</span>
          <span className="scan-desktop-block__chip"><ScanPhoneIcon /> iOS</span>
        </div>
        <div className="scan-desktop-block__note">
          <ScanShieldIcon />
          <span>Requires camera access on your device</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScanPage({
  onNavigate,
  userName = "",
  householdID = "",
  userID = "",
}) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 769);
  // idle | requesting | active | error
  const [camState, setCamState] = useState("idle");
  const [camError, setCamError] = useState("");
  const [flash, setFlash] = useState(false);
  const [verifiedService, setVerifiedService] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const jsQRRef = useRef(null);
  const scanning = useRef(false);

  // ── Resize listener ──
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      stopCamera();
    };
  }, []);

  // ── Camera control ──
  const stopCamera = useCallback(() => {
    scanning.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
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
          : `Could not access camera: ${err.message}`
      );
      setCamState("error");
    }
  };

  // ── Scan loop ──
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

  const onQRDetected = async (data) => {
    scanning.current = false;
    try {
      setCamState("requesting"); // visually pause/indicate loading optionally
      const result = await processQRScan({ qrUrl: data, userID, householdID });

      if (result.isValid) {
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
          stopCamera();
          setCamState("idle");
          // Re-map the generic info to work with the VerifiedPopup and later Feedback Form
          setVerifiedService({
            id: result.data.serviceID || result.data.programID || result.data.facilityID || result.data.documentID,
            name: result.data.serviceName,
            category: result.data.category,
            fullName: result.data.serviceName,
            bg: "#eff6ff",
            border: "#bfdbfe",
            color: "#1d4ed8",
            icon: "✅"
          });
          setShowPopup(true);
        }, 750);
      } else {
        // Validation conceptually failed logic block (though the server error should be thrown)
        scanning.current = true;
        tick();
      }
    } catch (e) {
      console.error("QR Validation failed:", e);
      setCamError(e.message || "QR Validation failed.");
      setCamState("error");

    }
  };

  // ── Desktop gate ──
  if (!isMobile) return <DesktopBlock />;

  // ── Mobile render ──
  return (
    <main className="scan-page" style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

      {/* ── Camera Viewfinder ───────────────────────────────────────── */}
      <div className="scan-camera-section" style={{ position: "relative", height: "50dvh", overflow: "hidden", flexShrink: 0 }}>
        {/* Live video feed */}
        <video
          ref={videoRef}
          className="scan-viewfinder"
          playsInline
          muted
          autoPlay
        />
        {/* Hidden canvas for frame capture */}
        <canvas ref={canvasRef} className="scan-hidden-canvas" />

        {/* Dark overlay with transparent finder cutout */}
        <div className={`scan-overlay${flash ? " scan-overlay--flash" : ""}`} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>

          {/* ── Top band ── */}
          <div className="scan-overlay__band">
            <div className="scan-topbar">
              <span className="scan-topbar__eyebrow">QR Feedback Scanner</span>
              {camState === "active" && (
                <span className="scan-live-badge">
                  <span className="scan-live-dot" /> LIVE
                </span>
              )}
            </div>
          </div>

          {/* ── Middle row: side bands + finder box ── */}
          <div className="scan-overlay__row" style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div className="scan-overlay__side" />

            <div className={`scan-finder${flash ? " scan-finder--hit" : ""}`}>
              {/* Corner brackets */}
              <span className="scan-corner scan-corner--tl" />
              <span className="scan-corner scan-corner--tr" />
              <span className="scan-corner scan-corner--bl" />
              <span className="scan-corner scan-corner--br" />

              {/* Scanning line — only when camera is active */}
              {camState === "active" && !flash && (
                <span className="scan-line" />
              )}

              {/* Success flash */}
              {flash && (
                <div className="scan-found-overlay">
                  <ScanCheckCircleIcon />
                </div>
              )}
            </div>

            <div className="scan-overlay__side" />
          </div>

          {/* ── Bottom band with controls ── */}
          <div className="scan-overlay__bottom">
            {camState === "idle" && (
              <>
                <p className="scan-overlay__hint">
                  Tap below to open your camera
                </p>
                <button className="scan-start-btn" onClick={startCamera}>
                  <CameraIcon /> Open Camera
                </button>
              </>
            )}

            {camState === "requesting" && (
              <>
                <span className="scan-spinner" />
                <p className="scan-overlay__hint">Requesting camera access…</p>
              </>
            )}

            {camState === "active" && (
              <p className="scan-overlay__hint scan-overlay__hint--active">
                Align the QR code within the frame
              </p>
            )}

            {camState === "error" && (
              <div className="scan-error-block">
                <p className="scan-error-msg">{camError}</p>
                <button className="scan-retry-btn" onClick={startCamera}>
                  Try Again
                </button>
              </div>
            )}
          </div>

        </div>{/* /scan-overlay */}
      </div>{/* /scan-camera-section */}

      {/* ── Verified Popup ──────────────────────────────────────────── */}
      {showPopup && verifiedService && (
        <VerifiedPopup
          service={verifiedService}
          onProceed={() => {
            setShowPopup(false);
            onNavigate?.("feedback", { service: verifiedService });
          }}
          onClose={() => setShowPopup(false)}
        />
      )}
    </main>
  );
}