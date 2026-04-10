import React, { useState } from "react";
import { Manage_IconQR, IconDownload, IconConfirmCheck, SirenIcon, BriefcaseIcon, InfoIcon } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";

import ServicePeaceOrder from "./ServicePeaceOrder";
import ServiceLivelihood from "./ServiceLivelihood";
import ServiceBswd from "./ServiceBswd";

export default function ManageServices() {
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [selectedServiceQR, setSelectedServiceQR] = useState(null);

  const handleGenerateQR = (serviceName, category) => {
    const residentAppUrl = "https://3-sense.vercel.app/";
    const encodedUrl = `${residentAppUrl}?serviceId=${serviceName.toLowerCase()}&serviceName=${encodeURIComponent(serviceName)}&category=${encodeURIComponent(category)}`;
    setSelectedServiceQR({ name: serviceName, qrValue: encodedUrl });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0);
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `3Sense-QR-${selectedServiceQR.name}.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (activeDashboard === "peace") return <ServicePeaceOrder onBack={() => setActiveDashboard(null)} />;
  if (activeDashboard === "livelihood") return <ServiceLivelihood onBack={() => setActiveDashboard(null)} />;
  if (activeDashboard === "bswd") return <ServiceBswd onBack={() => setActiveDashboard(null)} />;

  if (activeDashboard === null) {
    return (
      <>
        <div className="as-container">
          <div className="as-header-section">
            <div className="as-title-wrap">
              <h1>Services Hub</h1>
              <p className="as-subtitle">Adaptive workspaces for handling different barangay services and departments</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '12px', borderRadius: '12px' }}><SirenIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Peace & Order</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Interactive Form & Inbox</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Monitor incoming incident reports, dispatch barangay tanods, and manage blotters.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("peace")}>Workspace &rarr;</button>
                <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("Peace and Order", "Services")}>
                  <Manage_IconQR /> Generate QR Code
                </button>
              </div>
            </div>

            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf4', color: '#15803d', padding: '12px', borderRadius: '12px' }}><BriefcaseIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>Livelihood</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Registration System</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Approve or reject community registrations for training programs and assistance.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("livelihood")}>Workspace &rarr;</button>
                <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("Livelihood", "Services")}>
                  <Manage_IconQR /> Generate QR Code
                </button>
              </div>
            </div>

            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#f0fdf2', color: '#115e59', padding: '12px', borderRadius: '12px' }}><SirenIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>BSWD</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Social Welfare</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Manage reports of displaced persons and community tips regarding resident welfare.</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button className="as-btn-aqua" style={{ flex: 1 }} onClick={() => setActiveDashboard("bswd")}>Workspace &rarr;</button>
                <button className="as-qr-btn" style={{ flex: 1 }} onClick={() => handleGenerateQR("BSWD", "Services")}>
                  <Manage_IconQR /> Generate QR Code
                </button>
              </div>
            </div>
          </div>

          <div className="as-header-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <div className="as-title-wrap">
              <h2>Informational Services</h2>
              <p className="as-subtitle">Standard content guides mapping to external references or rules.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#fef3c7', color: '#b45309', padding: '12px', borderRadius: '12px' }}><InfoIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>BADAC</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Informational Content</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Barangay Anti-Drug Abuse Council information and rehabilitation procedures.</p>
              <button className="as-qr-btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => handleGenerateQR("BADAC", "Services")}>
                <Manage_IconQR /> Generate QR Code
              </button>
            </div>

            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#fce7f3', color: '#be185d', padding: '12px', borderRadius: '12px' }}><InfoIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>VAWC</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Informational Content</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Violence Against Women and their Children guides, support numbers, and help.</p>
              <button className="as-qr-btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => handleGenerateQR("VAWC", "Services")}>
                <Manage_IconQR /> Generate QR Code
              </button>
            </div>

            <div className="as-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '12px', borderRadius: '12px' }}><InfoIcon /></div>
                <div><h3 style={{ margin: 0, fontSize: '1.1rem' }}>BOSCA</h3><span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Informational Content</span></div>
              </div>
              <p style={{ color: '#4b5563', fontSize: '0.9rem', flex: 1 }}>Barangay Office of Senior Citizens Affairs rights, applications, and guidelines.</p>
              <button className="as-qr-btn" style={{ width: '100%', marginTop: '16px' }} onClick={() => handleGenerateQR("BOSCA", "Services")}>
                <Manage_IconQR /> Generate QR Code
              </button>
            </div>
          </div>
        </div>

        {selectedServiceQR && (
          <div className="as-modal-overlay">
            <div className="as-modal-content" style={{ maxWidth: '450px' }}>
              <div className="as-modal-header">
                <h2>QR Code Generated</h2>
                <button className="as-modal-close" onClick={() => setSelectedServiceQR(null)}>&times;</button>
              </div>
              <div className="as-modal-body" style={{ textAlign: 'center' }}>
                <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
                <h3>{selectedServiceQR.name}</h3>
                <p className="as-modal-desc">Residents can scan this code to access the {selectedServiceQR.name} informational page.</p>
                <div className="as-qr-holder" style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                  <QRCodeSVG id="as-qr-svg" value={selectedServiceQR.qrValue} size={150} level={"H"} includeMargin={true}/>
                </div>
                <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: '100%' }}><IconDownload /> Download QR (PNG)</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
}

