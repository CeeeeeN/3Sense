import React, { useState, useEffect, useMemo } from "react";
import {
  Manage_IconClock,
  IconAdd,
  Manage_IconQR,
  IconDownload,
  IconConfirmCheck,
} from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import FormBuilder from "../../components/FormBuilder";
import { auth, db } from "../../firebase/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '../../context/LanguageContext'; // NEW: Import hook
import { useAlert } from "../../context/AlertContext";

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

export default function ManageDocuments() {
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showConfirm, showAlert } = useAlert();

  const [searchTerm, setSearchTerm] = useState("");
  const [sortCatalog, setSortCatalog] = useState("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [newDocument, setNewDocument] = useState({
    documentName: "",
    processingTime: "",
    fee: "",
    description: "",
    reminder: "",
    purposeOptions: [],
    customFields: [],
  });
  const [purposeInput, setPurposeInput] = useState("");
  const [editingPurposeIdx, setEditingPurposeIdx] = useState(null);
  const [purposeFormError, setPurposeFormError] = useState("");

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

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['adminManage_documents'],
    queryFn: async () => {
      const docsQuery = query(
        collection(db, "documents"),
        orderBy("createdAt", "desc"),
        limit(150)
      );
      const snapshot = await getDocs(docsQuery);
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
  }, [searchTerm, sortCatalog]);

  const handleEdit = (docType) => {
    setNewDocument({
      documentName:   docType.documentName || docType.title || "",
      processingTime: docType.processingTime || "",
      fee:            docType.fee || "",
      description:    docType.description || "",
      reminder:       docType.reminder || "",
      purposeOptions: docType.purposeOptions || [],
      customFields:   docType.customFields || [],
    });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setEditingDocId(docType.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id, docName) => {
    const isConfirmed = await showConfirm(
      "Confirm Deletion",
      `${t('admin_doc_confirm_delete')}\n\n"${docName}"`
    );
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "documents", id));
      logTransaction(
        adminName,
        adminRole,
        "DELETED_DOCUMENT_TYPE",
        `Deleted document type with ID: ${id}`
      );
      queryClient.invalidateQueries({ queryKey: ['adminManage_documents'] });
      await showAlert("Success", "Document type deleted successfully.");
    } catch (error) {
      console.error("Error deleting document type: ", error);
      await showAlert("Error", "Failed to delete document type. Please try again.");
      logTransaction(
        adminName,
        adminRole,
        "ERROR_DELETING_DOCUMENT_TYPE",
        `Error deleting document type with ID: ${id}\n${error.message}`
      );
    }
  };

  const handleAddDocument = async (e) => {
    e.preventDefault();
    if (!newDocument.purposeOptions || newDocument.purposeOptions.length === 0) {
      setPurposeFormError("At least one Purpose option is required before saving.");
      return;
    }
    setPurposeFormError("");
    try {
      if (editingDocId) {
        await updateDoc(doc(db, "documents", editingDocId), { ...newDocument, updatedAt: serverTimestamp() });
        logTransaction(adminName, adminRole, "EDITED_DOCUMENT_TYPE", `Edited document type: ${newDocument.documentName} (ID: ${editingDocId})`);
      } else {
        const newRef = await addDoc(collection(db, "documents"), {
          ...newDocument,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(newRef, { documentID: newRef.id });
        logTransaction(adminName, adminRole, "ADDED_DOCUMENT_TYPE", `Added new document type: ${newDocument.documentName} (ID: ${newRef.id})`);
      }
      
      queryClient.invalidateQueries({ queryKey: ['adminManage_documents'] });

      setNewDocument({
        documentName: "",
        processingTime: "",
        fee: "",
        description: "",
        reminder: "",
        purposeOptions: [],
        customFields: [],
      });
      setPurposeInput("");
      setEditingPurposeIdx(null);
      setPurposeFormError("");
      setEditingDocId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving document type: ", error);
      logTransaction(
        adminName,
        adminRole,
        "ERROR_SAVING_DOCUMENT_TYPE",
        `Error saving document type: ${newDocument.documentName}\n${error.message}`,
      );
    }
  };

  const openAddModal = () => {
    setEditingDocId(null);
    setNewDocument({
      documentName: "",
      processingTime: "",
      fee: "",
      description: "",
      reminder: "",
      purposeOptions: [],
      customFields: [],
    });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setShowAddModal(true);
  };

  const handleGenerateGlobalQR = () => {
    const residentAppUrl = "https://www.3s-sense.site/";
    const encodedUrl = `${residentAppUrl}?serviceId=documents_global&serviceName=${encodeURIComponent("All Documents")}&category=Documents`;
    setSelectedQR({ name: "Document Request Portal", qrValue: encodedUrl });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `3Sense-QR-Documents.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filteredDocs = useMemo(() => {
    return documents
      .filter((d) =>
        (d.documentName || d.title || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortCatalog === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortCatalog === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortCatalog === "name_asc") {
          const nameA = a.documentName || a.title || "";
          const nameB = b.documentName || b.title || "";
          return nameA.localeCompare(nameB);
        }
        if (sortCatalog === "name_desc") {
          const nameA = a.documentName || a.title || "";
          const nameB = b.documentName || b.title || "";
          return nameB.localeCompare(nameA);
        }
        return 0;
      });
  }, [documents, searchTerm, sortCatalog]);

  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  const paginatedDocs = filteredDocs.slice(
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
    return <div style={{ padding: "40px", textAlign: "center" }}>{t('admin_doc_loading')}</div>;
  }

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{t('admin_doc_title')}</h1>
          <p className="as-subtitle">{t('admin_doc_subtitle')}</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="as-qr-btn" onClick={handleGenerateGlobalQR}>
            <Manage_IconQR /> {t('admin_doc_btn_global_qr')}
          </button>
          <button className="as-btn-aqua" onClick={openAddModal}>
            <IconAdd /> {t('admin_doc_btn_add')}
          </button>
        </div>
      </div>

      {/* SEARCH AND SORT TOOLBAR */}
      <div className="as-controls" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div className="as-search-box" style={{ flex: 1, minWidth: "260px" }}>
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="#9CA3AF"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
          <input
            type="text"
            placeholder={t('admin_doc_search_placeholder')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        <select
          value={sortCatalog}
          onChange={(e) => setSortCatalog(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff", cursor: "pointer" }}
        >
          <option value="date_desc">{t('admin_doc_sort_date_new')}</option>
          <option value="date_asc">{t('admin_doc_sort_date_old')}</option>
          <option value="name_asc">{t('admin_doc_sort_name_asc')}</option>
          <option value="name_desc">{t('admin_doc_sort_name_desc')}</option>
        </select>
      </div>

      <div className="as-card-grid">
        {paginatedDocs.map((doc) => (
          <div className="as-card" key={doc.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{doc.documentName || doc.title}</h2>
            </div>
            {doc.description && (
              <div style={{ marginBottom: "10px" }}><DescriptionPreview text={doc.description} /></div>
            )}
            <ul className="as-card-details">
              <li>
                <Manage_IconClock /> <strong>{t('admin_doc_card_processing')}</strong>{" "}
                {doc.processingTime}
              </li>
              <li>
                <strong>{t('admin_doc_card_fee')}</strong> {doc.fee}
              </li>
            </ul>
            <div
              className="as-card-footer"
              style={{ gap: "10px", display: "flex" }}
            >
              <button
                className="as-btn-ghost"
                style={{ padding: "8px 16px", flex: 1 }}
                onClick={() => handleEdit(doc)}
              >
                {t('admin_doc_btn_edit')}
              </button>
              <button
                className="as-btn-ghost"
                style={{
                  padding: "8px 16px",
                  flex: 1,
                  color: "red",
                  borderColor: "#fca5a5",
                }}
                onClick={() => handleDelete(doc.id, doc.documentName || doc.title)}
              >
                {t('admin_doc_btn_delete')}
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
          <div className="as-modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>
                {editingDocId ? t('admin_doc_modal_edit_title') : t('admin_doc_modal_add_title')}
              </h2>
              <button
                className="as-modal-close"
                onClick={() => setShowAddModal(false)}
              >
                &times;
              </button>
            </div>

            <div className="as-modal-body" style={{ alignItems: "stretch" }}>
              <form className="as-form" onSubmit={handleAddDocument}>
                <div className="as-form-group">
                  <label className="as-form-label">{t('admin_doc_modal_name')}</label>
                  <input
                    type="text"
                    className="as-form-input"
                    required
                    placeholder={t('admin_doc_modal_name_ph')}
                    value={newDocument.documentName}
                    onChange={(e) =>
                      setNewDocument({ ...newDocument, documentName: e.target.value })
                    }
                  />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_doc_modal_time')}</label>
                    <input
                      type="text"
                      className="as-form-input"
                      required
                      placeholder={t('admin_doc_modal_time_ph')}
                      value={newDocument.processingTime}
                      onChange={(e) =>
                        setNewDocument({
                          ...newDocument,
                          processingTime: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">{t('admin_doc_modal_fee')}</label>
                    <input
                      type="text"
                      className="as-form-input"
                      required
                      placeholder={t('admin_doc_modal_fee_ph')}
                      value={newDocument.fee}
                      onChange={(e) =>
                        setNewDocument({ ...newDocument, fee: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">{t('admin_doc_modal_desc')}</label>
                  <input
                    type="text"
                    className="as-form-input"
                    placeholder={t('admin_doc_modal_desc_ph')}
                    value={newDocument.description}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">
                    {t('admin_doc_modal_reminder')}
                  </label>
                  <textarea
                    className="as-form-textarea"
                    rows="2"
                    placeholder={t('admin_doc_modal_reminder_ph')}
                    value={newDocument.reminder}
                    onChange={(e) =>
                      setNewDocument({
                        ...newDocument,
                        reminder: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="as-form-section" style={{ marginTop: "20px" }}>
                  <h3
                    className="as-form-section-title"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="3"
                        y="11"
                        width="18"
                        height="11"
                        rx="2"
                        ry="2"
                      ></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    {t('admin_doc_modal_default_fields')}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      marginBottom: "12px",
                      marginTop: "-10px",
                    }}
                  >
                    {t('admin_doc_modal_default_desc')}
                  </p>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {[
                      "First Name",
                      "Middle Name",
                      "Last Name",
                      "Date of Birth",
                      "Civil Status",
                      "Complete Address",
                      "Contact Number",
                      "Email",
                      "Residing Since (Year)",
                      "Purpose of Request",
                    ].map((f) => (
                      <span
                        key={f}
                        style={{
                          background: "#f3f4f6",
                          color: "#4b5563",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="11"
                            width="18"
                            height="11"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
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
                            const updated = [...newDocument.purposeOptions];
                            updated[editingPurposeIdx] = val;
                            setNewDocument({ ...newDocument, purposeOptions: updated });
                            setEditingPurposeIdx(null);
                          } else {
                            setNewDocument({ ...newDocument, purposeOptions: [...(newDocument.purposeOptions || []), val] });
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
                          const updated = [...newDocument.purposeOptions];
                          updated[editingPurposeIdx] = val;
                          setNewDocument({ ...newDocument, purposeOptions: updated });
                          setEditingPurposeIdx(null);
                        } else {
                          setNewDocument({ ...newDocument, purposeOptions: [...(newDocument.purposeOptions || []), val] });
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
                  {(newDocument.purposeOptions || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(newDocument.purposeOptions || []).map((opt, idx) => (
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
                              const updated = (newDocument.purposeOptions || []).filter((_, i) => i !== idx);
                              setNewDocument({ ...newDocument, purposeOptions: updated });
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

                <FormBuilder
                  fields={newDocument.customFields}
                  onChange={(fields) =>
                    setNewDocument({ ...newDocument, customFields: fields })
                  }
                />

                <div className="as-modal-actions">
                  <button
                    type="button"
                    className="as-btn-ghost"
                    onClick={() => setShowAddModal(false)}
                  >
                    {t('admin_doc_modal_btn_cancel_main')}
                  </button>
                  <button
                    type="submit"
                    className="as-btn-aqua"
                    style={{ padding: "8px 16px", fontSize: "0.9rem" }}
                  >
                    {t('admin_doc_modal_btn_save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedQR && (
        <div className="as-modal-overlay" onClick={() => setSelectedQR(null)}>
          <div className="as-modal-content" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="as-modal-header">
              <h2>{t('admin_doc_qr_title')}</h2>
              <button
                className="as-modal-close"
                onClick={() => setSelectedQR(null)}
              >
                &times;
              </button>
            </div>
            <div className="as-modal-body" style={{ textAlign: "center" }}>
              <div className="as-modal-confirm-icon">
                <IconConfirmCheck />
              </div>
              <h3>{selectedQR.name}</h3>
              <p className="as-modal-desc">
                {t('admin_doc_qr_desc')}
              </p>
              <div
                className="as-qr-holder"
                style={{
                  margin: "20px auto",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG
                  id="as-qr-svg"
                  value={selectedQR.qrValue}
                  size={150}
                  level={"H"}
                  includeMargin={true}
                />
              </div>
              <button
                className="as-btn-ghost"
                onClick={handleDownloadQR}
                style={{ width: "100%" }}
              >
                <IconDownload /> {t('admin_doc_qr_download')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}