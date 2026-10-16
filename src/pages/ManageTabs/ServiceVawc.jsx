import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  limit,
  where,
  getCountFromServer,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ServiceVawc({ onBack, userRole }) {
  const queryClient = useQueryClient();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [violenceFilter, setViolenceFilter] = useState("all");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Complete Case Edit Modal State
  const [editingCase, setEditingCase] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    gender: "F",
    genderOther: "",
    ageBracket: "15-17 (3d)",
    ageBracketOther: "",
    typeOfViolence: "Physical Abuse (4a)",
    typeOfViolenceOther: "",
    perpetrator: "Immediate Family Member (5a)",
    perpetratorOther: "",
    actionTaken: "Referred to LSWDO (6a)",
    actionTakenOther: "",
    status: "Acted Upon",
    remarks: "",
  });

  // Delete Confirmation State
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // New Intake Form State
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    gender: "F",
    genderOther: "",
    ageBracket: "15-17 (3d)",
    ageBracketOther: "",
    typeOfViolence: "Physical Abuse (4a)",
    typeOfViolenceOther: "",
    perpetrator: "Immediate Family Member (5a)",
    perpetratorOther: "",
    actionTaken: "Referred to LSWDO (6a)",
    actionTakenOther: "",
    status: "Acted Upon",
    remarks: "",
  });

  const isAuthorized =
    !userRole || ["Super Admin", "VAWC Head", "Kapitan", "Secretary"].includes(userRole);

  // Standard dropdown options lists
  const GENDER_OPTIONS = ["F", "M"];
  const AGE_OPTIONS = [
    "0-4 (3a)",
    "5-9 (3b)",
    "10-14 (3c)",
    "15-17 (3d)",
    "18 & above w/ disability",
  ];
  const VIOLENCE_OPTIONS = [
    "Physical Abuse (4a)",
    "Sexual Abuse (4b)",
    "Psychological/Emotional Abuse (4c)",
    "Neglect (4d)",
  ];
  const PERPETRATOR_OPTIONS = [
    "Immediate Family Member (5a)",
    "Close Relative (5b)",
    "Acquaintance (5c)",
    "Stranger (5d)",
    "Local Office (5e)",
    "Law Enforcer (5f)",
    "Others (ex: Guardian) (5g)",
  ];
  const ACTION_OPTIONS = [
    "Referred to LSWDO (6a)",
    "Referred to PNP (6b)",
    "Referred to NBI (6c)",
    "Referred for Medical Treatment (6d)",
    "Referred to Legal Assistance (6e)",
    "Others (Referred to NGO/FBO) (6f)",
  ];

  // ─── 1. OPTIMIZED: React Query for Table Cases (Bounded to 200) ───
  const { data: cases = [], isLoading: loading } = useQuery({
    queryKey: ["adminManage_vawcCases"],
    queryFn: async () => {
      const q = query(
        collection(db, "vawcCases"),
        orderBy("createdAt", "desc"),
        limit(200)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // ─── 2. OPTIMIZED: Server-Side Counts for Summary Cards ───
  const {
    data: stats = {
      totalVictims: 0,
      femaleCount: 0,
      maleCount: 0,
      actedUponCount: 0,
      pendingCount: 0,
    },
  } = useQuery({
    queryKey: ["adminManage_vawcStats"],
    queryFn: async () => {
      const vRef = collection(db, "vawcCases");
      const [total, female, male, actedUpon, pending] = await Promise.all([
        getCountFromServer(vRef),
        getCountFromServer(query(vRef, where("gender", "==", "F"))),
        getCountFromServer(query(vRef, where("gender", "==", "M"))),
        getCountFromServer(
          query(vRef, where("status", "in", ["Acted Upon", "acted upon"]))
        ),
        getCountFromServer(
          query(vRef, where("status", "in", ["Pending", "pending"]))
        ),
      ]);

      return {
        totalVictims: total.data().count,
        femaleCount: female.data().count,
        maleCount: male.data().count,
        actedUponCount: actedUpon.data().count,
        pendingCount: pending.data().count,
      };
    },
    enabled: isAuthorized,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, genderFilter, violenceFilter, rowsPerPage]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Create New Case (Zero-Read Local Cache Update) ──
  const handleSaveNewCase = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        gender: formData.gender === "Others" ? formData.genderOther.trim() : formData.gender,
        ageBracket:
          formData.ageBracket === "Others" ? formData.ageBracketOther.trim() : formData.ageBracket,
        typeOfViolence:
          formData.typeOfViolence === "Others"
            ? formData.typeOfViolenceOther.trim()
            : formData.typeOfViolence,
        perpetrator:
          formData.perpetrator === "Others"
            ? formData.perpetratorOther.trim()
            : formData.perpetrator,
        actionTaken:
          formData.actionTaken === "Others"
            ? formData.actionTakenOther.trim()
            : formData.actionTaken,
        status: formData.status,
        remarks: formData.remarks.trim(),
        referenceNumber: `VAC-${new Date().getFullYear()}-${Math.floor(
          10000 + Math.random() * 90000
        )}`,
        createdAt: serverTimestamp(),
        loggedDate: new Date().toISOString().split("T")[0],
      };

      const docRef = await addDoc(collection(db, "vawcCases"), payload);

      // Surgically prepend the new case to local memory (Saves 200 reads)
      const newCaseWithId = { id: docRef.id, ...payload, createdAt: new Date() };
      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) => [
        newCaseWithId,
        ...old,
      ]);

      // Refresh lightweight server-side counts
      queryClient.invalidateQueries({ queryKey: ["adminManage_vawcStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminManage_servicesStats"] });

      setIsAddModalOpen(false);
      setFormData({
        gender: "F",
        genderOther: "",
        ageBracket: "15-17 (3d)",
        ageBracketOther: "",
        typeOfViolence: "Physical Abuse (4a)",
        typeOfViolenceOther: "",
        perpetrator: "Immediate Family Member (5a)",
        perpetratorOther: "",
        actionTaken: "Referred to LSWDO (6a)",
        actionTakenOther: "",
        status: "Acted Upon",
        remarks: "",
      });
    } catch (err) {
      console.error("Error saving VAWC case:", err);
      alert("Failed to save VAWC Case. Please check database connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Open Complete Edit Modal ──
  const openEditModal = (item) => {
    setEditingCase(item);

    const isGenderStd = GENDER_OPTIONS.includes(item.gender);
    const isAgeStd = AGE_OPTIONS.includes(item.ageBracket);
    const isViolenceStd = VIOLENCE_OPTIONS.includes(item.typeOfViolence);
    const isPerpStd = PERPETRATOR_OPTIONS.includes(item.perpetrator);
    const isActionStd = ACTION_OPTIONS.includes(item.actionTaken);

    setEditFormData({
      gender: isGenderStd ? item.gender : "Others",
      genderOther: isGenderStd ? "" : item.gender || "",
      ageBracket: isAgeStd ? item.ageBracket : "Others",
      ageBracketOther: isAgeStd ? "" : item.ageBracket || "",
      typeOfViolence: isViolenceStd ? item.typeOfViolence : "Others",
      typeOfViolenceOther: isViolenceStd ? "" : item.typeOfViolence || "",
      perpetrator: isPerpStd ? item.perpetrator : "Others",
      perpetratorOther: isPerpStd ? "" : item.perpetrator || "",
      actionTaken: isActionStd ? item.actionTaken : "Others",
      actionTakenOther: isActionStd ? "" : item.actionTaken || "",
      status: item.status || "Acted Upon",
      remarks: item.remarks || "",
    });
  };

  // ── Save Full Case Edits (Zero-Read Local Cache Update) ──
  const handleSaveCaseEdits = async (e) => {
    e.preventDefault();
    if (!editingCase) return;
    setUpdating(true);

    try {
      const caseRef = doc(db, "vawcCases", editingCase.id);
      const updatedPayload = {
        gender: editFormData.gender === "Others" ? editFormData.genderOther.trim() : editFormData.gender,
        ageBracket:
          editFormData.ageBracket === "Others" ? editFormData.ageBracketOther.trim() : editFormData.ageBracket,
        typeOfViolence:
          editFormData.typeOfViolence === "Others"
            ? editFormData.typeOfViolenceOther.trim()
            : editFormData.typeOfViolence,
        perpetrator:
          editFormData.perpetrator === "Others"
            ? editFormData.perpetratorOther.trim()
            : editFormData.perpetrator,
        actionTaken:
          editFormData.actionTaken === "Others"
            ? editFormData.actionTakenOther.trim()
            : editFormData.actionTaken,
        status: editFormData.status,
        remarks: editFormData.remarks.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(caseRef, updatedPayload);

      // Surgically update the edited case in local memory (Saves 200 reads)
      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) =>
        old.map((c) => (c.id === editingCase.id ? { ...c, ...updatedPayload } : c))
      );

      // Refresh lightweight server-side counts
      queryClient.invalidateQueries({ queryKey: ["adminManage_vawcStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminManage_servicesStats"] });

      setEditingCase(null);
    } catch (err) {
      console.error("Failed to update case details:", err);
      alert("Error saving updated case information.");
    } finally {
      setUpdating(false);
    }
  };

  // ── Delete Case (Zero-Read Local Cache Update) ──
  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    setDeleting(true);

    try {
      await deleteDoc(doc(db, "vawcCases", caseToDelete.id));

      // Surgically remove the deleted case from local memory (Saves 200 reads)
      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) =>
        old.filter((c) => c.id !== caseToDelete.id)
      );

      // Refresh lightweight server-side counts
      queryClient.invalidateQueries({ queryKey: ["adminManage_vawcStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminManage_servicesStats"] });

      setCaseToDelete(null);
    } catch (err) {
      console.error("Error deleting VAWC case:", err);
      alert("Failed to delete case record.");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="as-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Access Denied</h2>
        <p style={{ color: "#6b7280" }}>
          You do not have administrative privileges to view the VAWC workspace.
        </p>
        <button className="as-btn-aqua" style={{ marginTop: "16px" }} onClick={onBack}>
          &larr; Return to Services Hub
        </button>
      </div>
    );
  }

  // Filtered & Searched Data
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && (c.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }
      if (genderFilter !== "all" && (c.gender || "").toLowerCase() !== genderFilter.toLowerCase()) {
        return false;
      }
      if (
        violenceFilter !== "all" &&
        !(c.typeOfViolence || "").toLowerCase().includes(violenceFilter.toLowerCase())
      ) {
        return false;
      }
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const refMatch = (c.referenceNumber || c.id || "").toLowerCase().includes(q);
        const violenceMatch = (c.typeOfViolence || "").toLowerCase().includes(q);
        const perpMatch = (c.perpetrator || "").toLowerCase().includes(q);
        const actionMatch = (c.actionTaken || "").toLowerCase().includes(q);
        const remarksMatch = (c.remarks || "").toLowerCase().includes(q);
        const dateMatch = (c.loggedDate || "").toLowerCase().includes(q);

        return refMatch || violenceMatch || perpMatch || actionMatch || remarksMatch || dateMatch;
      }
      return true;
    });
  }, [cases, statusFilter, genderFilter, violenceFilter, searchQuery]);

  // Pagination Math
  const totalPages = Math.ceil(filteredCases.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedCases = filteredCases.slice(startIndex, startIndex + rowsPerPage);

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
        pages.push(1, "...", currentPage, "...", totalPages);
      }
    }

    return pages.map((page, index) => (
      <button
        key={index}
        className={`af-page-btn ${currentPage === page ? "active" : ""}`}
        onClick={() => (typeof page === "number" ? setCurrentPage(page) : null)}
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

  const { totalVictims, femaleCount, maleCount, actedUponCount, pendingCount } = stats;

  return (
    <div className="as-container">
      {/* Top Header */}
      <div style={{ marginBottom: "20px" }}>
        <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
          &larr; Back to Services Hub
        </button>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#111827", margin: 0 }}>
              VAWC Case Management
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "4px 0 0 0" }}>
              Violence Against Women &amp; Children monitoring workspace and case intake.
            </p>
          </div>
          <button
            className="as-btn-aqua"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: "9px 18px",
              fontSize: "0.88rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            + Add New VAWC Case
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
            VAC Victims (Total)
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", marginTop: "4px" }}>
            {totalVictims}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Running count of all logged cases</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#be185d", textTransform: "uppercase" }}>
            Gender Distribution
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#be185d", marginTop: "4px" }}>
            F: {femaleCount} | M: {maleCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Female vs Male Intake</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#15803d", textTransform: "uppercase" }}>
            Acted Upon
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#15803d", marginTop: "4px" }}>
            {actedUponCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Referred or Intervened</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
            Pending
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Awaiting triage or review</span>
        </div>
      </div>

      {/* Case Directory Table Container */}
      <div
        className="section"
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          padding: "20px",
        }}
      >
        {/* Search & Filters Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>
              VAWC Incident Logs
            </h2>
            <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0" }}>
              Filter, search, edit full case details, or delete records.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search ref #, violence, perpetrator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.82rem",
                width: "240px",
              }}
            />

            {/* Filter by Status */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
            >
              <option value="all">All Status</option>
              <option value="Acted Upon">Acted Upon</option>
              <option value="Pending">Pending</option>
              <option value="Closed / Resolved">Closed / Resolved</option>
            </select>

            {/* Filter by Gender */}
            <select
              className="filter-select"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
            >
              <option value="all">All Genders</option>
              <option value="F">Female (F)</option>
              <option value="M">Male (M)</option>
            </select>

            {/* Filter by Violence Type */}
            <select
              className="filter-select"
              value={violenceFilter}
              onChange={(e) => setViolenceFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
            >
              <option value="all">All Types of Violence</option>
              <option value="Physical">Physical Abuse</option>
              <option value="Sexual">Sexual Abuse</option>
              <option value="Psychological">Psychological / Emotional</option>
              <option value="Neglect">Neglect</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            Loading VAWC records...
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            No matching VAWC records found.
          </div>
        ) : (
          <>
            <div className="req-table-wrapper" style={{ overflowX: "auto" }}>
              <table
                className="req-table"
                style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "center" }}>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>REF #</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>DATE LOGGED</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>GENDER</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>AGE</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>NATURE OF VIOLENCE</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>PERPETRATOR</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>ACTIONS TAKEN</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>STATUS</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCases.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openEditModal(c)}
                      style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}
                    >
                      <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, color: "#0f172a", textAlign: "center" }}>
                        {c.referenceNumber || c.id.substring(0, 8)}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#64748b", textAlign: "center" }}>
                        {c.loggedDate || "—"}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600, textAlign: "center" }}>
                        {c.gender}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155", textAlign: "center" }}>
                        {c.ageBracket}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 500, color: "#0f172a", textAlign: "center" }}>
                        {c.typeOfViolence}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#475569", textAlign: "center" }}>
                        {c.perpetrator}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#0d9488", fontWeight: 500, textAlign: "center" }}>
                        {c.actionTaken}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <span className={`status-badge ${(c.status || "pending").toLowerCase().replace(/\s+/g, '-')}`}>
                          {c.status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button
                          type="button"
                          className="btn-view"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(c);
                          }}
                        >
                          More Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 4px 4px 4px",
                borderTop: "1px solid #e2e8f0",
                marginTop: "12px",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "white",
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {totalPages > 1 && (
                <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {renderPageNumbers()}
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}

              <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                Showing {filteredCases.length > 0 ? startIndex + 1 : 0} to{" "}
                {Math.min(startIndex + rowsPerPage, filteredCases.length)} of {filteredCases.length} entries
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── MODAL 1: EDIT ALL CASE FIELDS ── */}
      {editingCase && (
        <div className="as-modal-overlay" onClick={() => setEditingCase(null)}>
          <div
            className="as-modal-content"
            style={{ maxWidth: "580px", padding: 0, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "16px 20px" }}>
              <div>
                <h2 style={{ color: "#111827", margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Case Details</h2>
                <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  Ref: {editingCase.referenceNumber || editingCase.id}
                </p>
              </div>
              <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => setEditingCase(null)}>
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSaveCaseEdits}
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "75vh",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {/* Edit Gender */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    GENDER (2) *
                  </label>
                  <select name="gender" value={editFormData.gender} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="F">Female (F)</option>
                    <option value="M">Male (M)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {editFormData.gender === "Others" && (
                    <input
                      type="text"
                      name="genderOther"
                      placeholder="Specify gender"
                      required
                      value={editFormData.genderOther}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Edit Age Bracket */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    AGE (3) *
                  </label>
                  <select name="ageBracket" value={editFormData.ageBracket} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="0-4 (3a)">0-4 Y.O. (3a)</option>
                    <option value="5-9 (3b)">5-9 Y.O. (3b)</option>
                    <option value="10-14 (3c)">10-14 Y.O. (3c)</option>
                    <option value="15-17 (3d)">15-17 Y.O. (3d)</option>
                    <option value="18 & above w/ disability">18 Y.O. and above with physical/mental disability</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {editFormData.ageBracket === "Others" && (
                    <input
                      type="text"
                      name="ageBracketOther"
                      placeholder="Specify age bracket"
                      required
                      value={editFormData.ageBracketOther}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Edit Types of Violence */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    TYPES OF VIOLENCE (4) *
                  </label>
                  <select name="typeOfViolence" value={editFormData.typeOfViolence} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Physical Abuse (4a)">Physical Abuse (4a)</option>
                    <option value="Sexual Abuse (4b)">Sexual Abuse (4b)</option>
                    <option value="Psychological/Emotional Abuse (4c)">Psychological / Emotional Abuse (4c)</option>
                    <option value="Neglect (4d)">Neglect (4d)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {editFormData.typeOfViolence === "Others" && (
                    <input
                      type="text"
                      name="typeOfViolenceOther"
                      placeholder="Specify type of violence"
                      required
                      value={editFormData.typeOfViolenceOther}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Edit Perpetrator */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    PERPETRATORS (5) *
                  </label>
                  <select name="perpetrator" value={editFormData.perpetrator} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Immediate Family Member (5a)">Immediate Family Member (5a)</option>
                    <option value="Close Relative (5b)">Close Relative (5b)</option>
                    <option value="Acquaintance (5c)">Acquaintance (5c)</option>
                    <option value="Stranger (5d)">Stranger (5d)</option>
                    <option value="Local Office (5e)">Local Office (5e)</option>
                    <option value="Law Enforcer (5f)">Law Enforcer (5f)</option>
                    <option value="Others">Others (ex: Guardian) (5g)</option>
                  </select>
                  {editFormData.perpetrator === "Others" && (
                    <input
                      type="text"
                      name="perpetratorOther"
                      placeholder="Specify perpetrator"
                      required
                      value={editFormData.perpetratorOther}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Edit Actions Taken */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    ACTIONS TAKEN BY THE BARANGAY / BCPC (6) *
                  </label>
                  <select name="actionTaken" value={editFormData.actionTaken} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Referred to LSWDO (6a)">Referred to LSWDO (6a)</option>
                    <option value="Referred to PNP (6b)">Referred to PNP (6b)</option>
                    <option value="Referred to NBI (6c)">Referred to NBI (6c)</option>
                    <option value="Referred for Medical Treatment (6d)">Referred for Medical Treatment (6d)</option>
                    <option value="Referred to Legal Assistance (6e)">Referred to Legal Assistance (6e)</option>
                    <option value="Others (Referred to NGO/FBO) (6f)">Others (Referred to NGO's, FBO's) (6f)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {editFormData.actionTaken === "Others" && (
                    <input
                      type="text"
                      name="actionTakenOther"
                      placeholder="Specify action taken"
                      required
                      value={editFormData.actionTakenOther}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Edit Status & Remarks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      STATUS
                    </label>
                    <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                      <option value="Acted Upon">Acted Upon</option>
                      <option value="Pending">Pending</option>
                      <option value="Closed / Resolved">Closed / Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      REMARKS
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Optional case remarks"
                      value={editFormData.remarks}
                      onChange={handleEditFormChange}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "16px 20px",
                  borderTop: "1px solid #e5e7eb",
                  background: "#f9fafb",
                }}
              >
                <button
                  type="button"
                  className="btn-reject"
                  onClick={() => {
                    const target = editingCase;
                    setEditingCase(null);
                    setCaseToDelete(target);
                  }}
                  disabled={updating}
                >
                  Delete Case
                </button>
                <button type="submit" className="as-btn-aqua" disabled={updating}>
                  {updating ? "Saving..." : "Save Case Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Delete Case Confirmation ── */}
      {caseToDelete && (
        <div className="as-modal-overlay" onClick={() => setCaseToDelete(null)}>
          <div
            className="as-modal-content"
            style={{ maxWidth: "420px", padding: 0, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "14px 18px" }}>
              <h3 style={{ color: "#dc2626", margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Confirm Deletion</h3>
              <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => setCaseToDelete(null)}>
                &times;
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "0.9rem", color: "#374151", margin: "0 0 12px 0" }}>
                Are you sure you want to permanently delete case{" "}
                <strong>{caseToDelete.referenceNumber || caseToDelete.id}</strong>?
              </p>
              <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: 0 }}>
                This record will be removed permanently from the database and will no longer appear in official reports.
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <button
                  type="button"
                  onClick={handleDeleteCase}
                  disabled={deleting}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {deleting ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Add New Case Intake Form ── */}
      {isAddModalOpen && (
        <div className="as-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="as-modal-content"
            style={{ maxWidth: "580px", padding: 0, overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="as-modal-header" style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "16px 20px" }}>
              <div>
                <h2 style={{ color: "#111827", margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Add New VAWC Case</h2>
                <p style={{ color: "#6b7280", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  Recording Incident Form for Violence Against Children/Women
                </p>
              </div>
              <button className="as-modal-close" style={{ color: "#6b7280" }} onClick={() => setIsAddModalOpen(false)}>
                &times;
              </button>
            </div>

            <form
              onSubmit={handleSaveNewCase}
              style={{
                display: "flex",
                flexDirection: "column",
                maxHeight: "75vh",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {/* Gender */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    GENDER (2) *
                  </label>
                  <select name="gender" value={formData.gender} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="F">Female (F)</option>
                    <option value="M">Male (M)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {formData.gender === "Others" && (
                    <input
                      type="text"
                      name="genderOther"
                      placeholder="Specify gender"
                      required
                      value={formData.genderOther}
                      onChange={handleFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Age Bracket */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    AGE (3) *
                  </label>
                  <select name="ageBracket" value={formData.ageBracket} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="0-4 (3a)">0-4 Y.O. (3a)</option>
                    <option value="5-9 (3b)">5-9 Y.O. (3b)</option>
                    <option value="10-14 (3c)">10-14 Y.O. (3c)</option>
                    <option value="15-17 (3d)">15-17 Y.O. (3d)</option>
                    <option value="18 & above w/ disability">18 Y.O. and above with physical/mental disability</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {formData.ageBracket === "Others" && (
                    <input
                      type="text"
                      name="ageBracketOther"
                      placeholder="Specify age bracket"
                      required
                      value={formData.ageBracketOther}
                      onChange={handleFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Types of Violence */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    TYPES OF VIOLENCE (4) *
                  </label>
                  <select name="typeOfViolence" value={formData.typeOfViolence} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Physical Abuse (4a)">Physical Abuse (4a)</option>
                    <option value="Sexual Abuse (4b)">Sexual Abuse (4b)</option>
                    <option value="Psychological/Emotional Abuse (4c)">Psychological / Emotional Abuse (4c)</option>
                    <option value="Neglect (4d)">Neglect (4d)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {formData.typeOfViolence === "Others" && (
                    <input
                      type="text"
                      name="typeOfViolenceOther"
                      placeholder="Specify type of violence"
                      required
                      value={formData.typeOfViolenceOther}
                      onChange={handleFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Perpetrators */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    PERPETRATORS (5) *
                  </label>
                  <select name="perpetrator" value={formData.perpetrator} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Immediate Family Member (5a)">Immediate Family Member (5a)</option>
                    <option value="Close Relative (5b)">Close Relative (5b)</option>
                    <option value="Acquaintance (5c)">Acquaintance (5c)</option>
                    <option value="Stranger (5d)">Stranger (5d)</option>
                    <option value="Local Office (5e)">Local Office (5e)</option>
                    <option value="Law Enforcer (5f)">Law Enforcer (5f)</option>
                    <option value="Others">Others (ex: Guardian) (5g)</option>
                  </select>
                  {formData.perpetrator === "Others" && (
                    <input
                      type="text"
                      name="perpetratorOther"
                      placeholder="Specify perpetrator"
                      required
                      value={formData.perpetratorOther}
                      onChange={handleFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Actions Taken */}
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                    ACTIONS TAKEN BY THE BARANGAY / BCPC (6) *
                  </label>
                  <select name="actionTaken" value={formData.actionTaken} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Referred to LSWDO (6a)">Referred to LSWDO (6a)</option>
                    <option value="Referred to PNP (6b)">Referred to PNP (6b)</option>
                    <option value="Referred to NBI (6c)">Referred to NBI (6c)</option>
                    <option value="Referred for Medical Treatment (6d)">Referred for Medical Treatment (6d)</option>
                    <option value="Referred to Legal Assistance (6e)">Referred to Legal Assistance (6e)</option>
                    <option value="Others (Referred to NGO/FBO) (6f)">Others (Referred to NGO's, FBO's) (6f)</option>
                    <option value="Others">Others (Please specify)</option>
                  </select>
                  {formData.actionTaken === "Others" && (
                    <input
                      type="text"
                      name="actionTakenOther"
                      placeholder="Specify action taken"
                      required
                      value={formData.actionTakenOther}
                      onChange={handleFormChange}
                      style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  )}
                </div>

                {/* Status and Remarks */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      STATUS
                    </label>
                    <select name="status" value={formData.status} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                      <option value="Acted Upon">Acted Upon</option>
                      <option value="Pending">Pending</option>
                      <option value="Closed / Resolved">Closed / Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      REMARKS
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      placeholder="Optional case remarks"
                      value={formData.remarks}
                      onChange={handleFormChange}
                      style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  padding: "16px 20px",
                  borderTop: "1px solid #e5e7eb",
                  background: "#f9fafb",
                }}
              >
                <button type="submit" className="as-btn-aqua" disabled={submitting}>
                  {submitting ? "Saving..." : "Save VAWC Case"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}