import React, { useState } from "react";
import { HeartIcon, SendIcon, IconUser } from "../../components/Icons";

const MOCK_REPORTS = [
  { id: "R-001", name: "Anonymous", location: "Under the footbridge near highway", concern: "Elderly man sleeping without cover, seems sick.", photo: "No photo attached", status: "Pending", date: "2026-03-15" },
  { id: "R-002", name: "Maria Santos", location: "Basketball Court Area", concern: "Displaced family from recent fire needs food assistance.", photo: "fire_victims.jpg", status: "Responded", date: "2026-03-14" },
];

const MOCK_TIPS = [
  { id: "T-001", about: "Kuya Pedro (street vendor)", tip: "His cart was destroyed by a passing truck last night. Needs livelihood support.", contact: "09123456789", status: "Pending", date: "2026-03-15" },
  { id: "T-002", about: "Unknown child near 7/11", tip: "Child has been begging for two days. Seems lost.", contact: "Anonymous", status: "Resolved (Turned over to DSWD)", date: "2026-03-13" },
];

export default function ServiceBswd({ onBack }) {
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [tips, setTips] = useState(MOCK_TIPS);

  const updateStatus = (id, newStatus, isTip = false) => {
    if (isTip) {
      setTips(tips.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } else {
      setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Social Welfare & Development</h1>
          <p className="as-subtitle">Manage displaced person reports and community welfare tips</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px' }}>
        <button 
          style={{ padding: '8px 16px', background: activeTab === 'reports' ? '#111827' : 'transparent', color: activeTab === 'reports' ? '#fff' : '#6b7280', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setActiveTab('reports')}
        >
          Displacement Reports ({reports.length})
        </button>
        <button 
          style={{ padding: '8px 16px', background: activeTab === 'tips' ? '#111827' : 'transparent', color: activeTab === 'tips' ? '#fff' : '#6b7280', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setActiveTab('tips')}
        >
          Community Tips ({tips.length})
        </button>
      </div>

      {activeTab === "reports" ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Reporter Name</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Location</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Concern / Description</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.9rem' }}>{r.date}</td>
                  <td style={{ padding: '16px', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '16px', color: '#111827' }}>{r.location}</td>
                  <td style={{ padding: '16px', color: '#4b5563', maxWidth: '300px' }}>
                    <div style={{ marginBottom: '8px' }}>{r.concern}</div>
                    <span style={{ fontSize: '0.75rem', color: '#317D89', background: '#e0f2fe', padding: '2px 8px', borderRadius: '12px' }}>
                      📸 {r.photo}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      background: r.status === 'Resolved' ? '#dcfce7' : r.status === 'Pending' ? '#fef3c7' : '#e0e7ff',
                      color: r.status === 'Resolved' ? '#166534' : r.status === 'Pending' ? '#92400e' : '#3730a3'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {r.status !== 'Resolved' ? (
                      <select onChange={(e) => updateStatus(r.id, e.target.value)} defaultValue={r.status} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.8rem' }}>
                        <option value="Pending">Pending</option>
                        <option value="Responded">Responded</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Closed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Date</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>About Who?</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>What is known (Tip)</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Contact Info</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Status</th>
                <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tips.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.9rem' }}>{t.date}</td>
                  <td style={{ padding: '16px', fontWeight: 500, color: '#111827' }}>{t.about}</td>
                  <td style={{ padding: '16px', color: '#4b5563', maxWidth: '300px' }}>{t.tip}</td>
                  <td style={{ padding: '16px', color: '#6b7280' }}>{t.contact}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                      background: t.status.includes('Resolved') ? '#dcfce7' : '#fef3c7',
                      color: t.status.includes('Resolved') ? '#166534' : '#92400e'
                    }}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {!t.status.includes('Resolved') ? (
                      <button style={{ padding: '6px 12px', background: '#fff', border: '1px solid #2DB17B', color: '#2DB17B', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => updateStatus(t.id, 'Resolved (Handled)', true)}>Mark Handled</button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
