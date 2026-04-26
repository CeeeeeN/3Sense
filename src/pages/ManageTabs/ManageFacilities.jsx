import React, { useState, useEffect } from "react";
import { Manage_IconClock, IconAdd, Manage_IconQR, IconDownload, IconConfirmCheck, ChevronLeftIcon, ChevronRightIcon } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import { auth, db } from "../../firebase/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
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

export default function ManageFacilities() {
  const [facilities, setFacilities] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showGlobalQRModal, setShowGlobalQRModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingFacilityId, setEditingFacilityId] = useState(null);

  // For logging purposes
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
      // Listen for the currently logged-in user
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          // Find their document in the approvedAdmins collection
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
    const unsubscribe = onSnapshot(collection(db, "facilities"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFacilities(data);
    });
    return () => unsubscribe();
  }, []);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const toggleDate = async (dateStr) => {
    if (!selectedFacility) return;
    const current = selectedFacility.blockedDates || [];
    let newBlocked;
    if (current.includes(dateStr)) newBlocked = current.filter(d => d !== dateStr);
    else newBlocked = [...current, dateStr];
    
    // Update local state for immediate feedback
    setSelectedFacility(prev => ({...prev, blockedDates: newBlocked}));
    
    // Update firestore asynchronously
    try {
      await updateDoc(doc(db, "facilities", selectedFacility.id), { blockedDates: newBlocked });
    } catch(err) {
      console.error(err);
    }
  };

  const [newFacility, setNewFacility] = useState({
    name: "", capacity: "", openTime: "08:00", closeTime: "17:00", fullDescription: "", available: true, customFields: []
  });

  const handleEdit = (fac) => {
    setNewFacility({ 
      name: fac.name, 
      capacity: fac.capacity || "", 
      openTime: fac.openTime || "08:00",
      closeTime: fac.closeTime || "17:00",
      fullDescription: fac.fullDescription || "",
      available: fac.available !== false,
      customFields: fac.customFields || []
    });
    setEditingFacilityId(fac.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this facility?")) {
      try {
        await deleteDoc(doc(db, "facilities", id));
        logTransaction(
          adminName,
          adminRole,
          "DELETED_FACILITY",
          `Deleted facility with ID: ${id}`,
        );
      } catch(error) {
        console.error("Error deleting facility: ", error);
        logTransaction(
          adminName,
          adminRole,
          "ERROR_DELETING_FACILITY",
          `Error deleting facility with ID: ${id} - ${error.message}`,
        );

      }
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    try {
      if (editingFacilityId) {
        await updateDoc(doc(db, "facilities", editingFacilityId), { ...newFacility });
        logTransaction(
          adminName,
          adminRole,
          "EDITED_FACILITY",
          `Edited facility with ID: ${editingFacilityId}`,
        );
      } else {
        await addDoc(collection(db, "facilities"), { ...newFacility, createdAt: serverTimestamp() });
        logTransaction(
          adminName,
          adminRole,
          "ADDED_FACILITY",
          `Added new facility: ${newFacility.name} (ID: ${doc.id})`,
        );
      }
      setNewFacility({ name: "", capacity: "", openTime: "08:00", closeTime: "17:00", fullDescription: "", available: true, customFields: [] });
      setEditingFacilityId(null);
      setShowAddModal(false);
    } catch(error) {
      console.error("Error saving facility: ", error);
    }
  };

  const openAddModal = () => {
    setEditingFacilityId(null);
    setNewFacility({ name: "", capacity: "", openTime: "08:00", closeTime: "17:00", fullDescription: "", available: true, customFields: [] });
    setShowAddModal(true);
  };



  const openCalendar = (fac) => {
    setSelectedFacility(fac);
    setShowCalendarModal(true);
  };

  const handleGenerateGlobalQR = () => {
    const residentAppUrl = "https://3-sense.vercel.app/";
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

  const filteredFacs = facilities.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

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

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Facilities</h1>
          <p className="as-subtitle">Manage reservable barangay facilities and availability calendar</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="as-qr-btn" onClick={handleGenerateGlobalQR}>
            <Manage_IconQR /> Generate Global QR
          </button>
          <button className="as-btn-aqua" onClick={openAddModal}>
            <IconAdd /> Add Facility
          </button>
        </div>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search facilities..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      <div className="as-card-grid">
        {paginatedFacs.map((fac) => (
          <div className="as-card" key={fac.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{fac.name}</h2>
              <span className={`as-badge ${fac.available ? "open" : "ongoing"}`}>
                {fac.available ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}><DescriptionPreview text={fac.fullDescription} /></div>
            <ul className="as-card-details">
              <li><strong>Capacity:</strong> {fac.capacity}</li>
              <li><Manage_IconClock /> {fac.openTime && fac.closeTime ? `${fac.openTime} - ${fac.closeTime}` : fac.hours}</li>
            </ul>
            <div className="as-card-footer" style={{ gap: '10px', display: 'flex', flexWrap: 'wrap' }}>
                            <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => openCalendar(fac)}>Calendar</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => handleEdit(fac)}>Edit</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1, color: 'red', borderColor: '#fca5a5' }} onClick={() => handleDelete(fac.id)}>Delete</button>
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
            style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
          >
            Previous
          </button>
          {renderPageNumbers()}
          <button
            className="af-page-btn"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
          >
            Next
          </button>
        </div>
      )}



      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '800px', width: '100%' }}>
            <div className="as-modal-header">
              <h2>{editingFacilityId ? "Edit Facility" : "Add Facility"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddFacility}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="as-form-group">
                    <label className="as-form-label">Facility Name</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. Barangay Hall"
                      value={newFacility.name} onChange={(e) => setNewFacility({...newFacility, name: e.target.value})} 
                    />
                  </div>

                  <div className="as-form-group">
                    <label className="as-form-label">Capacity</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. Up to 200 persons"
                      value={newFacility.capacity} onChange={(e) => setNewFacility({...newFacility, capacity: e.target.value})} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="as-form-group">
                    <label className="as-form-label">Opening Time</label>
                    <input type="time" className="as-form-input" required
                      value={newFacility.openTime} onChange={(e) => setNewFacility({...newFacility, openTime: e.target.value})} 
                    />
                  </div>

                  <div className="as-form-group">
                    <label className="as-form-label">Closing Time</label>
                    <input type="time" className="as-form-input" required
                      value={newFacility.closeTime} onChange={(e) => setNewFacility({...newFacility, closeTime: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Full Description</label>
                  <textarea className="as-form-textarea" required rows="3" placeholder="Hall details, inclusions like tables, chairs, stage, etc."
                    value={newFacility.fullDescription} onChange={(e) => setNewFacility({...newFacility, fullDescription: e.target.value})} 
                  />
                </div>

                <div className="as-form-section">
                  <h3 className="as-form-section-title">Availability Setting</h3>
                  <label className="as-checkbox-label">
                    <input type="checkbox" className="as-checkbox" checked={newFacility.available} onChange={(e) => setNewFacility({...newFacility, available: e.target.checked})} />
                    Available for Reservation
                  </label>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px', marginTop: '-10px' }}>The following information is automatically collected. Do not recreate them in the form builder.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {["Full Name", "Contact Number", "Purpose", "Reservation Date", "Start Time", "End Time", "Estimated Number of Pax", "Additional Notes"].map(f => (
                      <span key={f} style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>



                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Save Facility</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCalendarModal && selectedFacility && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '600px' }}>
            <div className="as-modal-header">
              <h2>Availability Calendar - {selectedFacility.name}</h2>
              <button className="as-modal-close" onClick={() => setShowCalendarModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ padding: '20px' }}>
              <p className="as-modal-desc" style={{ marginBottom: '20px', textAlign: 'center' }}>
                Click a date to toggle its availability. Red dates are blocked and cannot be reserved by users.
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
                    const isBlocked = (selectedFacility?.blockedDates || []).includes(dateStr);
                    return (
                      <button key={d} 
                        className={`sv-cal-cell sv-cal-cell--${isBlocked ? "reserved" : "available"}`}
                        onClick={() => toggleDate(dateStr)}
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
              <p className="as-modal-desc">Residents can scan this shared code to access all Facility reservations.</p>
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