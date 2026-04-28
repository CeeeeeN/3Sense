import React, { useState, useEffect } from "react";
import { Manage_IconQR, IconDownload, IconConfirmCheck, SirenIcon, BriefcaseIcon, InfoIcon } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../../firebase/firebase";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { ROLE_PERMISSIONS } from "../../services/permissions";

import ServicePeaceOrder from "./ServicePeaceOrder";
import ServiceLivelihood from "./ServiceLivelihood";
import ServiceBswd from "./ServiceBswd";

// ── Today's date as YYYY-MM-DD (used for QR token) ───────────────────────────
const getTodayStr = () => new Date().toISOString().split("T")[0];

export default function ManageServices() {
  const [activeDashboard, setActiveDashboard]     = useState(null);
  const [selectedServiceQR, setSelectedServiceQR] = useState(null);
  const [userRole, setUserRole]                   = useState(null);

  // ── Real-time stats ──────────────────────────────────────────────────────────
  const [peaceStats, setPeaceStats]           = useState({ total: 0, byStatus: {}, latest: null });
  const [livelihoodStats, setLivelihoodStats] = useState({ total: 0, byStatus: {}, latest: null });
  const [bswdStats, setBswdStats]             = useState({ total: 0, byStatus: {}, latest: null });

  const computeStats = (snapshot, dateField = "submittedAt") => {
    const docs     = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    const byStatus = {};
    let latest     = null;

    docs.forEach((doc) => {
      const s = doc.status || "unknown";
      byStatus[s] = (byStatus[s] || 0) + 1;
      const ts = doc[dateField];
      if (ts) {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        if (!latest || d > latest) latest = d;
      }
    });

    return {
      total:    docs.length,
      byStatus,
      latest:   latest ? latest.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—",
    };
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q    = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) setUserRole(snap.docs[0].data().role || "Standard Admin");
      }
    });

    const unsubPeace      = onSnapshot(collection(db, "incidentReports"),        (snap) => setPeaceStats(computeStats(snap, "submittedAt")));
    const unsubLivelihood = onSnapshot(collection(db, "livelihoodRegistrations"), (snap) => setLivelihoodStats(computeStats(snap, "submittedAt")));
    const unsubBswd       = onSnapshot(collection(db, "bswdReports"),             (snap) => setBswdStats(computeStats(snap, "submittedAt")));

    return () => { unsubscribeAuth(); unsubPeace(); unsubLivelihood(); unsubBswd(); };
  }, []);

  // ── QR Generation ─────────────────────────────────────────────────────────────
  // QR URL includes:
  //   dt   = today's date (YYYY-MM-DD) — rotates every 24 hours
  //   type = "service"
  // No startDate/endDate for services — they are ongoing (no expiry beyond the daily token)
  const handleGenerateQR = (serviceName, category) => {
    const today = getTodayStr();
    const base  = "https://3-sense.vercel.app/";
    const url =
      `${base}?serviceId=${encodeURIComponent(serviceName.toLowerCase())}` +
      `&serviceName=${encodeURIComponent(serviceName)}` +
      `&category=${encodeURIComponent(category)}` +
      `&type=service` +
      `&dt=${today}`;
    setSelectedServiceQR({ name: serviceName, qrValue: url });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData    = new XMLSerializer().serializeToString(svgElement);
    const canvas     = document.createElement("canvas");
    const ctx        = canvas.getContext("2d");
    const img        = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link    = document.createElement("a");
      link.href     = canvas.toDataURL("image/png");
      link.download = `3Sense-QR-${selectedServiceQR.name}-${getTodayStr()}.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // ── Sub-page routing ─────────────────────────────────────────────────────────
  if (activeDashboard === "peace")      return <ServicePeaceOrder onBack={() => setActiveDashboard(null)} />;
  if (activeDashboard === "livelihood") return <ServiceLivelihood onBack={() => setActiveDashboard(null)} />;
  if (activeDashboard === "bswd")       return <ServiceBswd onBack={() => setActiveDashboard(null)} />;

  // ── Stat bar component ───────────────────────────────────────────────────────
  const StatBar = ({ stats }) => {
    const statusColors = {
      pending:   { bg: "#fef3c7", text: "#92400e" },
      received:  { bg: "#fef3c7", text: "#92400e" },
      responded: { bg: "#e0e7ff", text: "#3730a3" },
      resolved:  { bg: "#dcfce7", text: "#166534" },
      approved:  { bg: "#dcfce7", text: "#166534" },
      rejected:  { bg: "#fee2e2", text: "#991b1b" },
      analyzed:  { bg: "#e0e7ff", text: "#3730a3" },
    };
    return (
      <div style={{ marginTop: "12px", padding: "10px 12px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
          <span style={{ fontSize: "0.78rem", color: "#6b7280" }}>Total entries</span>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{stats.total}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "6px" }}>
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const c = statusColors[status.toLowerCase()] || { bg: "#f3f4f6", text: "#4b5563" };
            return (
              <span key={status} style={{ fontSize: "0.72rem", padding: "2px 7px", borderRadius: "10px", background: c.bg, color: c.text, fontWeight: 600 }}>
                {status}: {count}
              </span>
            );
          })}
        </div>
        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Latest: {stats.latest}</div>
      </div>
    );
  };

  const allowedServices   = ROLE_PERMISSIONS[userRole]?.services || [];
  const hasWorkspaceServices = allowedServices.some((s) => ["Peace & Order", "Livelihood", "BSWD"].includes(s));
  const hasInfoServices      = allowedServices.some((s) => ["BADAC", "VAWC", "BOSCA"].includes(s));

  // ── Shared QR modal (reused for all services) ────────────────────────────────
  const QRModal = () => (
    <div className="as-modal-overlay">
      <div className="as-modal-content" style={{ maxWidth: "450px" }}>
        <div className="as-modal-header">
          <h2>QR Code Generated</h2>
          <button className="as-modal-close" onClick={() => setSelectedServiceQR(null)}>&times;</button>
        </div>
        <div className="as-modal-body" style={{ textAlign: "center" }}>
          <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
          <h3>{selectedServiceQR.name}</h3>

          {/* Daily rotation notice */}
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.82rem", color: "#92400e", textAlign: "left" }}>
            ⚠️ <strong>This QR is valid for today only ({getTodayStr()}).</strong> A new QR must be generated each day.
          </div>

          <p className="as-modal-desc">
            Residents can scan this code to access the {selectedServiceQR.name} page.
          </p>
          <div className="as-qr-holder" style={{ margin: "20px auto", display: "flex", justifyContent: "center" }}>
            <QRCodeSVG id="as-qr-svg" value={selectedServiceQR.qrValue} size={150} level={"H"} includeMargin={true} />
          </div>
          <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: "100%" }}>
            <IconDownload /> Download QR (PNG)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="as-container">

        {/* ── Workspace Services ── */}
        {hasWorkspaceServices && (
          <>
            <div className="as-header-section">
              <div className="as-title-wrap">
                <h1>Services Hub</h1>
                <p className="as-subtitle">Adaptive workspaces for handling different barangay services and departments</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>

              {/* Peace & Order */}
              {allowedServices.includes("Peace & Order") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#eff6ff", color: "#1d4ed8", padding: "12px", borderRadius: "12px" }}><SirenIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Peace &amp; Order</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Interactive Form &amp; Inbox</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>Monitor incoming incident reports, dispatch barangay tanods, and manage blotters.</p>
                  <StatBar stats={peaceStats} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("peace")}>Workspace &rarr;</button>
                    <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("Peace and Order", "Services")}>
                      <Manage_IconQR /> Generate QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* Livelihood */}
              {allowedServices.includes("Livelihood") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#f0fdf4", color: "#15803d", padding: "12px", borderRadius: "12px" }}><BriefcaseIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Livelihood</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Registration System</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>Approve or reject community registrations for training programs and assistance.</p>
                  <StatBar stats={livelihoodStats} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("livelihood")}>Workspace &rarr;</button>
                    <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("Livelihood", "Services")}>
                      <Manage_IconQR /> Generate QR Code
                    </button>
                  </div>
                </div>
              )}

              {/* BSWD */}
              {allowedServices.includes("BSWD") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#f0fdf2", color: "#115e59", padding: "12px", borderRadius: "12px" }}><SirenIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>BSWD</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Social Welfare</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>Manage reports of displaced persons and community tips regarding resident welfare.</p>
                  <StatBar stats={bswdStats} />
                  <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("bswd")}>Workspace &rarr;</button>
                    <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("BSWD", "Services")}>
                      <Manage_IconQR /> Generate QR Code
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Informational Services ── */}
        {hasInfoServices && (
          <>
            <div className="as-header-section" style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
              <div className="as-title-wrap">
                <h2>Informational Services</h2>
                <p className="as-subtitle">Standard content guides mapping to external references or rules.</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {[
                { name: "BADAC", color: { bg: "#fef3c7", text: "#b45309" }, desc: "Barangay Anti-Drug Abuse Council information and rehabilitation procedures." },
                { name: "VAWC",  color: { bg: "#fce7f3", text: "#be185d" }, desc: "Violence Against Women and their Children guides, support numbers, and help." },
                { name: "BOSCA", color: { bg: "#e0e7ff", text: "#4338ca" }, desc: "Barangay Office of Senior Citizens Affairs rights, applications, and guidelines." },
              ]
                .filter((svc) => allowedServices.includes(svc.name))
                .map((svc) => (
                  <div key={svc.name} className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ background: svc.color.bg, color: svc.color.text, padding: "12px", borderRadius: "12px" }}><InfoIcon /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{svc.name}</h3>
                        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>Informational Content</span>
                      </div>
                    </div>
                    <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{svc.desc}</p>
                    <button className="as-qr-btn" style={{ width: "100%", marginTop: "16px" }} onClick={() => handleGenerateQR(svc.name, "Services")}>
                      <Manage_IconQR /> Generate QR Code
                    </button>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {selectedServiceQR && <QRModal />}
    </>
  );
}