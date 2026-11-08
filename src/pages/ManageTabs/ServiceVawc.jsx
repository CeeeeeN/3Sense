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
import { db, auth } from "../../firebase/firebase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from '../../context/LanguageContext';
import { useAlert } from "../../context/AlertContext";
import { logTransaction } from "../../services/logger";
import { onAuthStateChanged } from "firebase/auth";

export default function ServiceVawc({ onBack, userRole }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage(); // NEW: Destructure hook
  const { showAlert } = useAlert();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

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

      logTransaction(
        adminName,
        adminRole,
        "CREATED_VAWC_CASE",
        `Created new VAWC case record (Ref: ${payload.referenceNumber})`
      );

      const newCaseWithId = { id: docRef.id, ...payload, createdAt: new Date() };
      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) => [
        newCaseWithId,
        ...old,
      ]);

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
      await showAlert("Error", t('admin_srv_vawc_err_save'));
    } finally {
      setSubmitting(false);
    }
  };

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

      logTransaction(
        adminName,
        adminRole,
        "UPDATED_VAWC_CASE",
        `Updated VAWC case record (Ref: ${editingCase.referenceNumber || editingCase.id})`
      );

      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) =>
        old.map((c) => (c.id === editingCase.id ? { ...c, ...updatedPayload } : c))
      );

      queryClient.invalidateQueries({ queryKey: ["adminManage_vawcStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminManage_servicesStats"] });

      setEditingCase(null);
    } catch (err) {
      console.error("Failed to update case details:", err);
      await showAlert("Error", t('admin_srv_vawc_err_update'));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    setDeleting(true);

    try {
      await deleteDoc(doc(db, "vawcCases", caseToDelete.id));

      logTransaction(
        adminName,
        adminRole,
        "DELETED_VAWC_CASE",
        `Deleted VAWC case record (Ref: ${caseToDelete.referenceNumber || caseToDelete.id})`
      );

      queryClient.setQueryData(["adminManage_vawcCases"], (old = []) =>
        old.filter((c) => c.id !== caseToDelete.id)
      );

      queryClient.invalidateQueries({ queryKey: ["adminManage_vawcStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminManage_servicesStats"] });

      setCaseToDelete(null);
    } catch (err) {
      console.error("Error deleting VAWC case:", err);
      await showAlert("Error", t('admin_srv_vawc_err_delete'));
    } finally {
      setDeleting(false);
    }
  };

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

  if (!isAuthorized) {
    return (
      <div className="as-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>{t('admin_srv_vawc_denied_title')}</h2>
        <p style={{ color: "#6b7280" }}>
          {t('admin_srv_vawc_denied_desc')}
        </p>
        <button className="as-btn-aqua" style={{ marginTop: "16px" }} onClick={onBack}>
          {t('admin_srv_vawc_back')}
        </button>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("closed") || s.includes("resolved")) return "closed-resolved";
  if (s.includes("acted")) return "acted-upon";
  if (s.includes("pending")) return "pending";
  return s.replace(/[^a-z0-9]/g, "-");
  };

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
          {t('admin_srv_vawc_back')}
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
              {t('admin_srv_vawc_title')}
            </h1>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "4px 0 0 0" }}>
              {t('admin_srv_vawc_subtitle')}
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
            {t('admin_srv_vawc_btn_add')}
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
            {t('admin_srv_vawc_stat_total')}
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", marginTop: "4px" }}>
            {totalVictims}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{t('admin_srv_vawc_stat_total_desc')}</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#be185d", textTransform: "uppercase" }}>
            {t('admin_srv_vawc_stat_gender')}
          </span>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#be185d", marginTop: "4px" }}>
            F: {femaleCount} | M: {maleCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{t('admin_srv_vawc_stat_gender_desc')}</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#15803d", textTransform: "uppercase" }}>
            {t('admin_srv_vawc_stat_acted')}
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#15803d", marginTop: "4px" }}>
            {actedUponCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{t('admin_srv_vawc_stat_acted_desc')}</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
            {t('admin_srv_vawc_stat_pending')}
          </span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>
            {pendingCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{t('admin_srv_vawc_stat_pending_desc')}</span>
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
              {t('admin_srv_vawc_table_title')}
            </h2>
            <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "2px 0 0 0" }}>
              {t('admin_srv_vawc_table_desc')}
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
              placeholder={t('admin_srv_vawc_search_ph')}
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
              <option value="all">{t('admin_srv_vawc_filter_status')}</option>
              <option value="Acted Upon">{t('admin_srv_vawc_modal_status_acted')}</option>
              <option value="Pending">{t('admin_srv_vawc_modal_status_pending')}</option>
              <option value="Closed / Resolved">{t('admin_srv_vawc_modal_status_closed')}</option>
            </select>

            {/* Filter by Gender */}
            <select
              className="filter-select"
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
            >
              <option value="all">{t('admin_srv_vawc_filter_gender')}</option>
              <option value="F">{t('admin_srv_vawc_modal_gender_f')}</option>
              <option value="M">{t('admin_srv_vawc_modal_gender_m')}</option>
            </select>

            {/* Filter by Violence Type */}
            <select
              className="filter-select"
              value={violenceFilter}
              onChange={(e) => setViolenceFilter(e.target.value)}
              style={{ padding: "6px 10px", fontSize: "0.82rem" }}
            >
              <option value="all">{t('admin_srv_vawc_filter_violence')}</option>
              <option value="Physical">Physical Abuse</option>
              <option value="Sexual">Sexual Abuse</option>
              <option value="Psychological">Psychological / Emotional</option>
              <option value="Neglect">Neglect</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            {t('admin_srv_vawc_loading')}
          </div>
        ) : filteredCases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>
            {t('admin_srv_vawc_empty')}
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
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_ref')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_date')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_gender')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_age')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_nature')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_perpetrator')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_action_taken')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_status')}</th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>{t('admin_srv_vawc_th_action')}</th>
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
  <span className={`status-badge ${getStatusBadgeClass(c.status)}`}>
    {(() => {
      let statusRaw = (c.status || "Pending");
      let displayStatus = statusRaw;
      if (statusRaw.toLowerCase() === 'pending') displayStatus = t('admin_srv_vawc_modal_status_pending');
      if (statusRaw.toLowerCase() === 'acted upon') displayStatus = t('admin_srv_vawc_modal_status_acted');
      if (statusRaw.toLowerCase().includes('closed') || statusRaw.toLowerCase().includes('resolved')) {
        displayStatus = t('admin_srv_vawc_modal_status_closed');
      }
      return displayStatus;
    })()}
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
                          {t('admin_srv_vawc_btn_details')}
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
                    {t('admin_srv_po_page_prev')}
                  </button>
                  {renderPageNumbers()}
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {t('admin_srv_po_page_next')}
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
            <div className="as-modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>{t('admin_srv_vawc_modal_edit_title')}</h2>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  {t('admin_srv_vawc_modal_ref')} {editingCase.referenceNumber || editingCase.id}
                </p>
              </div>
              <button className="as-modal-close" onClick={() => setEditingCase(null)}>
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
                    {t('admin_srv_vawc_modal_gender_label')}
                  </label>
                  <select name="gender" value={editFormData.gender} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="F">{t('admin_srv_vawc_modal_gender_f')}</option>
                    <option value="M">{t('admin_srv_vawc_modal_gender_m')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {editFormData.gender === "Others" && (
                    <input
                      type="text"
                      name="genderOther"
                      placeholder={t('admin_srv_vawc_modal_other_ph')}
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
                    {t('admin_srv_vawc_modal_age_label')}
                  </label>
                  <select name="ageBracket" value={editFormData.ageBracket} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="0-4 (3a)">{t('admin_srv_vawc_modal_age_0_4')}</option>
                    <option value="5-9 (3b)">{t('admin_srv_vawc_modal_age_5_9')}</option>
                    <option value="10-14 (3c)">{t('admin_srv_vawc_modal_age_10_14')}</option>
                    <option value="15-17 (3d)">{t('admin_srv_vawc_modal_age_15_17')}</option>
                    <option value="18 & above w/ disability">{t('admin_srv_vawc_modal_age_18_pwd')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {editFormData.ageBracket === "Others" && (
                    <input
                      type="text"
                      name="ageBracketOther"
                      placeholder={t('admin_srv_vawc_modal_age_other_ph')}
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
                    {t('admin_srv_vawc_modal_violence_label')}
                  </label>
                  <select name="typeOfViolence" value={editFormData.typeOfViolence} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Physical Abuse (4a)">{t('admin_srv_vawc_modal_vio_physical')}</option>
                    <option value="Sexual Abuse (4b)">{t('admin_srv_vawc_modal_vio_sexual')}</option>
                    <option value="Psychological/Emotional Abuse (4c)">{t('admin_srv_vawc_modal_vio_psych')}</option>
                    <option value="Neglect (4d)">{t('admin_srv_vawc_modal_vio_neglect')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {editFormData.typeOfViolence === "Others" && (
                    <input
                      type="text"
                      name="typeOfViolenceOther"
                      placeholder={t('admin_srv_vawc_modal_vio_other_ph')}
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
                    {t('admin_srv_vawc_modal_perp_label')}
                  </label>
                  <select name="perpetrator" value={editFormData.perpetrator} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Immediate Family Member (5a)">{t('admin_srv_vawc_modal_perp_family')}</option>
                    <option value="Close Relative (5b)">{t('admin_srv_vawc_modal_perp_relative')}</option>
                    <option value="Acquaintance (5c)">{t('admin_srv_vawc_modal_perp_acq')}</option>
                    <option value="Stranger (5d)">{t('admin_srv_vawc_modal_perp_stranger')}</option>
                    <option value="Local Office (5e)">{t('admin_srv_vawc_modal_perp_local')}</option>
                    <option value="Law Enforcer (5f)">{t('admin_srv_vawc_modal_perp_law')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_perp_other_opt')}</option>
                  </select>
                  {editFormData.perpetrator === "Others" && (
                    <input
                      type="text"
                      name="perpetratorOther"
                      placeholder={t('admin_srv_vawc_modal_perp_other_ph')}
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
                    {t('admin_srv_vawc_modal_action_label')}
                  </label>
                  <select name="actionTaken" value={editFormData.actionTaken} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Referred to LSWDO (6a)">{t('admin_srv_vawc_modal_act_lswdo')}</option>
                    <option value="Referred to PNP (6b)">{t('admin_srv_vawc_modal_act_pnp')}</option>
                    <option value="Referred to NBI (6c)">{t('admin_srv_vawc_modal_act_nbi')}</option>
                    <option value="Referred for Medical Treatment (6d)">{t('admin_srv_vawc_modal_act_medical')}</option>
                    <option value="Referred to Legal Assistance (6e)">{t('admin_srv_vawc_modal_act_legal')}</option>
                    <option value="Others (Referred to NGO/FBO) (6f)">{t('admin_srv_vawc_modal_act_ngo')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {editFormData.actionTaken === "Others" && (
                    <input
                      type="text"
                      name="actionTakenOther"
                      placeholder={t('admin_srv_vawc_modal_act_other_ph')}
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
                      {t('admin_srv_vawc_modal_status_label')}
                    </label>
                    <select name="status" value={editFormData.status} onChange={handleEditFormChange} className="filter-select" style={{ width: "100%" }}>
                      <option value="Acted Upon">{t('admin_srv_vawc_modal_status_acted')}</option>
                      <option value="Pending">{t('admin_srv_vawc_modal_status_pending')}</option>
                      <option value="Closed / Resolved">{t('admin_srv_vawc_modal_status_closed')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      {t('admin_srv_vawc_modal_remarks_label')}
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      placeholder={t('admin_srv_vawc_modal_remarks_ph')}
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
                  {t('admin_srv_vawc_btn_delete')}
                </button>
                <button type="submit" className="as-btn-aqua" disabled={updating}>
                  {updating ? t('admin_srv_vawc_btn_saving') : t('admin_srv_vawc_btn_save_edits')}
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
            <div className="as-modal-header">
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>{t('admin_srv_vawc_del_title')}</h2>
              <button className="as-modal-close" onClick={() => setCaseToDelete(null)}>
                &times;
              </button>
            </div>
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "0.9rem", color: "#374151", margin: "0 0 12px 0" }}>
                {t('admin_srv_vawc_del_desc1')}{" "}
                <strong>{caseToDelete.referenceNumber || caseToDelete.id}</strong>?
              </p>
              <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: 0 }}>
                {t('admin_srv_vawc_del_desc2')}
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
                  {deleting ? t('admin_srv_vawc_del_processing') : t('admin_srv_vawc_del_confirm')}
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
            <div className="as-modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>{t('admin_srv_vawc_modal_add_title')}</h2>
                <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  {t('admin_srv_vawc_modal_subtitle')}
                </p>
              </div>
              <button className="as-modal-close" onClick={() => setIsAddModalOpen(false)}>
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
                    {t('admin_srv_vawc_modal_gender_label')}
                  </label>
                  <select name="gender" value={formData.gender} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="F">{t('admin_srv_vawc_modal_gender_f')}</option>
                    <option value="M">{t('admin_srv_vawc_modal_gender_m')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {formData.gender === "Others" && (
                    <input
                      type="text"
                      name="genderOther"
                      placeholder={t('admin_srv_vawc_modal_other_ph')}
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
                    {t('admin_srv_vawc_modal_age_label')}
                  </label>
                  <select name="ageBracket" value={formData.ageBracket} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="0-4 (3a)">{t('admin_srv_vawc_modal_age_0_4')}</option>
                    <option value="5-9 (3b)">{t('admin_srv_vawc_modal_age_5_9')}</option>
                    <option value="10-14 (3c)">{t('admin_srv_vawc_modal_age_10_14')}</option>
                    <option value="15-17 (3d)">{t('admin_srv_vawc_modal_age_15_17')}</option>
                    <option value="18 & above w/ disability">{t('admin_srv_vawc_modal_age_18_pwd')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {formData.ageBracket === "Others" && (
                    <input
                      type="text"
                      name="ageBracketOther"
                      placeholder={t('admin_srv_vawc_modal_age_other_ph')}
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
                    {t('admin_srv_vawc_modal_violence_label')}
                  </label>
                  <select name="typeOfViolence" value={formData.typeOfViolence} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Physical Abuse (4a)">{t('admin_srv_vawc_modal_vio_physical')}</option>
                    <option value="Sexual Abuse (4b)">{t('admin_srv_vawc_modal_vio_sexual')}</option>
                    <option value="Psychological/Emotional Abuse (4c)">{t('admin_srv_vawc_modal_vio_psych')}</option>
                    <option value="Neglect (4d)">{t('admin_srv_vawc_modal_vio_neglect')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {formData.typeOfViolence === "Others" && (
                    <input
                      type="text"
                      name="typeOfViolenceOther"
                      placeholder={t('admin_srv_vawc_modal_vio_other_ph')}
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
                    {t('admin_srv_vawc_modal_perp_label')}
                  </label>
                  <select name="perpetrator" value={formData.perpetrator} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Immediate Family Member (5a)">{t('admin_srv_vawc_modal_perp_family')}</option>
                    <option value="Close Relative (5b)">{t('admin_srv_vawc_modal_perp_relative')}</option>
                    <option value="Acquaintance (5c)">{t('admin_srv_vawc_modal_perp_acq')}</option>
                    <option value="Stranger (5d)">{t('admin_srv_vawc_modal_perp_stranger')}</option>
                    <option value="Local Office (5e)">{t('admin_srv_vawc_modal_perp_local')}</option>
                    <option value="Law Enforcer (5f)">{t('admin_srv_vawc_modal_perp_law')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_perp_other_opt')}</option>
                  </select>
                  {formData.perpetrator === "Others" && (
                    <input
                      type="text"
                      name="perpetratorOther"
                      placeholder={t('admin_srv_vawc_modal_perp_other_ph')}
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
                    {t('admin_srv_vawc_modal_action_label')}
                  </label>
                  <select name="actionTaken" value={formData.actionTaken} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Referred to LSWDO (6a)">{t('admin_srv_vawc_modal_act_lswdo')}</option>
                    <option value="Referred to PNP (6b)">{t('admin_srv_vawc_modal_act_pnp')}</option>
                    <option value="Referred to NBI (6c)">{t('admin_srv_vawc_modal_act_nbi')}</option>
                    <option value="Referred for Medical Treatment (6d)">{t('admin_srv_vawc_modal_act_medical')}</option>
                    <option value="Referred to Legal Assistance (6e)">{t('admin_srv_vawc_modal_act_legal')}</option>
                    <option value="Others (Referred to NGO/FBO) (6f)">{t('admin_srv_vawc_modal_act_ngo')}</option>
                    <option value="Others">{t('admin_srv_vawc_modal_other_specify')}</option>
                  </select>
                  {formData.actionTaken === "Others" && (
                    <input
                      type="text"
                      name="actionTakenOther"
                      placeholder={t('admin_srv_vawc_modal_act_other_ph')}
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
                      {t('admin_srv_vawc_modal_status_label')}
                    </label>
                    <select name="status" value={formData.status} onChange={handleFormChange} className="filter-select" style={{ width: "100%" }}>
                      <option value="Acted Upon">{t('admin_srv_vawc_modal_status_acted')}</option>
                      <option value="Pending">{t('admin_srv_vawc_modal_status_pending')}</option>
                      <option value="Closed / Resolved">{t('admin_srv_vawc_modal_status_closed')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                      {t('admin_srv_vawc_modal_remarks_label')}
                    </label>
                    <input
                      type="text"
                      name="remarks"
                      placeholder={t('admin_srv_vawc_modal_remarks_ph')}
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
                  {submitting ? t('admin_srv_vawc_btn_saving') : t('admin_srv_vawc_btn_save_new')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}