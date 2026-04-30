import React, { useState, useEffect } from 'react';
import { X, BarChart2, CheckCircle, Image as ImageIcon, RefreshCw } from 'lucide-react';
import SeverityBadge from './SeverityBadge';
import { db } from '../../firebase/firebase'; // Ensure this path is correct
import { doc, updateDoc } from 'firebase/firestore';

export default function ReviewModal({ feedback, isOpen, onClose, onSave }) {
  const [adminNote, setAdminNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false); // NEW STATE

  useEffect(() => {
    if (feedback) {
      setAdminNote(feedback.adminNotes || '');
      setNewStatus(feedback.status || 'analyzed');
    }
  }, [feedback]);

  const handleRetryAI = async () => {
    setIsAnalyzing(true);
    try {
      // Call your secure Vercel API, exactly like FeedbackForm.jsx does!
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: feedback.Comment,
          rating: Number(feedback.Rating) || 5
        })
      });

      if (!response.ok) {
        throw new Error("API failed or AI is still waking up");
      }

      // Parse the JSON directly from your Vercel API
      const aiData = await response.json();

      // Update Firestore using the exact camelCase keys your Vercel API returns
      const fbRef = doc(db, "feedback", feedback.docId);
      await updateDoc(fbRef, {
        sentiment:       aiData.sentiment,
        hybridScore:     aiData.hybridScore,
        textScore:       aiData.textScore,
        confidence:      aiData.confidence,
        detectedIssue:   aiData.detectedIssue,
        severity:        aiData.severity || (aiData.sentiment === "Negative" ? "High" : "Normal"),
        status:          "analyzed"
      });

      alert("AI Analysis complete! The dashboard will now update.");
      onClose(); // Close the modal to let the table refresh

    } catch (error) {
      console.error("Manual AI Trigger Failed:", error);
      alert("The AI server is still waking up. Please wait 30 seconds and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen || !feedback) return null;

  const needsAI = feedback.status?.toLowerCase() === 'pending_ai' || !feedback.sentiment;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>Feedback Review Panel</h2>
          <button className="btn-close-icon" onClick={onClose}><X size={22} /></button>
        </div>

        <div className="modal-body">
          
          {/* --- UPDATED: AI INSIGHTS CARD --- */}
          {needsAI ? (
            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fef3c7', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={16} color="#92400e"/> AI Analysis Pending
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#b45309' }}>This feedback was submitted while the AI was asleep.</p>
              </div>
              <button 
                onClick={handleRetryAI} 
                disabled={isAnalyzing}
                style={{ background: '#d97706', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: isAnalyzing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
              >
                {isAnalyzing ? <><RefreshCw size={16} className="animate-spin" /> Waking AI...</> : "Run AI Now"}
              </button>
            </div>
          ) : (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart2 size={16} color="#317D89"/> AI Analysis Results
                </h4>
                <SeverityBadge severity={feedback.severity} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                <div><strong style={{ color: '#64748b' }}>Detected Sentiment:</strong> {feedback.sentiment}</div>
                <div><strong style={{ color: '#64748b' }}>AI Confidence:</strong> {feedback.confidence ? `${(feedback.confidence * 100).toFixed(1)}%` : 'N/A'}</div>
                <div style={{ gridColumn: 'span 2' }}><strong style={{ color: '#64748b' }}>Detected Issue Category:</strong> {feedback.detectedIssue || 'None'}</div>
              </div>
            </div>
          )}
          {/* ---------------------------------- */}

          {/* Resident Details */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Resident Comment ({feedback.rating}★)</label>
            <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.95rem', color: '#1e293b', fontStyle: 'italic', marginTop: '4px' }}>
              "{feedback.comment}"
            </div>

            {feedback.imageUrl && (
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={14} /> Attached Photo Evidence
                </label>
                <div style={{ marginTop: '6px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'center', padding: '8px' }}>
                  <a href={feedback.imageUrl} target="_blank" rel="noopener noreferrer" title="Click to view full size">
                    <img src={feedback.imageUrl} alt="Feedback Evidence" style={{ maxWidth: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '4px', cursor: 'pointer' }} />
                  </a>
                </div>
              </div>
            )}

            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '12px' }}>Submitted by: {feedback.userName || 'Resident'} (Ref: {feedback.referenceID})</div>
          </div>

          {/* Staff Action Section */}
          <h3 className="section-title" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', color: '#334155' }}>Staff Action</h3>
          
          <div className="detail-item" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>Update Status</label>
            <select className="filter-select" style={{ width: '100%', padding: '10px' }} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="pending_ai" disabled>Pending AI Processing</option>
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
          <button 
            className="btn-approve" 
            onClick={() => onSave(feedback.docId, adminNote, newStatus)} 
            disabled={needsAI}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: needsAI ? 0.5 : 1, cursor: needsAI ? 'not-allowed' : 'pointer' }}
          >
            <CheckCircle size={16} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}