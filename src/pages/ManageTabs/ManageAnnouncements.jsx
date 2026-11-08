import React, { useState, useEffect, useMemo } from "react";
import { Manage_IconLocation, IconAdd } from "../../components/Icons";
import { auth, db } from "../../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from "../../services/announcements";
import EmailBlastModal from "../../components/EmailBlastModal";
import { buildAnnouncementEmail } from "../../utils/emailTemplates";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext'; // NEW: Language Hook
import { useAlert } from "../../context/AlertContext";

const PREVIEW_LIMIT = 120;

function DescriptionPreview({ text, t }) {
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
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showConfirm, showAlert } = useAlert();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setAdminName(parsed.fullName);
          setAdminRole(parsed.role);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['adminManage_announcements'],
    queryFn: async () => {
      const annQuery = query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
        limit(150)
      );
      const snapshot = await getDocs(annQuery);
      return snapshot.docs.map((doc) => {
        const docData = doc.data();
        const rawDate = docData.createdAt?.toDate ? docData.createdAt.toDate().getTime() : (docData.createdAt ? new Date(docData.createdAt).getTime() : 0);
        return {
          id: doc.id,
          rawDate,
          ...docData
        };
      });
    },
    staleTime: 1000 * 60 * 30,
  });

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

  const handleDelete = async (id, annTitle) => {
    const isConfirmed = await showConfirm(
      "Confirm Deletion",
      `${t('admin_ann_confirm_delete')}\n\n"${annTitle}"`
    );
    if (!isConfirmed) return;

    try {
      await deleteAnnouncement(id);
      logTransaction(
        adminName,
        adminRole,
        "DELETED_ANNOUNCEMENT",
        `Deleted announcement with ID: ${id}`
      );
      queryClient.invalidateQueries({ queryKey: ['adminManage_announcements'] });
      await showAlert("Success", "Announcement deleted successfully.");
    } catch (error) {
      console.error("Error deleting announcement:", error);
      await showAlert("Error", t('admin_ann_delete_failed'));
      logTransaction(
        adminName,
        adminRole,
        "ERROR_DELETING_ANNOUNCEMENT",
        `Error deleting announcement with ID: ${id}\n${error.message}`
      );
    }
  };

  const handleAddAnnouncement = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (newAnnouncement.time) {
      const selected = new Date(newAnnouncement.time);
      if (selected < new Date()) {
        setDateError(t('admin_ann_modal_err_past'));
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

      queryClient.invalidateQueries({ queryKey: ['adminManage_announcements'] });

      setNewAnnouncement({
        title: "", description: "", category: "All Residents", announcementCategory: "General", requirements: [""], location: "", time: ""
      });
      setEditingAnnId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving announcement:", error);
      alert(t('admin_ann_save_failed'));
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
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
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

  if (isLoading) {
    return <div style={{ padding: "40px", textAlign: "center" }}>{t('admin_ann_loading')}</div>;
  }

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{t('admin_ann_title')}</h1>
          <p className="as-subtitle">{t('admin_ann_subtitle')}</p>
        </div>
        <button className="as-btn-aqua" onClick={openAddModal}>
          <IconAdd /> {t('admin_ann_btn_add')}
        </button>
      </div>

      {/* FILTER & SORT CONTROLS - ALIGNED */}
      <div className="as-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div className="as-search-box" style={{ flex: 1, minWidth: "260px" }}>
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder={t('admin_ann_search_placeholder')} value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="All">{t('admin_ann_filter_audience_all')}</option>
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
            <option value="date_desc">{t('admin_ann_sort_date_new')}</option>
            <option value="date_asc">{t('admin_ann_sort_date_old')}</option>
            <option value="title_asc">{t('admin_ann_sort_title_asc')}</option>
            <option value="title_desc">{t('admin_ann_sort_title_desc')}</option>
          </select>
        </div>
      </div>

      <div className="as-card-grid">
        {filteredAnnouncements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', gridColumn: '1 / -1' }}>
            {t('admin_ann_empty')}
          </div>
        ) : paginatedAnnouncements.map((ann) => (
          <div className="as-card" key={ann.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{ann.title}</h2>
              <span
                className="as-badge"
                style={{
                  backgroundColor: "#ede9fe",
                  color: "#6d28d9",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  whiteSpace: "nowrap"
                }}
              >
                {ann.announcementCategory || "General"}
              </span>
            </div>

            <DescriptionPreview text={ann.description} t={t} />

            <ul className="as-card-details" style={{ marginTop: "12px" }}>
              <li>
                <strong>{t('admin_card_lbl_location')}</strong>
                <span style={{ textAlign: "right", maxWidth: "65%", wordBreak: "break-word" }}>
                  {ann.location || t('admin_ann_card_tba')}
                </span>
              </li>
              {ann.time && (
                <li>
                  <strong>{t('admin_card_lbl_time')}</strong>
                  <span style={{ textAlign: "right", maxWidth: "65%" }}>
                    {new Date(ann.time).toLocaleString(t('app_name') ? (t('admin_ann_title') === 'Mga Anunsyo' ? 'fil-PH' : 'en-US') : 'en-US', {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </li>
              )}
              <li>
                <strong>{t('admin_ann_card_audience')}</strong>
                <span style={{ textAlign: "right" }}>{ann.category}</span>
              </li>
              <li>
                <strong>{t('admin_ann_card_date_posted')}</strong>
                <span>{ann.date || "—"}</span>
              </li>
              <li>
                <strong>{t('admin_ann_card_posted_by')}</strong>
                <span style={{ textAlign: "right", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={ann.postedBy || "Admin"}>
                  {ann.postedBy || "Admin"}
                </span>
              </li>
            </ul>

            <div className="as-card-footer" style={{ gap: "8px", display: "flex" }}>
              <button className="as-btn-ghost" style={{ padding: "8px 12px", flex: 1 }} onClick={() => handleEdit(ann)}>
                {t('admin_ann_btn_edit')}
              </button>
              <button
                className="as-btn-ghost"
                style={{ padding: "8px 12px", flex: 1, color: "#0369a1", borderColor: "#bae6fd" }}
                onClick={() => handleEmailBlast(ann)}
                title={t('admin_ann_btn_email_title')}
              >
                {t('admin_ann_btn_email')}
              </button>
              <button
                className="as-btn-ghost"
                style={{ padding: "8px 12px", flex: 1, color: "#dc2626", borderColor: "#fca5a5" }}
                onClick={() => handleDelete(ann.id, ann.title)}
              >
                {t('admin_ann_btn_delete')}
              </button>
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
            {t('admin_ann_page_prev')}
          </button>
          {renderPageNumbers()}
          <button
            className="af-page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: "not-allowed" }}
          >
            {t('admin_ann_page_next')}
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="as-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="as-modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{editingAnnId ? t('admin_ann_modal_edit_title') : t('admin_ann_modal_add_title')}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddAnnouncement}>
                <div className="as-form-group">
                  <label className="as-form-label">{t('admin_ann_modal_title_label')}</label>
                  <input type="text" className="as-form-input" required
                    value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_ann_modal_category_label')}</label>
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
                    <label className="as-form-label">{t('admin_ann_modal_ann_category')}</label>
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
                  <label className="as-form-label">{t('admin_ann_modal_desc')}</label>
                  <textarea className="as-form-textarea" required
                    value={newAnnouncement.description} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">{t('admin_ann_modal_req_list')}</label>
                  {Array.isArray(newAnnouncement.requirements) && newAnnouncement.requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <input type="text" className="as-form-input" placeholder={t('admin_ann_modal_req_ph')}
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
                    {t('admin_ann_modal_req_add')}
                  </button>
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_ann_modal_location')}</label>
                    <input type="text" className="as-form-input" placeholder={t('admin_ann_modal_location_ph')}
                      value={newAnnouncement.location} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, location: e.target.value })}
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_ann_modal_datetime')}</label>
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
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)} disabled={isSubmitting}>{t('admin_ann_modal_btn_cancel')}</button>
                  <button type="submit" className="as-btn-aqua" disabled={isSubmitting}>
                    {isSubmitting ? t('admin_ann_modal_btn_saving') : (editingAnnId ? t('admin_ann_modal_btn_update') : t('admin_ann_modal_btn_save'))}
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