import React, { useState, useEffect } from "react";
import {
  Manage_IconLocation,
  Manage_IconCalendar,
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
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../../services/logger";

const PREVIEW_LIMIT = 120;

// ── Today's date as YYYY-MM-DD (used for QR token) ───────────────────────────
const getTodayStr = () => new Date().toISOString().split("T")[0];

function DescriptionPreview({ text }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;
  const isLong = text.length > PREVIEW_LIMIT;
  return (
    <p className="as-card-desc" style={{ marginBottom: 0 }}>
      {isLong && !expanded ? text.slice(0, PREVIEW_LIMIT) + "…" : text}
      {isLong && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            marginLeft: 6, background: "none", border: "none", padding: 0,
            color: "#317D89", fontWeight: 700, fontSize: "0.8rem",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {expanded ? "Show Less" : "Read More"}
        </button>
      )}
    </p>
  );
}

const EMPTY_PROGRAM = {
  title: "",
  description: "",
  date: "",       // start date
  endDate: "",    // end date (new — for multi-day programs)
  startTime: "",
  endTime: "",
  location: "",
  demographic: "",
  slots: "",
  requirements: [""],
  customFields: [],
};

export default function ManagePrograms() {
  const [programs, setPrograms]           = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [adminName, setAdminName]         = useState("");
  const [adminRole, setAdminRole]         = useState("");
  const [searchTerm, setSearchTerm]       = useState("");
  const [currentPage, setCurrentPage]     = useState(1);
  const ITEMS_PER_PAGE = 8;
  const [selectedQR, setSelectedQR]       = useState(null);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [saving, setSaving]               = useState(false);
  const [newProgram, setNewProgram]       = useState(EMPTY_PROGRAM);

  // ── Auth: get admin info ─────────────────────────────────────────────────────
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

  // ── Real-time Programs listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "Programs"),
      (snapshot) => {
        setPrograms(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingPrograms(false);
      },
      (error) => {
        console.error("Error fetching programs:", error);
        setLoadingPrograms(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // ── QR Generation ─────────────────────────────────────────────────────────────
  // QR URL includes:
  //   dt        = today's date (YYYY-MM-DD) — rotates every 24 hours
  //   type      = "program"
  //   startDate = program start date
  //   endDate   = program end date (same as startDate if single-day)
  const handleGenerateQR = (prog) => {
    const today     = getTodayStr();
    const startDate = prog.date    || today;
    const endDate   = prog.endDate || prog.date || today;
    const base      = "https://3-sense.vercel.app/";
    const url =
      `${base}?serviceId=${encodeURIComponent(prog.id)}` +
      `&serviceName=${encodeURIComponent(prog.title)}` +
      `&category=Programs` +
      `&type=program` +
      `&dt=${today}` +
      `&startDate=${startDate}` +
      `&endDate=${endDate}`;
    setSelectedQR({ name: prog.title, qrValue: url });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData    = new XMLSerializer().serializeToString(svgElement);
    const canvas     = document.createElement("canvas");
    const ctx        = canvas.getContext("2d");
    const img        = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const link      = document.createElement("a");
      link.href       = canvas.toDataURL("image/png");
      link.download   = `3Sense-QR-${selectedQR.name}-${getTodayStr()}.png`;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // ── Requirements helpers ──────────────────────────────────────────────────────
  const handleReqChange = (index, value) => {
    const updated = [...newProgram.requirements];
    updated[index] = value;
    setNewProgram({ ...newProgram, requirements: updated });
  };
  const addReqField    = () => setNewProgram({ ...newProgram, requirements: [...newProgram.requirements, ""] });
  const removeReqField = (index) => setNewProgram({ ...newProgram, requirements: newProgram.requirements.filter((_, i) => i !== index) });

  // ── Edit ──────────────────────────────────────────────────────────────────────
  const handleEdit = (prog) => {
    setNewProgram({
      title:        prog.title        || "",
      description:  prog.description  || "",
      date:         prog.date         || "",
      endDate:      prog.endDate      || prog.date || "",
      startTime:    prog.startTime    || "",
      endTime:      prog.endTime      || "",
      location:     prog.location     || "",
      demographic:  prog.demographic  || "",
      slots:        prog.slots        || "",
      requirements: prog.requirements?.length > 0 ? prog.requirements : [""],
      customFields: prog.customFields || [],
    });
    setEditingProgramId(prog.id);
    setShowAddModal(true);
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (id, progTitle) => {
    if (!window.confirm("Are you sure you want to delete this program?")) return;
    try {
      await deleteDoc(doc(db, "Programs", id));
      logTransaction(adminName, adminRole, "DELETED_PROGRAM", `Deleted program "${progTitle}" ID: ${id}`);
    } catch (error) {
      console.error("Error deleting program:", error);
      logTransaction(adminName, adminRole, "FAILED_DELETE_PROGRAM", `Failed to delete program "${progTitle}" ID: ${id} - ${error.message}`);
      alert("Failed to delete program. Please try again.");
    }
  };

  // ── Save (add / update) ───────────────────────────────────────────────────────
  const handleAddProgram = async (e) => {
    e.preventDefault();
    setSaving(true);

    const programData = {
      title:        newProgram.title,
      description:  newProgram.description,
      date:         newProgram.date,
      endDate:      newProgram.endDate || newProgram.date,
      startTime:    newProgram.startTime,
      endTime:      newProgram.endTime,
      time:         newProgram.startTime && newProgram.endTime
                      ? `${newProgram.startTime} - ${newProgram.endTime}`
                      : "",
      location:     newProgram.location,
      demographic:  newProgram.demographic,
      slots:        newProgram.slots,
      requirements: newProgram.requirements.filter((r) => r.trim() !== ""),
      customFields: newProgram.customFields || [],
    };

    try {
      if (editingProgramId) {
        await updateDoc(doc(db, "Programs", editingProgramId), {
          ...programData,
          updatedAt: serverTimestamp(),
        });
        logTransaction(adminName, adminRole, "UPDATED_PROGRAM", `Updated program "${newProgram.title}" ID: ${editingProgramId}`);
      } else {
        await addDoc(collection(db, "Programs"), {
          ...programData,
          status:    "Upcoming",
          createdAt: serverTimestamp(),
        });
        logTransaction(adminName, adminRole, "CREATED_PROGRAM", `Created new program: "${newProgram.title}"`);
      }
      setNewProgram(EMPTY_PROGRAM);
      setEditingProgramId(null);
      setShowAddModal(false);
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program. Please try again.");
      logTransaction(adminName, adminRole,
        editingProgramId ? "FAILED_UPDATE_PROGRAM" : "FAILED_CREATE_PROGRAM",
        `Failed to ${editingProgramId ? "update" : "create"} program "${newProgram.title}" - ${error.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const openAddModal = () => {
    setEditingProgramId(null);
    setNewProgram(EMPTY_PROGRAM);
    setShowAddModal(true);
  };

  // ── Pagination ────────────────────────────────────────────────────────────────
  const filteredPrograms  = programs.filter((p) => p.title?.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages        = Math.ceil(filteredPrograms.length / ITEMS_PER_PAGE);
  const paginatedPrograms = filteredPrograms.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch = (val) => { setSearchTerm(val); setCurrentPage(1); };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3)                  pages.push(1, 2, 3, 4, "...", totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else                                    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => typeof page === "number" ? setCurrentPage(page) : null}
        disabled={typeof page !== "number"}
        style={{ cursor: typeof page === "number" ? "pointer" : "default", border: typeof page !== "number" ? "none" : "", background: typeof page !== "number" ? "transparent" : "" }}
      >
        {page}
      </button>
    ));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Programs</h1>
          <p className="as-subtitle">Manage barangay programs, slots, and requirements</p>
        </div>
        <button className="as-btn-aqua" onClick={openAddModal}><IconAdd /> Add New Program</button>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search programs..." value={searchTerm} onChange={(e) => handleSearch(e.target.value)} />
        </div>
      </div>

      {loadingPrograms ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "0.95rem" }}>Loading programs...</div>
      ) : filteredPrograms.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: "0.95rem" }}>
          {searchTerm ? "No programs match your search." : "No programs yet. Click 'Add New Program' to create one."}
        </div>
      ) : (
        <>
          <div className="as-card-grid">
            {paginatedPrograms.map((prog) => (
              <div className="as-card" key={prog.id}>
                <div className="as-card-header">
                  <h2 className="as-card-title">{prog.title}</h2>
                  <span className={`as-badge ${prog.status?.toLowerCase().replace(" ", "-")}`}>{prog.status}</span>
                </div>
                <DescriptionPreview text={prog.description} />
                <ul className="as-card-details">
                  <li><Manage_IconLocation /> {prog.location}</li>
                  <li>
                    <Manage_IconCalendar />
                    {prog.date}
                    {prog.endDate && prog.endDate !== prog.date ? ` → ${prog.endDate}` : ""}
                    {" • "}{prog.time}
                  </li>
                  <li><strong>Target:</strong> {prog.demographic}</li>
                  <li><strong>Slots:</strong> {prog.slots || "Unlimited"}</li>
                </ul>
                <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "#6B7280" }}>
                  <strong>Requirements:</strong>{" "}
                  {prog.requirements?.length > 0 ? prog.requirements.join(", ") : "None"}
                </div>
                <div className="as-card-footer" style={{ gap: "10px", display: "flex", flexWrap: "wrap" }}>
                  <button className="as-btn-ghost" style={{ padding: "8px 16px", flex: 1 }} onClick={() => handleEdit(prog)}>Edit</button>
                  <button
                    className="as-btn-ghost"
                    style={{ padding: "8px 16px", flex: 1, color: "red", borderColor: "#fca5a5" }}
                    onClick={() => handleDelete(prog.id, prog.title)}
                  >
                    Delete
                  </button>
                  <button className="as-qr-btn" style={{ width: "100%", marginTop: "5px" }} onClick={() => handleGenerateQR(prog)}>
                    <Manage_IconQR /> Generate QR Code
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="af-pagination" style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "16px" }}>
              <button className="af-page-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Previous</button>
              {renderPageNumbers()}
              <button className="af-page-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
            </div>
          )}
        </>
      )}

      {/* ── Add / Edit Modal ── */}
      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "700px", width: "100%" }}>
            <div className="as-modal-header">
              <h2>{editingProgramId ? "Edit Program" : "Add Program"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ alignItems: "stretch" }}>
              <form className="as-form" onSubmit={handleAddProgram}>

                <div className="as-form-group">
                  <label className="as-form-label">Program Title</label>
                  <input type="text" className="as-form-input" required value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })} />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Description</label>
                  <textarea className="as-form-textarea" required value={newProgram.description}
                    onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })} />
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Location</label>
                    <input type="text" className="as-form-input" required value={newProgram.location}
                      onChange={(e) => setNewProgram({ ...newProgram, location: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Target Demographic</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. Students, Seniors" value={newProgram.demographic}
                      onChange={(e) => setNewProgram({ ...newProgram, demographic: e.target.value })} />
                  </div>
                </div>

                <div className="as-form-row">
                  {/* Start Date */}
                  <div className="as-form-group">
                    <label className="as-form-label">Start Date</label>
                    <input type="date" className="as-form-input" required value={newProgram.date}
                      onChange={(e) => setNewProgram({ ...newProgram, date: e.target.value })} />
                  </div>
                  {/* End Date — NEW */}
                  <div className="as-form-group">
                    <label className="as-form-label">
                      End Date
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 400, marginLeft: 4 }}>
                        (same as start if 1 day)
                      </span>
                    </label>
                    <input type="date" className="as-form-input"
                      min={newProgram.date || undefined}
                      value={newProgram.endDate}
                      onChange={(e) => setNewProgram({ ...newProgram, endDate: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Start Time</label>
                    <input type="time" className="as-form-input" required value={newProgram.startTime}
                      onChange={(e) => setNewProgram({ ...newProgram, startTime: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">End Time</label>
                    <input type="time" className="as-form-input" required value={newProgram.endTime}
                      onChange={(e) => setNewProgram({ ...newProgram, endTime: e.target.value })} />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Available Slots</label>
                    <input type="number" className="as-form-input" placeholder="Leave blank if unlimited" value={newProgram.slots}
                      onChange={(e) => setNewProgram({ ...newProgram, slots: e.target.value })} />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Requirements (List)</label>
                  {newProgram.requirements.map((req, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <input type="text" className="as-form-input" placeholder="e.g. Valid ID" value={req}
                        onChange={(e) => handleReqChange(i, e.target.value)} />
                      {newProgram.requirements.length > 1 && (
                        <button type="button" className="as-btn-ghost" onClick={() => removeReqField(i)} style={{ padding: "0 10px", color: "red" }}>&times;</button>
                      )}
                    </div>
                  ))}
                  <button type="button" className="as-btn-ghost" onClick={addReqField} style={{ width: "fit-content", padding: "5px 10px", fontSize: "0.9rem" }}>
                    + Add Requirement
                  </button>
                </div>

                <div className="as-form-section" style={{ marginTop: "20px" }}>
                  <h3 className="as-form-section-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "12px", marginTop: "-10px" }}>
                    The following information is automatically collected. Do not recreate them in the form builder.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {["Full Name", "Complete Address", "Contact Number", "Email (Optional)", "Upload Valid ID / Clearance"].map((f) => (
                      <span key={f} style={{ background: "#f3f4f6", color: "#4b5563", padding: "4px 10px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <FormBuilder
                  fields={newProgram.customFields}
                  onChange={(fields) => setNewProgram({ ...newProgram, customFields: fields })}
                />

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: "8px 16px", fontSize: "0.9rem" }} disabled={saving}>
                    {saving ? "Saving..." : "Save Program"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── QR Modal ── */}
      {selectedQR && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "450px" }}>
            <div className="as-modal-header">
              <h2>QR Code Generated</h2>
              <button className="as-modal-close" onClick={() => setSelectedQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ textAlign: "center" }}>
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedQR.name}</h3>

              {/* Daily rotation notice */}
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", marginBottom: "12px", fontSize: "0.82rem", color: "#92400e", textAlign: "left" }}>
                ⚠️ <strong>This QR is valid for today only ({getTodayStr()}).</strong> Generate a new one each day the program is active.
              </div>

              <p className="as-modal-desc">Residents can scan this code to access {selectedQR.name}.</p>
              <div className="as-qr-holder" style={{ margin: "20px auto", display: "flex", justifyContent: "center" }}>
                <QRCodeSVG id="as-qr-svg" value={selectedQR.qrValue} size={150} level={"H"} includeMargin={true} />
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: "100%" }}>
                <IconDownload /> Download QR Code (PNG)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}