import React, { useState, useEffect, useMemo } from "react";
import { auth, db } from "../../firebase/firebase";
import {
  collection, doc, updateDoc,
  serverTimestamp, query, orderBy,
  where, getDocs, limit, getCountFromServer
} from "firebase/firestore";
import { createUserNotification } from "../../services/userNotifications";
import { logTransaction } from '../../services/logger';
import { onAuthStateChanged } from "firebase/auth";
import { useQuery, useQueryClient } from '@tanstack/react-query'; 

// NEW: Import Language Hook
import { useLanguage } from '../../context/LanguageContext'; 

const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const StatusBadge = ({ status, t }) => {
  const raw = (status || "Pending").trim();
  const s = raw.toLowerCase();
  
  let statusClass = "pending";
  if (s.includes("resolved") || s.includes("handled")) {
    statusClass = "resolved";
  } else if (s === "responded") {
    statusClass = "responded";
  } else if (s === "received") {
    statusClass = "received";
  }

  // Attempt to translate the status, fallback to capitalized raw string
  let displayStatus = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (s === "pending") displayStatus = t('admin_srv_bswd_stat_pending');
  if (s.includes("resolved")) displayStatus = t('admin_srv_bswd_stat_resolved');
  if (s.includes("handled")) displayStatus = t('admin_srv_bswd_stat_handled');
  if (s === "responded") displayStatus = t('admin_srv_bswd_stat_responded');
  if (s === "received") displayStatus = t('admin_srv_bswd_filter_received');

  return (
    <span className={`status-badge ${statusClass}`}>
      {displayStatus}
    </span>
  );
};

export default function ServiceBswd({ onBack }) {
  const queryClient = useQueryClient(); 
  const { t } = useLanguage(); // NEW: Destructure hook

  const [activeTab, setActiveTab] = useState("reports");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [filterStatus, setFilterStatus] = useState("All");
  const [sortOrder, setSortOrder] = useState("date_desc");
  
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterStatus, sortOrder]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);

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

  const { data: reports = [], isLoading: loadingReports } = useQuery({
    queryKey: ['adminManage_bswdReports'],
    queryFn: async () => {
      const q = query(
        collection(db, "bswdReports"), 
        orderBy("submittedAt", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const docData = d.data();
        const rawDate = docData.submittedAt?.toDate ? docData.submittedAt.toDate().getTime() : (docData.submittedAt ? new Date(docData.submittedAt).getTime() : 0);
        return { id: d.id, rawDate, ...docData };
      });
    },
    staleTime: 1000 * 60 * 30, 
  });

  const { data: stats = { reports: {}, tips: {} } } = useQuery({
    queryKey: ['adminManage_bswdStats'],
    queryFn: async () => {
      const rRef = collection(db, "bswdReports");
      
      const [
        totalRep, pendingRep, respondedRep, resolvedRep,
        totalTip, pendingTip, handledTip
      ] = await Promise.all([
        getCountFromServer(query(rRef, where("type", "==", "homeless_report"))),
        getCountFromServer(query(rRef, where("type", "==", "homeless_report"), where("status", "in", ["pending", "received"]))),
        getCountFromServer(query(rRef, where("type", "==", "homeless_report"), where("status", "==", "responded"))),
        getCountFromServer(query(rRef, where("type", "==", "homeless_report"), where("status", "==", "resolved"))),
        getCountFromServer(query(rRef, where("type", "==", "tip"))),
        getCountFromServer(query(rRef, where("type", "==", "tip"), where("status", "==", "pending"))),
        getCountFromServer(query(rRef, where("type", "==", "tip"), where("status", "in", ["resolved", "handled"])))
      ]);

      return {
        reports: {
          total: totalRep.data().count,
          pending: pendingRep.data().count,
          responded: respondedRep.data().count,
          resolved: resolvedRep.data().count
        },
        tips: {
          total: totalTip.data().count,
          pending: pendingTip.data().count,
          handled: handledTip.data().count
        }
      };
    },
    staleTime: 1000 * 60 * 30,
  });

  const reportsStats = stats.reports;
  const tipsStats = stats.tips;

  const updateStatus = async (id, newStatus) => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "bswdReports", id), {
        status:    newStatus,
        updatedAt: serverTimestamp(),
      });

      logTransaction(
        adminName,
        adminRole,
        "UPDATED_BSWD_REPORT_STATUS",
        `Updated status of ${reports.find(r => r.id === id)?.type || "report"} ID ${id} to ${newStatus}`,
      );

      if (newStatus === "responded" || newStatus === "resolved") {
        const p = reports.find(r => r.id === id);
        const residentID = p?.residentID || p?.userID;
        const hhID       = p?.householdID;
        if (residentID && hhID) {
          const typeLabel = p.type === "tip" ? "Community Tip" : "Displacement Report";
          await createUserNotification(
            hhID,
            residentID,
            `${typeLabel} Update`,
            `Your ${typeLabel.toLowerCase()} has been marked as ${newStatus}.`,
            "general",
            p.id
          );
        }
      }

      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(prev => ({ ...prev, status: newStatus }));
      }

      queryClient.invalidateQueries({ queryKey: ['adminManage_bswdReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminManage_bswdStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminManage_servicesStats'] });

    } catch (err) {
      console.error("Error updating status:", err);
    }
    setSaving(false);
  };

  const displacementReports = useMemo(() => reports.filter(r => (r.type || "") === "homeless_report"), [reports]);
  const communityTips       = useMemo(() => reports.filter(r => (r.type || "") !== "homeless_report"), [reports]);

  const currentData = useMemo(() => {
    const rawList = activeTab === "reports" ? displacementReports : communityTips;
    return rawList
      .filter(item => {
        const s = (item.status || "pending").toLowerCase();
        if (filterStatus === "All") return true;
        if (filterStatus === "resolved") return s.includes("resolved") || s.includes("handled");
        return s === filterStatus.toLowerCase();
      })
      .sort((a, b) => {
        if (sortOrder === "date_desc") return (b.rawDate || 0) - (a.rawDate || 0);
        if (sortOrder === "date_asc") return (a.rawDate || 0) - (b.rawDate || 0);
        if (sortOrder === "name_asc") {
          const nameA = a.reporterName || a.contact || "Anonymous";
          const nameB = b.reporterName || b.contact || "Anonymous";
          return nameA.localeCompare(nameB);
        }
        if (sortOrder === "name_desc") {
          const nameA = a.reporterName || a.contact || "Anonymous";
          const nameB = b.reporterName || b.contact || "Anonymous";
          return nameB.localeCompare(nameA);
        }
        if (sortOrder === "loc_asc") {
          const locA = a.location || a.about || "";
          const locB = b.location || b.about || "";
          return locA.localeCompare(locB);
        }
        return 0;
      });
  }, [activeTab, displacementReports, communityTips, filterStatus, sortOrder]);

  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = currentData.slice(startIndex, startIndex + itemsPerPage);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
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

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button className="as-btn-ghost" onClick={onBack} style={{ marginBottom: "20px" }}>
        {t('admin_srv_bswd_back')}
      </button>

      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>{t('admin_srv_bswd_title')}</h1>
          <p className="as-subtitle">{t('admin_srv_bswd_subtitle')}</p>
        </div>
      </div>

      <div className="req-tabs" style={{ marginBottom: "20px" }}>
        <button
          className={`req-tab ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => { setActiveTab("reports"); setFilterStatus("All"); }}
        >
          {t('admin_srv_bswd_tab_reports')} ({reportsStats?.total || 0})
        </button>
        <button
          className={`req-tab ${activeTab === "tips" ? "active" : ""}`}
          onClick={() => { setActiveTab("tips"); setFilterStatus("All"); }}
        >
          {t('admin_srv_bswd_tab_tips')} ({tipsStats?.total || 0})
        </button>
      </div>

      {activeTab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: t('admin_srv_bswd_stat_total'),     value: reportsStats?.total || 0,     bg: "#fff",    border: "#e5e7eb", color: "#111827" },
            { label: t('admin_srv_bswd_stat_pending'),   value: reportsStats?.pending || 0,   bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: t('admin_srv_bswd_stat_responded'), value: reportsStats?.responded || 0, bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
            { label: t('admin_srv_bswd_stat_resolved'),  value: reportsStats?.resolved || 0,  bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "14px 18px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      {activeTab === "tips" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "20px" }}>
          {[
            { label: t('admin_srv_bswd_stat_total_tips'), value: tipsStats?.total || 0,   bg: "#fff",    border: "#e5e7eb", color: "#111827" },
            { label: t('admin_srv_bswd_stat_pending'),    value: tipsStats?.pending || 0, bg: "#fffbeb", border: "#fde68a", color: "#a16207" },
            { label: t('admin_srv_bswd_stat_handled'),    value: tipsStats?.handled || 0, bg: "#f0fdf4", border: "#bbf7d0", color: "#15803d" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, padding: "14px 18px", borderRadius: "12px", border: `1px solid ${s.border}` }}>
              <div style={{ color: "#6b7280", fontSize: "0.82rem", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* FILTER & SORT TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "16px" }}>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
        >
          <option value="All">{t('admin_srv_bswd_filter_status')}</option>
          <option value="pending">{t('admin_srv_bswd_stat_pending')}</option>
          <option value="received">{t('admin_srv_bswd_filter_received')}</option>
          <option value="responded">{t('admin_srv_bswd_stat_responded')}</option>
          <option value="resolved">{t('admin_srv_bswd_filter_resolved_handled')}</option>
        </select>

        <select
          className="filter-select"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", background: "#fff" }}
        >
          <option value="date_desc">{t('admin_srv_bswd_sort_date_new')}</option>
          <option value="date_asc">{t('admin_srv_bswd_sort_date_old')}</option>
          <option value="name_asc">{t('admin_srv_bswd_sort_rep_asc')}</option>
          <option value="name_desc">{t('admin_srv_bswd_sort_rep_desc')}</option>
          <option value="loc_asc">{activeTab === "reports" ? t('admin_srv_bswd_sort_loc_asc') : t('admin_srv_bswd_sort_sub_asc')}</option>
        </select>
      </div>

      {loadingReports ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Loading…</div>
      ) : activeTab === "reports" ? (

        /* ── Displacement Reports Table ── */
        <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="req-table" style={{ width: "100%", minWidth: "750px" }}>
            <thead>
              <tr style={{ textAlign: 'center' }}>
                {[t('admin_srv_bswd_th_date'), t('admin_srv_bswd_th_reporter'), t('admin_srv_bswd_th_location'), t('admin_srv_bswd_th_desc'), t('admin_srv_bswd_th_status'), t('admin_srv_bswd_th_action')].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>{t('admin_srv_bswd_empty_reports')}</td></tr>
              ) : (
                paginatedData.map(r => {
                  const hasPhoto = r.photoFileName && r.photoFileName !== "None" && r.photoFileName !== "";
                  return (
                    <tr 
                      key={r.id} 
                      onClick={() => setSelectedItem(r)} 
                      style={{ cursor: "pointer", textAlign: "center" }}
                    >
                      <td style={{ color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(r.submittedAt)}</td>
                      <td style={{ fontWeight: 500 }}>{r.reporterName || t('admin_srv_bswd_anon')}</td>
                      <td style={{ color: "#111827", maxWidth: "150px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.location || "—"}</td>
                      <td style={{ color: "#4b5563", maxWidth: "220px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description || "—"}</div>
                        {hasPhoto && (
                          <span style={{ fontSize: "0.75rem", color: "#317D89", background: "#e0f2fe", padding: "2px 8px", borderRadius: "12px", marginTop: "4px", display: "inline-block", fontWeight: 500 }}>
                            {t('admin_srv_bswd_photo_badge')}
                          </span>
                        )}
                      </td>
                      <td><StatusBadge status={r.status} t={t} /></td>
                      <td style={{ textAlign: "center" }}>
                        <button 
                          className="btn-view"
                          style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem(r);
                          }}
                        >
                          {t('admin_srv_bswd_btn_details')}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {currentData.length > 0 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + itemsPerPage, currentData.length)} of{" "}
                {currentData.length} entries
              </div>

              {totalPages > 1 && (
                <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {renderPageNumbers()}
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      ) : (

        /* ── Community Tips Table ── */
        <div className="req-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="req-table" style={{ width: "100%", minWidth: "750px" }}>
            <thead>
              <tr style={{ textAlign: 'center' }}>
                {[t('admin_srv_bswd_th_date'), t('admin_srv_bswd_th_reporter'), t('admin_srv_bswd_th_subject'), t('admin_srv_bswd_th_tip_info'), t('admin_srv_bswd_th_status'), t('admin_srv_bswd_th_action')].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "32px", color: "#9ca3af", textAlign: "center" }}>{t('admin_srv_bswd_empty_tips')}</td></tr>
              ) : (
                paginatedData.map(tData => (
                  <tr 
                    key={tData.id} 
                    onClick={() => setSelectedItem(tData)} 
                    style={{ cursor: "pointer", textAlign: "center" }}
                  >
                    <td style={{ color: "#6b7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>{formatTs(tData.submittedAt)}</td>
                    <td style={{ fontWeight: 500 }}>{tData.contact || t('admin_srv_bswd_anon')}</td>
                    <td style={{ color: "#111827" }}>{tData.about || "—"}</td>
                    <td style={{ color: "#4b5563", maxWidth: "260px" }}>
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tData.tip || "—"}</div>
                    </td>
                    <td><StatusBadge status={tData.status} t={t} /></td>
                    <td style={{ textAlign: "center" }}>
                      <button 
                        className="btn-view"
                        style={{ padding: "6px 14px", fontSize: "0.82rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(tData);
                        }}
                      >
                        {t('admin_srv_bswd_btn_details')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {currentData.length > 0 && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 24px",
              borderTop: "1px solid #e2e8f0",
              background: "#f8fafc",
              flexWrap: "wrap",
              gap: "16px"
            }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Showing {startIndex + 1} to{" "}
                {Math.min(startIndex + itemsPerPage, currentData.length)} of{" "}
                {currentData.length} entries
              </div>

              {totalPages > 1 && (
                <div className="af-pagination" style={{ display: "flex", gap: "8px" }}>
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {renderPageNumbers()}
                  <button
                    className="af-page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL MODAL POPUP ── */}
      {selectedItem && (() => {
        const reporterName = selectedItem.reporterName || selectedItem.contact || t('admin_srv_bswd_anon');
        const isAnonymous = reporterName.trim().toLowerCase() === "anonymous" || reporterName.trim().toLowerCase() === t('admin_srv_bswd_anon').toLowerCase();

        return (
          <div 
            className="as-modal-overlay"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="as-modal-content"
              style={{ maxWidth: "600px" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="as-modal-header">
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                  {selectedItem.type === "tip" ? t('admin_srv_bswd_modal_tip_title') : t('admin_srv_bswd_modal_rep_title')}
                </h2>
                <button 
                  className="as-modal-close"
                  onClick={() => setSelectedItem(null)}
                >&times;</button>
              </div>

              <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{t('admin_srv_bswd_modal_reported_by')}</div>
                    
                    <div style={{ fontSize: "1.1rem", fontWeight: 500, color: "#111827", marginTop: "4px" }}>
                      {reporterName}
                    </div>
                    
                    {!isAnonymous && selectedItem.UID && (
                      <div style={{ fontSize: "0.85rem", color: "#317D89", marginTop: "2px", fontWeight: 600 }}>
                        {t('admin_srv_bswd_modal_uid')} {selectedItem.UID}
                      </div>
                    )}
                    
                    <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "2px" }}>{t('admin_srv_bswd_modal_date')} {formatTs(selectedItem.submittedAt)}</div>
                  </div>
                  <StatusBadge status={selectedItem.status} t={t} />
                </div>

                <div style={{ marginBottom: "20px", background: "#f3f4f6", padding: "16px", borderRadius: "8px" }}>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                    {selectedItem.type === "tip" ? t('admin_srv_bswd_modal_subject') : t('admin_srv_bswd_modal_loc_label')}
                  </div>
                  <div style={{ color: "#111827", fontWeight: 500, fontSize: "1.05rem" }}>
                    {selectedItem.location || selectedItem.about || t('admin_srv_bswd_modal_not_spec')}
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "8px" }}>
                    {t('admin_srv_bswd_modal_desc_label')}
                  </div>
                  <p style={{ margin: 0, color: "#374151", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                    {selectedItem.description || selectedItem.tip || t('admin_srv_bswd_modal_no_desc')}
                  </p>
                </div>

                {selectedItem.photoFileName && selectedItem.photoFileName.startsWith('http') && (
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600, marginBottom: "12px" }}>
                      {t('admin_srv_bswd_modal_evidence')}
                    </div>
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", background: "#f9fafb", padding: "4px" }}>
                      <img 
                        src={selectedItem.photoFileName} 
                        alt="Report Evidence" 
                        style={{ width: "100%", height: "auto", display: "block", borderRadius: "4px" }} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>{t('admin_srv_bswd_modal_update')}</span>
                  <select
                    value={selectedItem.status || "pending"}
                    onChange={(e) => updateStatus(selectedItem.id, e.target.value)}
                    disabled={saving}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "0.85rem", cursor: "pointer", background: "#fff", fontWeight: 500 }}
                  >
                    <option value="pending">{t('admin_srv_bswd_stat_pending')}</option>
                    <option value="received">{t('admin_srv_bswd_filter_received')}</option>
                    <option value="responded">{t('admin_srv_bswd_stat_responded')}</option>
                    <option value="resolved">{t('admin_srv_bswd_stat_resolved')}</option>
                  </select>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  ); 
}