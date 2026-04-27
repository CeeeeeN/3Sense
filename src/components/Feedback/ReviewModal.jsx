import React, { useState, useEffect } from 'react';
import { X, BarChart2, CheckCircle } from 'lucide-react';
import SeverityBadge from './SeverityBadge';

export default function ReviewModal({ feedback, isOpen, onClose, onSave }) {
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Reset modal state when opened with new feedback
  useEffect(() => {
    if (feedback) {
      setAdminNote(feedback.AdminNotes || '');
      setNewStatus(feedback.Status || 'analyzed');
    }
  }, [feedback]);

  if (!isOpen || !feedback) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Feedback Review Panel</h2>
          <button className="btn-close-icon" onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">
          {/* AI Insights Card */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart2 size={16} color="#317D89"/> AI Analysis Results
              </h4>
              <SeverityBadge severity={feedback.Severity} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
              <div><strong style={{ color: '#64748b' }}>Detected Sentiment:</strong> {feedback.Sentiment}</div>
              <div><strong style={{ color: '#64748b' }}>AI Confidence:</strong> {feedback.Confidence ? `${(feedback.Confidence * 100).toFixed(1)}%` : 'N/A'}</div>
              <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>Detected Issue Category:</strong> {feedback.DetectedIssue || 'None'}</div>
            </div>
          </div>

          {/* Resident Details */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Resident Comment ({feedback.Rating}★)</label>
            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.95rem', color: '#1e293b', fontStyle: 'italic', marginTop: '4px' }}>
              "{feedback.Comment}"
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>Submitted by: {feedback.UserName || 'Resident'} (Ref: {feedback.ReferenceID})</div>
          </div>

          {/* Staff Action Section */}
          <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>Staff Action</h3>
          
          <div className="detail-item" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Update Status</label>
            <select className="filter-select" style={{ width: '100%', padding: '10px' }} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="analyzed">Analyzed (Requires Action)</option>
              <option value="under review">Under Review (Investigating)</option>
              <option value="responded">Responded to Resident</option>
              <option value="resolved">Resolved (Case Closed)</option>
            </select>
          </div>

          <div className="detail-item">
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Internal Admin Notes</label>
            <textarea
              rows="4"
              placeholder="Enter notes about how this feedback was addressed..."
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'none' }}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            ></textarea>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-view" onClick={onClose}>Cancel</button>
          <button className="btn-approve" onClick={() => onSave(feedback.docId, adminNote, newStatus)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}