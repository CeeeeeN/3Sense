import React, { useState } from "react";
import { Manage_IconLocation, IconAdd } from "../../components/Icons";

const INITIAL_ANNOUNCEMENTS = [
  { id: "a1", title: "Water Interruption Notice", category: "Utility", description: "There will be a scheduled water interruption due to maintenance. Please store enough water.", location: "Malanday (Select areas)", audience: "All Residents", date: "2026-04-10" },
  { id: "a2", title: "Barangay Assembly", category: "Meeting", description: "Mandatory barangay assembly to discuss annual budget and projects.", location: "Barangay Multi-Purpose Hall", audience: "All Residents", date: "2026-04-20" }
];

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState(INITIAL_ANNOUNCEMENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "", category: "", description: "", location: "", audience: "All Residents"
  });

  const handleEdit = (ann) => {
    setNewAnnouncement({ ...ann });
    setEditingAnnId(ann.id);
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const handleAddAnnouncement = (e) => {
    e.preventDefault(); 
    if (editingAnnId) {
      const updatedAnn = {
        ...newAnnouncement,
        id: editingAnnId,
        date: new Date().toISOString().split("T")[0] // Keep or update date
      };
      setAnnouncements(announcements.map(a => a.id === editingAnnId ? updatedAnn : a));
    } else {
      const announcement = {
        ...newAnnouncement,
        id: `a${Date.now()}`,
        date: new Date().toISOString().split("T")[0]
      };
      setAnnouncements([announcement, ...announcements]);
    }
    setNewAnnouncement({ title: "", category: "", description: "", location: "", audience: "All Residents" });
    setEditingAnnId(null);
    setShowAddModal(false);
  };

  const openAddModal = () => {
    setEditingAnnId(null);
    setNewAnnouncement({ title: "", category: "", description: "", location: "", audience: "All Residents" });
    setShowAddModal(true);
  };

  const filteredAnnouncements = announcements.filter(a => a.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Announcements</h1>
          <p className="as-subtitle">Create and manage barangay announcements and notifications</p>
        </div>
        <button className="as-btn-aqua" onClick={openAddModal}>
          <IconAdd /> Create Announcement
        </button>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search announcements..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="as-card-grid">
        {filteredAnnouncements.map((ann) => (
          <div className="as-card" key={ann.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{ann.title}</h2>
              <span className="as-badge open" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{ann.category}</span>
            </div>
            <p className="as-card-desc">{ann.description}</p>
            <ul className="as-card-details">
              <li><Manage_IconLocation /> {ann.location}</li>
              <li><strong>Target Audience:</strong> {ann.audience}</li>
              <li><strong>Date Posted:</strong> {ann.date}</li>
            </ul>
            <div className="as-card-footer" style={{ gap: '10px', display: 'flex' }}>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => handleEdit(ann)}>Edit</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1, color: 'red', borderColor: '#fca5a5' }} onClick={() => handleDelete(ann.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '500px' }}>
            <div className="as-modal-header">
              <h2>{editingAnnId ? "Edit Announcement" : "Create Announcement"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddAnnouncement}>
                <div className="as-form-group">
                  <label className="as-form-label">Title</label>
                  <input type="text" className="as-form-input" required
                    value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})} 
                  />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Category</label>
                    <select className="as-form-select" required
                      value={newAnnouncement.category} onChange={(e) => setNewAnnouncement({...newAnnouncement, category: e.target.value})}
                    >
                      <option value="" disabled>Select category...</option>
                      <option value="General">General</option>
                      <option value="Utility">Utility / Emergency</option>
                      <option value="Meeting">Meeting / Assembly</option>
                      <option value="Health">Health</option>
                    </select>
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Target Audience</label>
                    <select className="as-form-select" 
                      value={newAnnouncement.audience} onChange={(e) => setNewAnnouncement({...newAnnouncement, audience: e.target.value})}
                    >
                      <option value="All Residents">All Residents</option>
                      <option value="Senior Citizens">Senior Citizens</option>
                      <option value="Students">Students</option>
                      <option value="PWD">PWD</option>
                    </select>
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Description</label>
                  <textarea className="as-form-textarea" required
                    value={newAnnouncement.description} onChange={(e) => setNewAnnouncement({...newAnnouncement, description: e.target.value})} 
                  />
                </div>
                
                <div className="as-form-group">
                  <label className="as-form-label">Location (Optional)</label>
                  <input type="text" className="as-form-input" placeholder="If applicable"
                    value={newAnnouncement.location} onChange={(e) => setNewAnnouncement({...newAnnouncement, location: e.target.value})} 
                  />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Attachment / Image (Optional)</label>
                  <div style={{ border: '1px dashed #d1d5db', borderRadius: '4px', padding: '20px', textAlign: 'center', backgroundColor: '#f9fafb', cursor: 'pointer' }}>
                    <svg width="24" height="24" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24" style={{ margin: '0 auto 8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>Click to upload an image or PDF</span>
                  </div>
                </div>

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua">Post Announcement</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
