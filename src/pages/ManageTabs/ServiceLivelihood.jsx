import React, { useState } from "react";
import { UsersIcon, IconConfirmCheck } from "../../components/Icons";
import FormBuilder from "../../components/FormBuilder";

export default function ServiceLivelihood({ onBack }) {
  const [livelihoodPrograms, setLivelihoodPrograms] = useState([
    { id: "lp1", name: "Food Processing & Basic Entrepreneurship", description: "Learn to make longganisa and bottled goods.", date: "2026-04-07", time: "9:00 AM" }
  ]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProgram, setNewProgram] = useState({ name: "", description: "", date: "", time: "", customFields: [] });

  const handleAddProgram = (e) => {
    e.preventDefault();
    setLivelihoodPrograms([...livelihoodPrograms, { ...newProgram, id: Date.now().toString() }]);
    setShowAddModal(false);
    setNewProgram({ name: "", description: "", date: "", time: "", customFields: [] });
  };

  const MOCK_PARTICIPANTS = [
    { id: "reg1", name: "Maria Clara", age: 34, contact: "09123456789", address: "Purok 1", status: "Pending" },
    { id: "reg2", name: "Jose Rizal", age: 28, contact: "09198765432", address: "Apong St", status: "Approved" },
    { id: "reg3", name: "Andres Bonifacio", age: 41, contact: "09112223333", address: "Purok 4", status: "Pending" },
    { id: "reg4", name: "Gabriela Silang", age: 25, contact: "09998887777", address: "Malanday Main", status: "Rejected" },
  ];
  const [participants, setParticipants] = useState(MOCK_PARTICIPANTS);

  const updateStatus = (id, newStatus) => {
    if (newStatus === 'Rejected') {
      const reason = window.prompt("Please state the reason for rejecting this applicant:");
      if (reason === null) return;
      setParticipants(participants.map(p => p.id === id ? { ...p, status: newStatus, reason } : p));
    } else {
      setParticipants(participants.map(p => p.id === id ? { ...p, status: newStatus } : p));
    }
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: "40px" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        &larr; Back to Services Hub
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Livelihood Skills Training</h1>
          <p className="as-subtitle">Manage livelihood programs, skills training, and registrations</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="as-btn-aqua" onClick={() => setShowAddModal(true)} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>+ Add New Program</button>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '20px', paddingBottom: '20px' }}>
        <h3 style={{ marginBottom: '10px' }}>Active Programs</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {livelihoodPrograms.map(lp => (
            <div key={lp.id} style={{ padding: '16px', border: '2px solid #2DB17B', background: '#f0fdf4', borderRadius: '8px', minWidth: '250px' }}>
              <div style={{ fontWeight: 'bold', color: '#166534' }}>{lp.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: '4px' }}>{lp.date} • {lp.time}</div>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ marginBottom: '10px' }}>Participant Registrations</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '8px' }}>Total Registered</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>{participants.length}</div>
        </div>
        <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
          <div style={{ color: '#166534', fontSize: '0.9rem', marginBottom: '8px' }}>Approved</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#15803d' }}>{participants.filter(p => p.status === 'Approved').length}</div>
        </div>
        <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '12px', border: '1px solid #fde68a' }}>
          <div style={{ color: '#854d0e', fontSize: '0.9rem', marginBottom: '8px' }}>Pending</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#a16207' }}>{participants.filter(p => p.status === 'Pending').length}</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
          <div style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '8px' }}>Capacity / Slots</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>40</div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Participant Name</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Age</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Contact</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Address</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Status</th>
              <th style={{ padding: '16px', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '16px', fontWeight: 500 }}>{p.name}</td>
                <td style={{ padding: '16px', color: '#6b7280' }}>{p.age}</td>
                <td style={{ padding: '16px', color: '#6b7280' }}>{p.contact}</td>
                <td style={{ padding: '16px', color: '#6b7280' }}>{p.address}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                    background: p.status === 'Approved' ? '#dcfce7' : p.status === 'Pending' ? '#fef3c7' : '#fee2e2',
                    color: p.status === 'Approved' ? '#166534' : p.status === 'Pending' ? '#92400e' : '#991b1b'
                  }}>
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  {p.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '6px 12px', border: '1px solid #2DB17B', background: '#2DB17B', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => updateStatus(p.id, 'Approved')}>Approve</button>
                      <button style={{ padding: '6px 12px', border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }} onClick={() => updateStatus(p.id, 'Rejected')}>Reject</button>
                    </div>
                  )}
                  {p.status !== 'Pending' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.85rem' }}>
                      <span style={{ color: '#9ca3af' }}>Action taken</span>
                      {p.reason && <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.reason}>"{p.reason}"</span>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '700px', width: '100%' }}>
            <div className="as-modal-header">
              <h2>Add Livelihood Program</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleAddProgram}>
                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Program Name <span style={{color:'red'}}>*</span></label>
                  <input type="text" className="as-form-input" required value={newProgram.name} onChange={(e) => setNewProgram({...newProgram, name: e.target.value})} placeholder="e.g. Food Processing" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
                  <div>
                    <label className="as-form-label">Date <span style={{color:'red'}}>*</span></label>
                    <input type="date" className="as-form-input" required value={newProgram.date} onChange={(e) => setNewProgram({...newProgram, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="as-form-label">Time <span style={{color:'red'}}>*</span></label>
                    <input type="time" className="as-form-input" required value={newProgram.time} onChange={(e) => setNewProgram({...newProgram, time: e.target.value})} />
                  </div>
                </div>
                <div style={{ marginBottom: "15px" }}>
                  <label className="as-form-label">Description <span style={{color:'red'}}>*</span></label>
                  <textarea className="as-form-textarea" required rows="3" value={newProgram.description} onChange={(e) => setNewProgram({...newProgram, description: e.target.value})} placeholder="Program details..."></textarea>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px', marginTop: '-10px' }}>The following information is automatically collected. Do not recreate them in the form builder.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {["Full Name", "Complete Address", "Contact Number", "Email (Optional)", "Upload Valid ID / Clearance"].map(f => (
                      <span key={f} style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <FormBuilder 
                  fields={newProgram.customFields} 
                  onChange={(fields) => setNewProgram({ ...newProgram, customFields: fields })} 
                />

                <div className="as-modal-actions" style={{ marginTop: '20px' }}>
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Save Program</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '400px' }}>
            <div className="as-modal-header">
              <h2>Reject Participant</h2>
              <button className="as-modal-close" onClick={() => { setShowRejectModal(false); setRejectId(null); }}>&times;</button>
            </div>
            <div className="as-modal-body">
              <form onSubmit={handleConfirmReject}>
                <div className="as-form-group">
                  <label className="as-form-label">Reason for Rejection <span style={{color:'red'}}>*</span></label>
                  <textarea 
                    className="as-form-textarea" 
                    rows="3" 
                    required 
                    placeholder="Provide a brief explanation for rejection..." 
                    value={rejectReason} 
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <div className="as-modal-actions" style={{ marginTop: '15px' }}>
                  <button type="button" className="as-btn-ghost" onClick={() => { setShowRejectModal(false); setRejectId(null); }}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ background: '#ef4444', borderColor: '#ef4444', padding: '8px 16px', fontSize: '0.9rem' }}>Confirm Rejection</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
