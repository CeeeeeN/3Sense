import React, { useState, useEffect, useMemo } from "react";
import { Manage_IconClock, IconAdd, Manage_IconQR, IconDownload, IconConfirmCheck, ChevronLeftIcon, ChevronRightIcon } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../../firebase/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, getDocs, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";
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

export default function ManageFacilities() {
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showConfirm, showAlert } = useAlert();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingFacilityId, setEditingFacilityId] = useState(null);

  const [purposeInput, setPurposeInput] = useState("");
  const [editingPurposeIdx, setEditingPurposeIdx] = useState(null);
  const [purposeFormError, setPurposeFormError] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ['adminManage_facilities'],
    queryFn: async () => {
      const facQuery = query(
        collection(db, "facilities"),
        orderBy("createdAt", "desc"),
        limit(150)
      );
      const snapshot = await getDocs(facQuery);
      return snapshot.docs.map(doc => {
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
  }, [searchTerm, filterAvailability, sortOrder]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const toggleDate = async (dateStr) => {
    if (!selectedFacility) return;
    const current = selectedFacility.blockedDates || [];
    let newBlocked;
    if (current.includes(dateStr)) newBlocked = current.filter(d => d !== dateStr);
    else newBlocked = [...current, dateStr];

    setSelectedFacility(prev => ({ ...prev, blockedDates: newBlocked }));

    try {
      await updateDoc(doc(db, "facilities", selectedFacility.id), { blockedDates: newBlocked });
      queryClient.invalidateQueries({ queryKey: ['adminManage_facilities'] });
    } catch (err) {
      console.error(err);
    }
  };

  const [newFacility, setNewFacility] = useState({
    facilityName: "", capacity: "", openTime: "08:00", closeTime: "17:00", description: "", available: true, purposeOptions: [], customFields: []
  });

  const handleEdit = (fac) => {
    setNewFacility({
      facilityName: fac.facilityName || fac.name || "",
      capacity: fac.capacity || "",
      openTime: fac.openTime || "08:00",
      closeTime: fac.closeTime || "17:00",
      description: fac.description || fac.fullDescription || "",
      available: fac.available !== false,
      purposeOptions: fac.purposeOptions || [],
      customFields: fac.customFields || []
    });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setEditingFacilityId(fac.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id, facName) => {
    const isConfirmed = await showConfirm(
      "Confirm Deletion",
      `${t('admin_fac_confirm_delete')}\n\n"${facName}"`
    );
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "facilities", id));
      logTransaction(
        adminName,
        adminRole,
        "DELETED_FACILITY",
        `Deleted facility with ID: ${id}`
      );
      queryClient.invalidateQueries({ queryKey: ['adminManage_facilities'] });
      await showAlert("Success", "Facility deleted successfully.");
    } catch (error) {
      console.error("Error deleting facility: ", error);
      await showAlert("Error", "Failed to delete facility. Please try again.");
      logTransaction(
        adminName,
        adminRole,
        "ERROR_DELETING_FACILITY",
        `Error deleting facility with ID: ${id}\n${error.message}`
      );
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    if (!newFacility.purposeOptions || newFacility.purposeOptions.length === 0) {
      setPurposeFormError("At least one Purpose option is required before saving.");
      return;
    }
    setPurposeFormError("");
    try {
      if (editingFacilityId) {
        await updateDoc(doc(db, "facilities", editingFacilityId), { ...newFacility, updatedAt: serverTimestamp() });
        logTransaction(adminName, adminRole, "EDITED_FACILITY", `Edited facility: ${newFacility.facilityName} (ID: ${editingFacilityId})`);
      } else {
        const newRef = await addDoc(collection(db, "facilities"), { ...newFacility, createdAt: serverTimestamp() });
        await updateDoc(newRef, { facilityID: newRef.id });
        logTransaction(adminName, adminRole, "ADDED_FACILITY", `Added new facility: ${newFacility.facilityName} (ID: ${newRef.id})`);
      }

      queryClient.invalidateQueries({ queryKey: ['adminManage_facilities'] });

      setNewFacility({ facilityName: "", capacity: "", openTime: "08:00", closeTime: "17:00", description: "", available: true, purposeOptions: [], customFields: [] });
      setPurposeInput("");
      setEditingPurposeIdx(null);
      setPurposeFormError("");
      setEditingFacilityId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving facility: ", error);
    }
  };

  const openAddModal = () => {
    setEditingFacilityId(null);
    setNewFacility({ facilityName: "", capacity: "", openTime: "08:00", closeTime: "17:00", description: "", available: true, purposeOptions: [], customFields: [] });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setShowAddModal(true);
  };

  const openCalendar = (fac) => {
    setSelectedFacility(fac);
    setShowCalendarModal(true);
  };

  const handleGenerateGlobalQR = () => {
    const residentAppUrl = "https://www.3s-sense.site/";
    const encodedUrl = `${residentAppUrl}?serviceId=facilities_global&serviceName=${encodeURIComponent("All Facilities")}&category=Facilities`;
    setSelectedQR({ name: "Facility Reservation Portal", qrValue: encodedUrl });
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
      downloadLink.download = `3Sense-QR-Facilities.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filteredFacs = useMemo(() => {
    return facilities
      .filter(f => {
        const name = (f.facilityName || f.name || "").toLowerCase();
        const matchesSearch = name.includes(searchTerm.toLowerCase());
        const isAvail = f.available !== false;
        const matchesAvail =
          filterAvailability === "All" ||
          (filterAvailability === "Available" && isAvail) ||
          (filterAvailability === "Unavailable" && !isAvail);

        return matchesSearch && matchesAvail;
      })
      .sort((a, b) => {
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortOrder === "name_asc") {
          const nameA = a.facilityName || a.name || "";
          const nameB = b.facilityName || b.name || "";
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === "name_desc") {
          const nameA = a.facilityName || a.name || "";
          const nameB = b.facilityName || b.name || "";
          return nameB.localeCompare(nameA);
        }
        if (sortOrder === "cap_desc") return Number(b.capacity || 0) - Number(a.capacity || 0);
        if (sortOrder === "cap_asc") return Number(a.capacity || 0) - Number(b.capacity || 0);
        return 0;
      });
  }, [facilities, searchTerm, filterAvailability, sortOrder]);

  const totalPages = Math.ceil(filteredFacs.length / ITEMS_PER_PAGE);
  const paginatedFacs = filteredFacs.slice(
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
    return <div style={{ padding: "40px", textAlign: "center" }}>{t('admin_fac_loading')}</div>;
  }

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{t('admin_fac_title')}</h1>
          <p className="as-subtitle">{t('admin_fac_subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="as-qr-btn" onClick={handleGenerateGlobalQR}>
            <Manage_IconQR /> {t('admin_fac_btn_global_qr')}
          </button>
          <button className="as-btn-aqua" onClick={openAddModal}>
            <IconAdd /> {t('admin_fac_btn_add')}
          </button>
        </div>
      </div>

      {/* FILTER & SORT CONTROLS - ALIGNED */}
      <div className="as-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div className="as-search-box" style={{ flex: 1, minWidth: "260px" }}>
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder={t('admin_fac_search_placeholder')} value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="All">{t('admin_fac_filter_all')}</option>
            <option value="Available">{t('admin_fac_filter_enabled')}</option>
            <option value="Unavailable">{t('admin_fac_filter_disabled')}</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
          >
            <option value="date_desc">{t('admin_fac_sort_date_new')}</option>
            <option value="date_asc">{t('admin_fac_sort_date_old')}</option>
            <option value="name_asc">{t('admin_fac_sort_name_asc')}</option>
            <option value="name_desc">{t('admin_fac_sort_name_desc')}</option>
            <option value="cap_desc">{t('admin_fac_sort_cap_desc')}</option>
            <option value="cap_asc">{t('admin_fac_sort_cap_asc')}</option>
          </select>
        </div>
      </div>

      <div className="as-card-grid">
        {paginatedFacs.map((fac) => (
          <div className="as-card" key={fac.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{fac.facilityName || fac.name}</h2>
              <span
                className="as-badge"
                style={{
                  background: fac.available !== false ? "#dcfce7" : "#fee2e2",
                  color: fac.available !== false ? "#166534" : "#991b1b",
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  whiteSpace: "nowrap"
                }}
              >
                {fac.available !== false ? t('admin_fac_card_enabled') : t('admin_fac_card_disabled')}
              </span>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <DescriptionPreview text={fac.description || fac.fullDescription} t={t} />
            </div>

            <ul className="as-card-details">
              <li>
                <strong>{t('admin_fac_card_capacity')}</strong>{" "}
                {fac.capacity ? `${t('admin_fac_card_capacity_val')} ${fac.capacity} ${t('admin_fac_card_capacity_persons')}` : "—"}
              </li>
<li>
  <strong>{t('admin_card_lbl_time')}</strong> {fac.openTime && fac.closeTime ? `${fac.openTime} – ${fac.closeTime}` : (fac.hours || "08:00 – 17:00")}
</li>
              {fac.purposeOptions && fac.purposeOptions.length > 0 && (
                <li>
                  <strong>Use Cases:</strong> {fac.purposeOptions.length} supported
                </li>
              )}
            </ul>

            <div className="as-card-footer" style={{ gap: "10px", display: "flex", flexWrap: "wrap" }}>
              <button className="as-btn-ghost" style={{ padding: "8px 16px", flex: 1 }} onClick={() => openCalendar(fac)}>
                {t('admin_fac_btn_calendar')}
              </button>
              <button className="as-btn-ghost" style={{ padding: "8px 16px", flex: 1 }} onClick={() => handleEdit(fac)}>
                {t('admin_fac_btn_edit')}
              </button>
              <button
                className="as-btn-ghost"
                style={{ padding: "8px 16px", flex: 1, color: "#dc2626", borderColor: "#fca5a5" }}
                onClick={() => handleDelete(fac.id, fac.facilityName || fac.name)}
              >
                {t('admin_fac_btn_delete')}
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
            {t('admin_doc_page_prev')}
          </button>
          {renderPageNumbers()}
          <button
            className="af-page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: "not-allowed" }}
          >
            {t('admin_doc_page_next')}
          </button>
        </div>
      )}

      {showAddModal && (
        <div className="as-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="as-modal-content" style={{ maxWidth: '800px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{editingFacilityId ? t('admin_fac_modal_edit_title') : t('admin_fac_modal_add_title')}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>

            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddFacility}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_fac_modal_name')}</label>
                    <input type="text" className="as-form-input" required placeholder={t('admin_fac_modal_name_ph')}
                      value={newFacility.facilityName} onChange={(e) => setNewFacility({ ...newFacility, facilityName: e.target.value })}
                    />
                  </div>

                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_fac_modal_capacity')}</label>
                    <input type="number" className="as-form-input" required placeholder={t('admin_fac_modal_capacity_ph')} min="1"
                      value={newFacility.capacity} onChange={(e) => setNewFacility({ ...newFacility, capacity: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_fac_modal_open')}</label>
                    <input type="time" className="as-form-input" required
                      value={newFacility.openTime} onChange={(e) => setNewFacility({ ...newFacility, openTime: e.target.value })}
                    />
                  </div>

                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_fac_modal_close')}</label>
                    <input type="time" className="as-form-input" required
                      value={newFacility.closeTime} onChange={(e) => setNewFacility({ ...newFacility, closeTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">{t('admin_fac_modal_desc')}</label>
                  <textarea className="as-form-textarea" required rows="3" placeholder={t('admin_fac_modal_desc_ph')}
                    value={newFacility.description} onChange={(e) => setNewFacility({ ...newFacility, description: e.target.value })}
                  />
                </div>

                <div className="as-form-section">
                  <h3 className="as-form-section-title">{t('admin_fac_modal_avail_title')}</h3>
                  <label className="as-checkbox-label">
                    <input type="checkbox" className="as-checkbox" checked={newFacility.available} onChange={(e) => setNewFacility({ ...newFacility, available: e.target.checked })} />
                    {t('admin_fac_modal_avail_check')}
                  </label>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    {t('admin_doc_modal_default_fields')}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px', marginTop: '-10px' }}>{t('admin_doc_modal_default_desc')}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {["Full Name", "Contact Number", "Purpose of Reservation", "Reservation Date", "Start Time", "End Time", "Estimated Number of Pax", "Additional Notes"].map(f => (
                      <span key={f} style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    {t('admin_doc_modal_purpose_title')} <span style={{ color: '#e03e3e', marginLeft: 2 }}>*</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '10px', marginTop: '-2px' }}>
                    {t('admin_doc_modal_purpose_desc')}
                  </p>
                  {purposeFormError && (
                    <p style={{ fontSize: '0.8rem', color: '#e03e3e', fontWeight: 600, marginBottom: '8px' }}>{purposeFormError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      className="as-form-input"
                      placeholder={t('admin_doc_modal_purpose_ph')}
                      value={purposeInput}
                      onChange={e => setPurposeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = purposeInput.trim();
                          if (!val) return;
                          if (editingPurposeIdx !== null) {
                            const updated = [...newFacility.purposeOptions];
                            updated[editingPurposeIdx] = val;
                            setNewFacility({ ...newFacility, purposeOptions: updated });
                            setEditingPurposeIdx(null);
                          } else {
                            setNewFacility({ ...newFacility, purposeOptions: [...(newFacility.purposeOptions || []), val] });
                          }
                          setPurposeInput('');
                          setPurposeFormError('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="as-btn-aqua"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const val = purposeInput.trim();
                        if (!val) return;
                        if (editingPurposeIdx !== null) {
                          const updated = [...newFacility.purposeOptions];
                          updated[editingPurposeIdx] = val;
                          setNewFacility({ ...newFacility, purposeOptions: updated });
                          setEditingPurposeIdx(null);
                        } else {
                          setNewFacility({ ...newFacility, purposeOptions: [...(newFacility.purposeOptions || []), val] });
                        }
                        setPurposeInput('');
                        setPurposeFormError('');
                      }}
                    >
                      {editingPurposeIdx !== null ? t('admin_doc_modal_purpose_btn_update') : t('admin_doc_modal_purpose_btn_add')}
                    </button>
                    {editingPurposeIdx !== null && (
                      <button
                        type="button"
                        className="as-btn-ghost"
                        style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                        onClick={() => { setEditingPurposeIdx(null); setPurposeInput(''); }}
                      >
                        {t('admin_doc_modal_purpose_btn_cancel')}
                      </button>
                    )}
                  </div>
                  {(newFacility.purposeOptions || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(newFacility.purposeOptions || []).map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2eaf3', borderRadius: '8px', padding: '6px 10px' }}>
                          <span style={{ flex: 1, fontSize: '0.83rem', color: '#0f1f35' }}>{opt}</span>
                          <button
                            type="button"
                            onClick={() => { setEditingPurposeIdx(idx); setPurposeInput(opt); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#317D89', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px' }}
                          >{t('admin_doc_modal_purpose_btn_edit')}</button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (newFacility.purposeOptions || []).filter((_, i) => i !== idx);
                              setNewFacility({ ...newFacility, purposeOptions: updated });
                              if (editingPurposeIdx === idx) { setEditingPurposeIdx(null); setPurposeInput(''); }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e03e3e', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px' }}
                          >{t('admin_doc_modal_purpose_btn_remove')}</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0faf5', border: '1px dashed #a7d7c1', borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ flex: 1, fontSize: '0.83rem', color: '#2DB17B', fontStyle: 'italic' }}>{t('admin_doc_modal_purpose_other')}</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#a0b5c8', fontStyle: 'italic' }}>{t('admin_doc_modal_purpose_empty')}</p>
                  )}
                </div>

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>{t('admin_fac_modal_btn_cancel')}</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>{t('admin_fac_modal_btn_save')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCalendarModal && selectedFacility && (
        <div className="as-modal-overlay" onClick={() => setShowCalendarModal(false)}>
          <div className="as-modal-content" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{t('admin_fac_cal_title')} {selectedFacility.name || selectedFacility.facilityName}</h2>
              <button className="as-modal-close" onClick={() => setShowCalendarModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ padding: '20px' }}>
              <p className="as-modal-desc" style={{ marginBottom: '20px', textAlign: 'center' }}>
                {t('admin_fac_cal_desc')}
              </p>

              <div className="sv-calendar" style={{ margin: '0 auto', maxWidth: '400px' }}>
                <div className="sv-cal-nav">
                  <button className="sv-cal-arrow" onClick={prevMonth}><ChevronLeftIcon /></button>
                  <span className="sv-cal-title">{MONTHS[viewMonth]} {viewYear}</span>
                  <button className="sv-cal-arrow" onClick={nextMonth}><ChevronRightIcon /></button>
                </div>
                <div className="sv-cal-grid">
                  {DAYS.map(d => <div key={d} className="sv-cal-day-label">{d}</div>)}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const isBlocked = (selectedFacility?.blockedDates || []).includes(dateStr);
                    return (
                      <button key={d}
                        className={`sv-cal-cell sv-cal-cell--${isBlocked ? "reserved" : "available"}`}
                        onClick={() => toggleDate(dateStr)}
                        style={{ cursor: 'pointer' }}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
                <div className="sv-cal-legend" style={{ justifyContent: 'center' }}>
                  <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--available" />{t('admin_fac_cal_available')}</span>
                  <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--reserved" />{t('admin_fac_cal_blocked')}</span>
                </div>
              </div>

              <div className="as-modal-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                <button className="as-btn-aqua" onClick={() => setShowCalendarModal(false)}>{t('admin_fac_cal_btn_done')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedQR && (
        <div className="as-modal-overlay" onClick={() => setSelectedQR(null)}>
          <div className="as-modal-content" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{t('admin_fac_qr_title')}</h2>
              <button className="as-modal-close" onClick={() => setSelectedQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ textAlign: 'center' }}>
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedQR.name}</h3>
              <p className="as-modal-desc">{t('admin_fac_qr_desc')}</p>
              <div className="as-qr-holder" style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG id="as-qr-svg" value={selectedQR.qrValue} size={150} level={"H"} includeMargin={true} />
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: '100%' }}><IconDownload /> {t('admin_fac_qr_download')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}