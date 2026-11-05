import React, { useState, useEffect } from "react";
import {
  Manage_IconQR,
  IconDownload,
  IconConfirmCheck,
  SirenIcon,
  BriefcaseIcon,
  InfoIcon,
} from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  getCountFromServer
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useQuery } from '@tanstack/react-query'; 

import { ROLE_PERMISSIONS } from "../../services/permissions";

import ServicePeaceOrder from "./ServicePeaceOrder";
import ServiceLivelihood from "./ServiceLivelihood";
import ServiceBswd from "./ServiceBswd";
import ServiceVawc from "./ServiceVawc";

// NEW: Import Language Hook
import { useLanguage } from '../../context/LanguageContext'; 

const getTodayStr = () => new Date().toISOString().split("T")[0];

// Helper to fetch server-side counts without downloading documents
const fetchCollectionStats = async (collectionName, statuses, dateField = "submittedAt") => {
  const baseRef = collection(db, collectionName);
  
  // 1. Get total count
  const totalPromise = getCountFromServer(baseRef);
  
  // 2. Get counts for each specific status
  const statusPromises = statuses.map(s => 
    getCountFromServer(query(baseRef, where("status", "==", s)))
  );
  
  // 3. Get exactly 1 document to find the latest date
  const latestPromise = getDocs(query(baseRef, orderBy(dateField, "desc"), limit(1)));

  const results = await Promise.all([totalPromise, latestPromise, ...statusPromises]);
  
  const total = results[0].data().count;
  const latestSnap = results[1];
  
  let latestDate = "—";
  if (!latestSnap.empty) {
    const docData = latestSnap.docs[0].data();
    const ts = docData[dateField] || docData.createdAt;
    if (ts) {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      latestDate = d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    }
  }

  const byStatus = {};
  statuses.forEach((s, idx) => {
    byStatus[s] = results[idx + 2].data().count;
  });

  return { total, byStatus, latest: latestDate };
};

export default function ManageServices() {
  const { t } = useLanguage(); // NEW: Destructure hook

  const [activeDashboard, setActiveDashboard] = useState(null);
  const [selectedServiceQR, setSelectedServiceQR] = useState(null);
  const [userRole, setUserRole] = useState("Standard Admin");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setUserRole(parsed.role || "Standard Admin");
        }
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const { data: statsData = {}, isLoading } = useQuery({
    queryKey: ['adminManage_servicesStats'],
    queryFn: async () => {
      const [peace, livelihood, bswd, vawc] = await Promise.all([
        fetchCollectionStats("incidentReports", ["Pending", "Responded", "Resolved"], "submittedAt"),
        fetchCollectionStats("livelihoodRegistrations", ["Pending", "Approved", "Rejected"], "submittedAt"),
        fetchCollectionStats("bswdReports", ["Pending", "Received", "Acted Upon"], "submittedAt"),
        fetchCollectionStats("vawcCases", ["Pending", "Analyzed", "Resolved"], "createdAt")
      ]);

      return { peace, livelihood, bswd, vawc };
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  const emptyStats = { total: 0, byStatus: {}, latest: "—" };
  const peaceStats = statsData.peace || emptyStats;
  const livelihoodStats = statsData.livelihood || emptyStats;
  const bswdStats = statsData.bswd || emptyStats;
  const vawcStats = statsData.vawc || emptyStats;

  const handleGenerateQR = (serviceName, category) => {
    const today = getTodayStr();
    const base = "https://www.3s-sense.site/";
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
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `3Sense-QR-${selectedServiceQR.name}-${getTodayStr()}.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (activeDashboard === "peace") return <ServicePeaceOrder onBack={() => setActiveDashboard(null)} userRole={userRole} />;
  if (activeDashboard === "livelihood") return <ServiceLivelihood onBack={() => setActiveDashboard(null)} userRole={userRole} />;
  if (activeDashboard === "bswd") return <ServiceBswd onBack={() => setActiveDashboard(null)} userRole={userRole} />;
  if (activeDashboard === "vawc") return <ServiceVawc onBack={() => setActiveDashboard(null)} userRole={userRole} />;

  const StatBar = ({ stats }) => {
    const statusColors = {
      pending: { bg: "#fef3c7", text: "#92400e", dot: "#d97706" },
      received: { bg: "#ccfbf1", text: "#115e59", dot: "#0d9488" },
      responded: { bg: "#e0e7ff", text: "#3730a3", dot: "#4f46e5" },
      resolved: { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
      approved: { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
      rejected: { bg: "#fee2e2", text: "#991b1b", dot: "#dc2626" },
      analyzed: { bg: "#e0e7ff", text: "#3730a3", dot: "#4f46e5" },
      "acted upon": { bg: "#dcfce7", text: "#166534", dot: "#16a34a" },
    };
    return (
      <div style={{ marginTop: "12px", padding: "12px", background: "#eff0f0", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "10px" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>{t('admin_srv_stat_total')}</span>
          <span style={{ fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>{stats.total}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const key = status.toLowerCase();
            const c = statusColors[key] || { bg: "#f3f4f6", text: "#4b5563", dot: "#9ca3af" };
            
            // Minimal internal translation for known statuses to maintain consistent colors while translating text
            let displayStatus = status.charAt(0).toUpperCase() + status.slice(1);
            if (key === 'pending') displayStatus = t('status_pending');
            if (key === 'resolved') displayStatus = t('status_resolved');
            if (key === 'responded') displayStatus = t('status_responded');
            if (key === 'approved') displayStatus = t('status_approved');
            if (key === 'rejected') displayStatus = t('status_rejected');
            if (key === 'received') displayStatus = t('status_received');

            return (
              <span key={status} style={{ fontSize: "0.72rem", padding: "3px 8px", borderRadius: "10px", background: c.bg, color: c.text, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: c.dot, display: "inline-block" }} />
                {displayStatus}: {count}
              </span>
            );
          })}
        </div>
        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #e2e8f0", fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>{t('admin_srv_stat_latest')}</span>
          <span style={{ color: "#1e293b", fontWeight: 600 }}>{stats.latest}</span>
        </div>
      </div>
    );
  };

  const allowedServices = ROLE_PERMISSIONS[userRole]?.services || [];
  const hasWorkspaceServices = allowedServices.some((s) => ["Peace & Order", "Livelihood", "BSWD", "VAWC"].includes(s));
  const hasInfoServices = allowedServices.some((s) => ["BADAC", "BOSCA"].includes(s));

  const QRModal = () => (
    <div className="as-modal-overlay">
      <div className="as-modal-content" style={{ maxWidth: "450px" }}>
        <div className="as-modal-header">
          <h2>{t('admin_srv_qr_title')}</h2>
          <button className="as-modal-close" onClick={() => setSelectedServiceQR(null)}>&times;</button>
        </div>
        <div className="as-modal-body" style={{ textAlign: "center" }}>
          <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
          <h3>{selectedServiceQR.name}</h3>
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.82rem", color: "#92400e", textAlign: "left" }}>
            ⚠️ <strong>{t('admin_srv_qr_warning')} ({getTodayStr()}).</strong> {t('admin_srv_qr_warning_end')}
          </div>
          <p className="as-modal-desc">{t('admin_srv_qr_desc')} {selectedServiceQR.name} page.</p>
          <div className="as-qr-holder" style={{ margin: "20px auto", display: "flex", justifyContent: "center" }}>
            <QRCodeSVG id="as-qr-svg" value={selectedServiceQR.qrValue} size={150} level={"H"} includeMargin={true} />
          </div>
          <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: "100%" }}>
            <IconDownload /> {t('admin_srv_qr_download')}
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>{t('admin_srv_loading')}</div>;
  }

  return (
    <>
      <div className="as-container" style={{ padding: 0 }}>
        {hasWorkspaceServices && (
          <>
            <div className="as-header-section">
              <div className="as-title-wrap">
                <h1>{t('admin_srv_title')}</h1>
                <p className="as-subtitle">{t('admin_srv_subtitle')}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {/* 1. Peace & Order */}
              {allowedServices.includes("Peace & Order") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#eff6ff", color: "#1d4ed8", padding: "12px", borderRadius: "12px" }}><SirenIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t('admin_srv_peace_name')}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t('admin_srv_peace_badge')}</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{t('admin_srv_peace_desc')}</p>
                  <StatBar stats={peaceStats} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: "1 1 120px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => setActiveDashboard("peace")}>{t('admin_srv_card_workspace_btn')}</button>
                    <button className="as-qr-btn" style={{ flex: "1 1 150px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => handleGenerateQR("Peace and Order", "Services")}>
                      <Manage_IconQR /> {t('admin_srv_card_qr_btn')}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. Livelihood */}
              {allowedServices.includes("Livelihood") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#f0fdf4", color: "#15803d", padding: "12px", borderRadius: "12px" }}><BriefcaseIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t('admin_srv_livelihood_name')}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t('admin_srv_livelihood_badge')}</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{t('admin_srv_livelihood_desc')}</p>
                  <StatBar stats={livelihoodStats} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: "1 1 120px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => setActiveDashboard("livelihood")}>{t('admin_srv_card_workspace_btn')}</button>
                    <button className="as-qr-btn" style={{ flex: "1 1 150px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => handleGenerateQR("Livelihood", "Services")}>
                      <Manage_IconQR /> {t('admin_srv_card_qr_btn')}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. BSWD */}
              {allowedServices.includes("BSWD") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#f0fdf2", color: "#115e59", padding: "12px", borderRadius: "12px" }}><SirenIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t('admin_srv_bswd_name')}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t('admin_srv_bswd_badge')}</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{t('admin_srv_bswd_desc')}</p>
                  <StatBar stats={bswdStats} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: "1 1 120px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => setActiveDashboard("bswd")}>{t('admin_srv_card_workspace_btn')}</button>
                    <button className="as-qr-btn" style={{ flex: "1 1 150px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => handleGenerateQR("BSWD", "Services")}>
                      <Manage_IconQR /> {t('admin_srv_card_qr_btn')}
                    </button>
                  </div>
                </div>
              )}

              {/* 4. VAWC - Promoted */}
              {allowedServices.includes("VAWC") && (
                <div className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ background: "#fff1f2", color: "#e11d48", padding: "12px", borderRadius: "12px" }}><SirenIcon /></div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t('admin_srv_vawc_name')}</h3>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t('admin_srv_vawc_badge')}</span>
                    </div>
                  </div>
                  <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{t('admin_srv_vawc_desc')}</p>
                  <StatBar stats={vawcStats} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "16px" }}>
                    <button className="as-btn-aqua" style={{ flex: "1 1 120px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => setActiveDashboard("vawc")}>{t('admin_srv_card_workspace_btn')}</button>
                    <button className="as-qr-btn" style={{ flex: "1 1 150px", justifyContent: "center", whiteSpace: "normal", textAlign: "center" }} onClick={() => handleGenerateQR("VAWC", "Services")}>
                      <Manage_IconQR /> {t('admin_srv_card_qr_btn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {hasInfoServices && (
          <>
            <div className="as-header-section" style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
              <div className="as-title-wrap">
                <h2>{t('admin_srv_info_title')}</h2>
                <p className="as-subtitle">{t('admin_srv_info_subtitle')}</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
              {[
                { name: t('admin_srv_badac_name'), color: { bg: "#fef3c7", text: "#b45309" }, desc: t('admin_srv_badac_desc') },
                { name: t('admin_srv_bosca_name'), color: { bg: "#e0e7ff", text: "#4338ca" }, desc: t('admin_srv_bosca_desc') },
              ]
                .filter((svc) => allowedServices.includes(svc.name))
                .map((svc) => (
                  <div key={svc.name} className="as-card" style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ background: svc.color.bg, color: svc.color.text, padding: "12px", borderRadius: "12px" }}><InfoIcon /></div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{svc.name}</h3>
                        <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>{t('admin_srv_info_content_badge')}</span>
                      </div>
                    </div>
                    <p style={{ color: "#4b5563", fontSize: "0.9rem", flex: 1 }}>{svc.desc}</p>
                    <button className="as-qr-btn" style={{ width: "100%", marginTop: "16px" }} onClick={() => handleGenerateQR(svc.name, "Services")}>
                      <Manage_IconQR /> {t('admin_srv_card_qr_btn')}
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