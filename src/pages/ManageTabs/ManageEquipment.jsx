import React, { useState, useEffect } from "react";
import { Manage_IconClock, IconAdd, Manage_IconQR, IconDownload, IconConfirmCheck, ChevronLeftIcon, ChevronRightIcon } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../../firebase/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";

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

export default function ManageEquipment() {
  const [equipmentList, setEquipmentList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingEquipmentId, setEditingEquipmentId] = useState(null);

  const [purposeInput, setPurposeInput] = useState("");
  const [editingPurposeIdx, setEditingPurposeIdx] = useState(null);
  const [purposeFormError, setPurposeFormError] = useState("");

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // Mock calendar state
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, "approvedAdmins"), where("uid", "==", user.uid));
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
    // BOUNDED QUERY: Cap the inventory fetch to 100 items to prevent unbounded read growth
    const eqQuery = query(
      collection(db, "equipment"),
      orderBy("createdAt", "desc"), // Show newly added equipment at the top
      limit(100)
    );

    const unsubscribe = onSnapshot(eqQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEquipmentList(data);
    });
    
    return () => unsubscribe();
  }, []);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const toggleDate = async (dateStr) => {
    if (!selectedEquipment) return;
    const current = selectedEquipment.blockedDates || [];
    let newBlocked;
    if (current.includes(dateStr)) newBlocked = current.filter(d => d !== dateStr);
    else newBlocked = [...current, dateStr];
    
    setSelectedEquipment(prev => ({...prev, blockedDates: newBlocked}));
    
    try {
      await updateDoc(doc(db, "equipment", selectedEquipment.id), { blockedDates: newBlocked });
    } catch(err) {
      console.error(err);
    }
  };

  const [newEquipment, setNewEquipment] = useState({
    equipmentName: "", quantity: "", description: "", available: true, purposeOptions: []
  });

  const handleEdit = (eq) => {
    setNewEquipment({ 
      equipmentName:  eq.equipmentName || eq.name || "",
      quantity:       eq.quantity || "", 
      description:    eq.description || eq.fullDescription || "",
      available:      eq.available !== false,
      purposeOptions: eq.purposeOptions || []
    });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setEditingEquipmentId(eq.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this equipment?")) {
      try {
        await deleteDoc(doc(db, "equipment", id));
        logTransaction(adminName, adminRole, "DELETED_EQUIPMENT", `Deleted equipment with ID: ${id}`);
      } catch(error) {
        console.error("Error deleting equipment: ", error);
        logTransaction(adminName, adminRole, "ERROR_DELETING_EQUIPMENT", `Error deleting equipment with ID: ${id} - ${error.message}`);
      }
    }
  };

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    if (!newEquipment.purposeOptions || newEquipment.purposeOptions.length === 0) {
      setPurposeFormError("At least one Purpose option is required before saving.");
      return;
    }
    setPurposeFormError("");
    try {
      if (editingEquipmentId) {
        await updateDoc(doc(db, "equipment", editingEquipmentId), { ...newEquipment, updatedAt: serverTimestamp() });
        logTransaction(adminName, adminRole, "EDITED_EQUIPMENT", `Edited equipment: ${newEquipment.equipmentName} (ID: ${editingEquipmentId})`);
      } else {
        const newRef = await addDoc(collection(db, "equipment"), { ...newEquipment, createdAt: serverTimestamp() });
        await updateDoc(newRef, { equipmentID: newRef.id });
        logTransaction(adminName, adminRole, "ADDED_EQUIPMENT", `Added new equipment: ${newEquipment.equipmentName} (ID: ${newRef.id})`);
      }
      setNewEquipment({ equipmentName: "", quantity: "", description: "", available: true, purposeOptions: [] });
      setPurposeInput("");
      setEditingPurposeIdx(null);
      setPurposeFormError("");
      setEditingEquipmentId(null);
      setShowAddModal(false);
    } catch(error) {
      console.error("Error saving equipment: ", error);
    }
  };

  const openAddModal = () => {
    setEditingEquipmentId(null);
    setNewEquipment({ equipmentName: "", quantity: "", description: "", available: true, purposeOptions: [] });
    setPurposeInput("");
    setEditingPurposeIdx(null);
    setPurposeFormError("");
    setShowAddModal(true);
  };

  const openCalendar = (eq) => {
    setSelectedEquipment(eq);
    setShowCalendarModal(true);
  };

  const handleGenerateGlobalQR = () => {
    const residentAppUrl = "https://3-sense.vercel.app/";
    const encodedUrl = `${residentAppUrl}?serviceId=equipment_global&serviceName=${encodeURIComponent("Equipment Rental")}&category=Equipment`;
    setSelectedQR({ name: "Equipment Rental Portal", qrValue: encodedUrl });
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
      downloadLink.download = `3Sense-QR-Equipment.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filteredEqs = equipmentList.filter(e => (e.equipmentName || e.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredEqs.length / ITEMS_PER_PAGE);
  const paginatedEqs = filteredEqs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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
          <h1>Equipment Rentals</h1>
          <p className="as-subtitle">Manage barangay equipment inventory and rental availability</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="as-qr-btn" onClick={handleGenerateGlobalQR}>
            <Manage_IconQR /> Generate Global QR
          </button>
          <button className="as-btn-aqua" onClick={openAddModal}>
            <IconAdd /> Add Equipment
          </button>
        </div>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search equipment..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      <div className="as-card-grid">
        {paginatedEqs.map((eq) => (
          <div className="as-card" key={eq.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{eq.equipmentName || eq.name}</h2>
              <span className={`as-badge ${eq.available ? "open" : "ongoing"}`}>
                {eq.available ? "Available" : "Unavailable"}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}><DescriptionPreview text={eq.description || eq.fullDescription} /></div>
            <ul className="as-card-details">
              <li><strong>Total Inventory:</strong> {eq.quantity ? `${eq.quantity} units` : "—"}</li>
            </ul>
            <div className="as-card-footer" style={{ gap: '10px', display: 'flex', flexWrap: 'wrap' }}>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => openCalendar(eq)}>Block Dates</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => handleEdit(eq)}>Edit</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1, color: 'red', borderColor: '#fca5a5' }} onClick={() => handleDelete(eq.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="af-pagination" style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "16px" }}>
          <button className="af-page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
          {renderPageNumbers()}
          <button className="af-page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
        </div>
      )}

      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '800px', width: '100%' }}>
            <div className="as-modal-header">
              <h2>{editingEquipmentId ? "Edit Equipment" : "Add Equipment"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddEquipment}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="as-form-group">
                  <label className="as-form-label">Equipment Name</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. Monobloc Chairs, Tents"
                      value={newEquipment.equipmentName} onChange={(e) => setNewEquipment({...newEquipment, equipmentName: e.target.value})} 
                    />
                  </div>

                  <div className="as-form-group">
                    <label className="as-form-label">Total Quantity</label>
                    <input type="number" className="as-form-input" required placeholder="e.g. 50" min="1"
                      value={newEquipment.quantity} onChange={(e) => setNewEquipment({...newEquipment, quantity: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="as-form-group">
                    <label className="as-form-label">Description & Condition</label>
                    <textarea className="as-form-textarea" required rows="3" placeholder="Details about the equipment, condition, dimensions, etc."
                      value={newEquipment.description} onChange={(e) => setNewEquipment({...newEquipment, description: e.target.value})} 
                    />
                </div>

                <div className="as-form-section">
                  <h3 className="as-form-section-title">Availability Setting</h3>
                  <label className="as-checkbox-label">
                    <input type="checkbox" className="as-checkbox" checked={newEquipment.available} onChange={(e) => setNewEquipment({...newEquipment, available: e.target.checked})} />
                    Available for Rental
                  </label>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px', marginTop: '-10px' }}>The following information is automatically collected for rentals. Do not recreate them below.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {["Full Name", "Contact Number", "Purpose of Rental", "Quantity Requested", "Pick-up Date", "Return Date", "Additional Notes"].map(f => (
                      <span key={f} style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                {/* ── Purpose Options Manager ── */}
                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                    Purpose of Rental Options <span style={{ color: '#e03e3e', marginLeft: 2 }}>*</span>
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '10px', marginTop: '-2px' }}>
                    These options appear in the "Purpose of Rental" dropdown on the resident request form. An "Other" option is always included automatically.
                  </p>
                  {purposeFormError && (
                    <p style={{ fontSize: '0.8rem', color: '#e03e3e', fontWeight: 600, marginBottom: '8px' }}>{purposeFormError}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <input
                      type="text" className="as-form-input" placeholder="e.g. Wake, Fiesta, Birthday, Assembly..."
                      value={purposeInput} onChange={e => setPurposeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = purposeInput.trim();
                          if (!val) return;
                          if (editingPurposeIdx !== null) {
                            const updated = [...newEquipment.purposeOptions];
                            updated[editingPurposeIdx] = val;
                            setNewEquipment({ ...newEquipment, purposeOptions: updated });
                            setEditingPurposeIdx(null);
                          } else {
                            setNewEquipment({ ...newEquipment, purposeOptions: [...(newEquipment.purposeOptions || []), val] });
                          }
                          setPurposeInput(''); setPurposeFormError('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="as-btn-aqua" style={{ padding: '8px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                      onClick={() => {
                        const val = purposeInput.trim();
                        if (!val) return;
                        if (editingPurposeIdx !== null) {
                          const updated = [...newEquipment.purposeOptions];
                          updated[editingPurposeIdx] = val;
                          setNewEquipment({ ...newEquipment, purposeOptions: updated });
                          setEditingPurposeIdx(null);
                        } else {
                          setNewEquipment({ ...newEquipment, purposeOptions: [...(newEquipment.purposeOptions || []), val] });
                        }
                        setPurposeInput(''); setPurposeFormError('');
                      }}
                    >
                      {editingPurposeIdx !== null ? 'Update' : '+ Add'}
                    </button>
                    {editingPurposeIdx !== null && (
                      <button type="button" className="as-btn-ghost" style={{ padding: '8px 12px', fontSize: '0.82rem' }} onClick={() => { setEditingPurposeIdx(null); setPurposeInput(''); }}>Cancel</button>
                    )}
                  </div>
                  {(newEquipment.purposeOptions || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(newEquipment.purposeOptions || []).map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2eaf3', borderRadius: '8px', padding: '6px 10px' }}>
                          <span style={{ flex: 1, fontSize: '0.83rem', color: '#0f1f35' }}>{opt}</span>
                          <button type="button" onClick={() => { setEditingPurposeIdx(idx); setPurposeInput(opt); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#317D89', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px' }}>Edit</button>
                          <button type="button" onClick={() => {
                              const updated = (newEquipment.purposeOptions || []).filter((_, i) => i !== idx);
                              setNewEquipment({ ...newEquipment, purposeOptions: updated });
                              if (editingPurposeIdx === idx) { setEditingPurposeIdx(null); setPurposeInput(''); }
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e03e3e', fontSize: '0.75rem', fontWeight: 700, padding: '2px 6px' }}
                          >Remove</button>
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0faf5', border: '1px dashed #a7d7c1', borderRadius: '8px', padding: '6px 10px' }}>
                        <span style={{ flex: 1, fontSize: '0.83rem', color: '#2DB17B', fontStyle: 'italic' }}>Other (always included – shows a free-text field)</span>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#a0b5c8', fontStyle: 'italic' }}>No options added yet. Add at least one above.</p>
                  )}
                </div>

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Save Equipment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCalendarModal && selectedEquipment && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '600px' }}>
            <div className="as-modal-header">
              <h2>Block Dates - {selectedEquipment.equipmentName || selectedEquipment.name}</h2>
              <button className="as-modal-close" onClick={() => setShowCalendarModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ padding: '20px' }}>
              <p className="as-modal-desc" style={{ marginBottom: '20px', textAlign: 'center' }}>
                Click a date to mark it as completely blocked (e.g. out for maintenance). Red dates cannot be selected for rentals.
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
                    const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
                    const isBlocked = (selectedEquipment?.blockedDates || []).includes(dateStr);
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
                  <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--available" />Available</span>
                  <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--reserved" />Blocked</span>
                </div>
              </div>
              
              <div className="as-modal-actions" style={{ justifyContent: 'flex-end', marginTop: '30px' }}>
                <button className="as-btn-aqua" onClick={() => setShowCalendarModal(false)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedQR && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '450px' }}>
            <div className="as-modal-header">
              <h2>QR Code Generated</h2>
              <button className="as-modal-close" onClick={() => setSelectedQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ textAlign: 'center' }}>
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedQR.name}</h3>
              <p className="as-modal-desc">Residents can scan this shared code to access the Equipment Rental page.</p>
              <div className="as-qr-holder" style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG id="as-qr-svg" value={selectedQR.qrValue} size={150} level={"H"} includeMargin={true}/>
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: '100%' }}><IconDownload /> Download QR Code (PNG)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}