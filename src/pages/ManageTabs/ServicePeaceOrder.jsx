import React, { useState } from "react";
import { ServiceAlertTriangleIcon, ServiceClockIcon, ServiceCheckCircleIcon, PhoneCallIcon, IconAdd, IconDownload } from "../../components/Icons";

const MOCK_INBOX = [
  { 
    ref: "PO-2026-11423", date: "2026-03-15", time: "22:30", type: "Noise Complaint",
    urgency: "urgent", location: "Purok 3, Near Sari-sari", 
    description: "Loud karaoke past 10 PM. Neighbors unable to sleep.",
    reporterName: "Juan Dela Cruz", contact: "09123456789", address: "Apong St.", 
    status: "Pending", tanod: "Unassigned"
  },
  { 
    ref: "PO-2026-98712", date: "2026-03-14", time: "15:45", type: "Fight / Physical Altercation",
    urgency: "emergency", location: "Basketball Court Area", 
    description: "Two men fighting near the court entrance with weapons.",
    reporterName: "Anonymous", contact: "", address: "", 
    status: "Resolved", tanod: "Tanod Reyes"
  },
  { 
    ref: "PO-2026-55301", date: "2026-03-16", time: "09:00", type: "Suspicious Person / Activity",
    urgency: "docs", location: "Purok 7", 
    description: "Unidentified van parked near the playground since yesterday.",
    reporterName: "Maria Clara", contact: "09198765432", address: "Purok 7 main road", 
    status: "Responded", tanod: "Tanod Garcia"
  }
];

export default function ServicePeaceOrder({ onBack }) {
  const [reports, setReports] = useState(MOCK_INBOX);
  const [selectedReport, setSelectedReport] = useState(null);

  const updateStatus = (status) => {
    setReports(reports.map(r => r.ref === selectedReport.ref ? { ...r, status } : r));
    setSelectedReport({ ...selectedReport, status });
  };

  const getUrgencyColor = (u) => {
    if (u === "emergency") return { bg: "#fee2e2", text: "#b91c1c" };
    if (u === "urgent") return { bg: "#fef08a", text: "#a16207" };
    return { bg: "#e0e7ff", text: "#4338ca" }; // docs
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Peace & Order Workspace</h1>
          <p className="as-subtitle">Manage incident reports, dispatch tanods, and update blotters</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr', gap: '20px', minHeight: '60vh' }}>
        
        {/* Inbox List */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', background: '#f9fafb' }}>
            Incoming Reports ({reports.length})
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {reports.map(r => {
              const uColor = getUrgencyColor(r.urgency);
              const isActive = selectedReport?.ref === r.ref;
              return (
                <div key={r.ref} onClick={() => setSelectedReport(r)}
                  style={{ 
                    padding: '16px', borderBottom: '1px solid #e5e7eb', cursor: 'pointer',
                    background: isActive ? '#f0fdf4' : '#fff', transition: 'background 0.2s',
                    borderLeft: isActive ? '4px solid #2DB17B' : '4px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'bold' }}>{r.ref}</span>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: uColor.bg, color: uColor.text, fontWeight: 'bold' }}>
                      {r.urgency.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#111827', marginBottom: '4px' }}>{r.type}</div>
                  <div style={{ fontSize: '0.85rem', color: '#4b5563', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.location} - {r.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Detail View */}
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '24px' }}>
          {selectedReport ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ margin: '0 0 8px 0', color: '#111827' }}>Incident Details</h2>
                  <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Ref: {selectedReport.ref}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`as-badge ${selectedReport.status.toLowerCase()}`}>{selectedReport.status}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Incident Type</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.type}</p>
                </div>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Date & Time</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.date} at {selectedReport.time}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Exact Location</p>
                  <p style={{ fontWeight: 600, margin: 0 }}>{selectedReport.location}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Description provided by user</p>
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.95rem' }}>
                    {selectedReport.description}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Reporter Information</h3>
                {selectedReport.reporterName === "Anonymous" ? (
                  <div style={{ padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '0.9rem' }}>
                    <strong>Anonymous Report</strong> - The user opted not to provide personal details.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Name</p>
                      <p style={{ margin: 0 }}>{selectedReport.reporterName}</p>
                    </div>
                    <div>
                      <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0 0 4px 0' }}>Contact Number</p>
                      <p style={{ margin: 0 }}>{selectedReport.contact}</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Admin Action Panel</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Assigned Tanod</label>
                    <select className="as-form-select" defaultValue={selectedReport.tanod}>
                      <option>Unassigned</option>
                      <option>Tanod Reyes</option>
                      <option>Tanod Garcia</option>
                      <option>Tanod Santos</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', color: '#6b7280', fontSize: '0.85rem', marginBottom: '4px' }}>Update Status</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="as-btn-ghost" style={{ flex: 1, borderColor: selectedReport.status === 'Responded' ? '#BDBD64' : '#e5e7eb' }} onClick={() => updateStatus("Responded")}>Responded</button>
                      <button className="as-btn-ghost" style={{ flex: 1, borderColor: selectedReport.status === 'Resolved' ? '#2DB17B' : '#e5e7eb', color: selectedReport.status === 'Resolved' ? '#2DB17B' : 'inherit' }} onClick={() => updateStatus("Resolved")}>Resolved</button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column' }}>
              <ServiceAlertTriangleIcon />
              <p style={{ marginTop: '16px' }}>Select an incident report from the inbox to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
