import React, { useState, useEffect, useMemo } from "react";
import { Manage_IconLocation, IconAdd } from "../../components/Icons";
import { auth, db } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  subscribeToAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from "../../services/announcements";
import EmailBlastModal from "../../components/EmailBlastModal";
import { buildAnnouncementEmail } from "../../utils/emailTemplates";

const PREVIEW_LIMIT = 120;

function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;
  const isLong = text.length > PREVIEW_LIMIT;
  return (
    <p className="as-card-desc" style={{ marginBottom: 0 }}>
      {isLong && !expanded ? text.slice(0, PREVIEW_LIMIT) + "…" : text}
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 6, background: 'none', border: 'none', padding: 0,
            color: '#317D89', fontWeight: 700, fontSize: '0.8rem',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {expanded ? 'Show Less' : 'Read More'}
        </button>
      )}
    </p>
  );
}

export default function ManageAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc"); // date_desc, date_asc, title_asc, title_desc
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");

  const [showEmailBlast, setShowEmailBlast] = useState(false);
  const [emailBlastTarget, setEmailBlastTarget] = useState(null);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid),
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setAdminName(data.fullName || "Admin");
          setAdminRole(data.role || "Standard Admin");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, sortOrder]);

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

  const handleEmailBlast = (ann) => {
    setEmailBlastTarget(ann);
    setShowEmailBlast(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        await deleteAnnouncement(id);
        logTransaction(
          adminName,
          adminRole,
          "DELETED_ANNOUNCEMENT",
          `Deleted announcement with ID: ${id}`,
        );
      } catch (error) {
        console.error("Error deleting announcement:", error);
        alert("Failed to delete announcement.");
        logTransaction(
          adminName,
          adminRole,
          "ERROR_DELETING_ANNOUNCEMENT",
          `Error deleting announcement with ID: ${id} - ${error.message}`,
        );
      }
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (newAnnouncement.time) {
      const selected = new Date(newAnnouncement.time);
      if (selected < new Date()) {
        setDateError("Date cannot be in the past.");
        return;
      }
    }
    setDateError("");
    setIsSubmitting(true);

    try {
      if (editingAnnId) {
        await updateAnnouncement(editingAnnId, newAnnouncement);
        logTransaction(
          adminName,
          adminRole,
          "EDITED_ANNOUNCEMENT",
          `Edited announcement with ID: ${editingAnnId}`,
        );
      } else {
        const adminID = auth.currentUser ? auth.currentUser.uid : "Admin";
        const emailHost = auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : "Barangay Admin";
        const autoPostedBy = auth.currentUser?.displayName || emailHost;
        await createAnnouncement({ ...newAnnouncement, postedBy: autoPostedBy }, adminID);
        logTransaction(
          adminName,
          adminRole,
          "ADDED_ANNOUNCEMENT",
          `Added new announcement: ${newAnnouncement.title}`,
        );
      }

      setNewAnnouncement({
        title: "", description: "", category: "All Residents", announcementCategory: "General", requirements: [""], location: "", time: ""
      });
      setEditingAnnId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert("Failed to save announcement.");
      logTransaction(
        adminName,
        adminRole,
        "ERROR_SAVING_ANNOUNCEMENT",
        `Error saving announcement (${editingAnnId ? "editing" : "adding"}): ${error.message}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingAnnId(null);
    setNewAnnouncement({
      title: "", description: "", category: "All Residents", announcementCategory: "General", requirements: [""], location: "", time: ""
    });
    setDateError("");
    setShowAddModal(true);
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter(a => {
        const matchesSearch = (a.title || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === "All" || (a.category || "").toLowerCase() === filterCategory.toLowerCase();
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);

        if (sortOrder === "date_desc") return dateB - dateA;
        if (sortOrder === "date_asc") return dateA - dateB;
        if (sortOrder === "title_asc") return (a.title || "").localeCompare(b.title || "");
        if (sortOrder === "title_desc") return (b.title || "").localeCompare(a.title || "");
        return 0;
      });
  }, [announcements, searchTerm, filterCategory, sortOrder]);

  const totalPages = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === "number" ? setCurrentPage(page) : null}
        disabled={typeof page !== "number"}
        style={{
          cursor: typeof page === "number" ? "pointer" : "default",
          border: typeof page !== "number" ? "none" : "",
          background: typeof page !== "number" ? "transparent" : "",
        }}
      >
        {page}
      </button>
    ));
  };

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

      {/* FILTER & SORT CONTROLS - ALIGNED */}
      <div className="as-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div className="as-search-box" style={{ flex: 1, minWidth: "260px" }}>
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search announcements..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="All">All Audiences</option>
            <option value="All Residents">All Residents</option>
            <option value="Student">Student</option>
            <option value="Senior Citizen">Senior Citizen</option>
            <option value="PWD">PWD</option>
            <option value="Solo Parent">Solo Parent</option>
            <option value="OFW">OFW</option>
            <option value="Indigenous People">Indigenous People</option>
            <option value="LGBT">LGBT</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="date_desc">Posted: Newest First</option>
            <option value="date_asc">Posted: Oldest First</option>
            <option value="title_asc">Title: A to Z</option>
            <option value="title_desc">Title: Z to A</option>
          </select>
        </div>
      </div>

      <div className="as-card-grid">
        {filteredAnnouncements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', gridColumn: '1 / -1' }}>No announcements found.</div>
        ) : paginatedAnnouncements.map((ann) => (
          <div className="as-card" key={ann.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{ann.title}</h2>
              <span className="as-badge open" style={{ backgroundColor: '#e0e7ff', color: '#4338ca' }}>{ann.announcementCategory}</span>
            </div>
            <DescriptionPreview text={ann.description} />
            <ul className="as-card-details">
              <li><Manage_IconLocation /> {ann.location || "TBA"}</li>
              {ann.time && <li><strong>Time:</strong> {new Date(ann.time).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</li>}
              <li><strong>Target Audience:</strong> {ann.category}</li>
              <li><strong>Date Posted:</strong> {ann.date}</li>
              <li><strong>Posted By:</strong> {ann.postedBy}</li>
            </ul>
            <div className="as-card-footer" style={{ gap: '8px', display: 'flex' }}>
              <button className="as-btn-ghost" style={{ padding: '8px 12px', flex: 1 }} onClick={() => handleEdit(ann)}>Edit</button>
              <button
                className="as-btn-ghost"
                style={{ padding: '8px 12px', flex: 1, color: '#0369a1', borderColor: '#bae6fd', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                onClick={() => handleEmailBlast(ann)}
                title="Send email notification to eligible residents"
              >
                Email
              </button>
              <button className="as-btn-ghost" style={{ padding: '8px 12px', flex: 1, color: 'red', borderColor: '#fca5a5' }} onClick={() => handleDelete(ann.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="af-pagination" style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "16px" }}>
          <button
            className="af-page-btn"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: "not-allowed" }}
          >
            Previous
          </button>
          {renderPageNumbers()}
          <button
            className="af-page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: "not-allowed" }}
          >
            Next
          </button>
        </div>
      )}

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
                    value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Category (Target Audience)</label>
                    <select className="as-form-select" required
                      value={newAnnouncement.category} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, category: e.target.value })}
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
                      value={newAnnouncement.announcementCategory} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, announcementCategory: e.target.value })}
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
                    value={newAnnouncement.description} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
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
                      value={newAnnouncement.location} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, location: e.target.value })}
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Date &amp; Time (Optional)</label>
                    <input
                      type="datetime-local"
                      className="as-form-input"
                      min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                      value={newAnnouncement.time}
                      onChange={(e) => {
                        setNewAnnouncement({ ...newAnnouncement, time: e.target.value });
                        setDateError("");
                      }}
                    />
                    {dateError && (
                      <p style={{ color: "#e03e3e", fontSize: "0.8rem", marginTop: "6px", marginBottom: 0 }}>
                        ⚠ {dateError}
                      </p>
                    )}
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

      {showEmailBlast && emailBlastTarget && (
        <EmailBlastModal
          sourceType="announcement"
          sourceId={emailBlastTarget.id}
          subject={`[3S+ Sense] ${emailBlastTarget.title}`}
          html={buildAnnouncementEmail(emailBlastTarget)}
          label={
            !emailBlastTarget.category || emailBlastTarget.category.trim().toLowerCase() === 'all residents'
              ? 'All Residents'
              : `Category: ${emailBlastTarget.category}`
          }
          announcement={emailBlastTarget}
          onClose={() => {
            setShowEmailBlast(false);
            setEmailBlastTarget(null);
            logTransaction(adminName, adminRole, "EMAILED_ANNOUNCEMENT", `Email blast sent for announcement: ${emailBlastTarget?.title}`);
          }}
        />
      )}
    </div>
  );
}