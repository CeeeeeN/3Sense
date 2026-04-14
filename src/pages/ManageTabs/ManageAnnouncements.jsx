import React, { useState, useEffect } from "react";
import { Manage_IconLocation, IconAdd } from "../../components/Icons";
import { auth } from "../../firebase/firebase";
import {
  subscribeToAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from "../../services/announcements";

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    description: "",
    category: "All Residents",
    announcementCategory: "General",
    requirements: [""],
    location: "",
    time: ""
  });

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  const handleReqChange = (index, value) => {
    const updated = [...newAnnouncement.requirements];
    updated[index] = value;
    setNewAnnouncement({ ...newAnnouncement, requirements: updated });
  };

  const addReqField = () => setNewAnnouncement({ ...newAnnouncement, requirements: [...newAnnouncement.requirements, ""] });
  const removeReqField = (index) => setNewAnnouncement({ ...newAnnouncement, requirements: newAnnouncement.requirements.filter((_, i) => i !== index) });

  const handleEdit = (ann) => {
    setNewAnnouncement({
      title: ann.title || "",
      description: ann.description || "",
      category: ann.category || "All Residents",
      announcementCategory: ann.announcementCategory || "General",
      requirements: Array.isArray(ann.requirements) && ann.requirements.length > 0 ? ann.requirements : [""],
      location: ann.location || "",
      time: ann.time || ""
    });
    setEditingAnnId(ann.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        await deleteAnnouncement(id);
      } catch (error) {
        console.error("Error deleting announcement:", error);
        alert("Failed to delete announcement.");
      }
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault(); 
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      if (editingAnnId) {
        await updateAnnouncement(editingAnnId, newAnnouncement);
      } else {
        const adminID = auth.currentUser ? auth.currentUser.uid : "Admin";
        const emailHost = auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : "Barangay Admin";
        const autoPostedBy = auth.currentUser?.displayName || emailHost;
        await createAnnouncement({ ...newAnnouncement, postedBy: autoPostedBy }, adminID);
      }
      
      setNewAnnouncement({
        title: "", description: "", category: "All Residents", announcementCategory: "General", requirements: [""], location: "", time: ""
      });
      setEditingAnnId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Failed to save announcement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingAnnId(null);
    setNewAnnouncement({
      title: "", description: "", category: "All Residents", announcementCategory: "General", requirements: [""], location: "", time: ""
    });
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
        {filteredAnnouncements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', gridColumn: '1 / -1' }}>No announcements found.</div>
        ) : filteredAnnouncements.map((ann) => (
          <div className="as-card" key={ann.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{ann.title}</h2>
              <span className="as-badge open" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{ann.announcementCategory}</span>
            </div>
            <p className="as-card-desc">{ann.description}</p>
            <ul className="as-card-details">
              <li><Manage_IconLocation /> {ann.location || "TBA"}</li>
              {ann.time && <li><strong>Time:</strong> {new Date(ann.time).toLocaleString()}</li>}
              <li><strong>Target Audience:</strong> {ann.category}</li>
              <li><strong>Date Posted:</strong> {ann.date}</li>
              <li><strong>Posted By:</strong> {ann.postedBy}</li>
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
          <div className="as-modal-content" style={{ maxWidth: '600px' }}>
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
                    <label className="as-form-label">Category (Target Audience)</label>
                    <select className="as-form-select" required
                      value={newAnnouncement.category} onChange={(e) => setNewAnnouncement({...newAnnouncement, category: e.target.value})}
                    >
                      <option value="All Residents">All Residents</option>
                      <option value="Student">Student</option>
                      <option value="Senior Citizen">Senior Citizen</option>
                      <option value="PWD">PWD</option>
                      <option value="Solo Parent">Solo Parent</option>
                      <option value="OFW">OFW</option>
                      <option value="Indigenous People">Indigenous People</option>
                      <option value="LGBT">LGBT</option>
                    </select>
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Announcement Category</label>
                    <select className="as-form-select" required
                      value={newAnnouncement.announcementCategory} onChange={(e) => setNewAnnouncement({...newAnnouncement, announcementCategory: e.target.value})}
                    >
                      <option value="General">General</option>
                      <option value="Documents">Documents</option>
                      <option value="Facilities">Facilities</option>
                      <option value="Programs">Programs</option>
                      <option value="Service">Service</option>
                      <option value="Event">Event</option>
                      <option value="Health">Health</option>
                    </select>
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Description</label>
                  <textarea className="as-form-textarea" required
                    value={newAnnouncement.description} onChange={(e) => setNewAnnouncement({...newAnnouncement, description: e.target.value})} 
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Requirements (List)</label>
                  {Array.isArray(newAnnouncement.requirements) && newAnnouncement.requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <input type="text" className="as-form-input" placeholder="e.g. Valid ID"
                        value={req} onChange={(e) => handleReqChange(i, e.target.value)}
                      />
                      {newAnnouncement.requirements.length > 1 && (
                        <button type="button" className="as-btn-ghost" onClick={() => removeReqField(i)}
                          style={{ padding: "0 10px", color: "red" }}>&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="as-btn-ghost" onClick={addReqField}
                    style={{ width: "fit-content", padding: "5px 10px", fontSize: "0.9rem" }}>
                    + Add Requirement
                  </button>
                </div>
                
                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Location (Optional)</label>
                    <input type="text" className="as-form-input" placeholder="e.g., Barangay Hall"
                      value={newAnnouncement.location} onChange={(e) => setNewAnnouncement({...newAnnouncement, location: e.target.value})} 
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Date & Time (Optional)</label>
                    <input type="datetime-local" className="as-form-input"
                      value={newAnnouncement.time} onChange={(e) => setNewAnnouncement({...newAnnouncement, time: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : (editingAnnId ? "Update Announcement" : "Post Announcement")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
