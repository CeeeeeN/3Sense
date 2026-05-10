import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { useMemo, useState, useEffect } from "react";
import { collection, getDocs, query, where, collectionGroup } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";

export default function Reports() {

  const [reportType, setReportType] = useState("performance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [feedbackData, setFeedbackData] = useState([]);
  const [residentData, setResidentData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [sexFilter, setSexFilter] = useState("all");

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(
          collection(db, "approvedAdmins"),
          where("uid", "==", user.uid)
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
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "feedback"),
          where("Status", "==", "analyzed")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const rawSentiment = (d.Sentiment || "").toLowerCase();
          const sentiment =
            rawSentiment === "positive" || rawSentiment === "neutral" || rawSentiment === "negative"
              ? rawSentiment
              : "neutral";
          let dateStr = "";
          if (d.CreatedAt?.toDate) {
            dateStr = d.CreatedAt.toDate().toISOString().split("T")[0];
          }
          return {
            id: doc.id,
            service: d.FacilityName || "Unknown",
            category: d.Category || "General",
            sentiment,
            date: dateStr,
            userName: d.UserName || "Anonymous",
            comment: d.Comment || "",
            rating: d.Rating ?? 0,
            referenceId: d.ReferenceID || "",
          };
        });
        setFeedbackData(data);
      } catch (err) {
        console.error("Error fetching feedback:", err);
      }
      setLoading(false);
    };
    fetchFeedback();
  }, []);

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const snapshot = await getDocs(collectionGroup(db, "residents"));
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();

          let age = null;
          if (d.birthDate) {
            const birth = new Date(d.birthDate);
            if (!isNaN(birth.getTime())) {
              const today = new Date();
              age = today.getFullYear() - birth.getFullYear();
              const m = today.getMonth() - birth.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            }
          }

          return {
            id: doc.id,
            householdID: d.householdID || "",
            firstName: d.firstName || "",
            lastName: d.lastName || "",
            fullName: `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Unknown",
            sex: d.sex || "Unknown",
            birthDate: d.birthDate || "",
            age: age,
            civilStatus: d.civilStatus || "N/A",
            role: d.role || "",
          };
        });
        setResidentData(data);
      } catch (err) {
        console.error("Error fetching residents:", err);
      }
    };
    fetchResidents();
  }, []);

  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return feedbackData;
    return feedbackData.filter(
      (item) => item.date >= startDate && item.date <= endDate
    );
  }, [feedbackData, startDate, endDate]);

  const categorizedServices = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      const cat = item.category || "General";
      if (!result[cat]) result[cat] = new Set();
      result[cat].add(item.service);
    });
    return Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k, [...v].sort()])
    );
  }, [filteredData]);

  const feedbackPerService = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      result[item.service] = (result[item.service] || 0) + 1;
    });
    return result;
  }, [filteredData]);

  const categorySentiment = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      const cat = item.category || "General";
      if (!result[cat]) result[cat] = { positive: 0, neutral: 0, negative: 0 };
      result[cat][item.sentiment]++;
    });
    return result;
  }, [filteredData]);

  const sentimentBreakdown = useMemo(() => {
    const result = { positive: 0, neutral: 0, negative: 0 };
    filteredData.forEach((item) => { result[item.sentiment]++; });
    return result;
  }, [filteredData]);

  const mostPositive = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      if (item.sentiment === "positive")
        counts[item.service] = (counts[item.service] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return { service: "No positive feedback", count: 0 };
    const [service, count] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    return { service, count };
  }, [filteredData]);

  const mostNegative = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      if (item.sentiment === "negative")
        counts[item.service] = (counts[item.service] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return { service: "No negative feedback", count: 0 };
    const [service, count] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    return { service, count };
  }, [filteredData]);

  const filteredResidents = useMemo(() => {
    if (sexFilter === "all") return residentData;
    return residentData.filter(
      (r) => r.sex.toLowerCase() === sexFilter.toLowerCase()
    );
  }, [residentData, sexFilter]);

  const rbiData = useMemo(() => {
    const brackets = {
      "0–14 (Child)": 0,
      "15–24 (Youth)": 0,
      "25–59 (Adult)": 0,
      "60+ (Senior)": 0,
      "Unknown": 0,
    };
    residentData.forEach((r) => {
      if (r.age === null || r.age === undefined) {
        brackets["Unknown"]++;
      } else if (r.age <= 14) {
        brackets["0–14 (Child)"]++;
      } else if (r.age <= 24) {
        brackets["15–24 (Youth)"]++;
      } else if (r.age <= 59) {
        brackets["25–59 (Adult)"]++;
      } else {
        brackets["60+ (Senior)"]++;
      }
    });
    return brackets;
  }, [residentData]);

  const maleFemaleCount = useMemo(() => {
    const counts = { Male: 0, Female: 0, Other: 0 };
    residentData.forEach((r) => {
      const s = r.sex;
      if (s === "Male") counts.Male++;
      else if (s === "Female") counts.Female++;
      else counts.Other++;
    });
    return counts;
  }, [residentData]);

  const handleExportCSV = () => {
    const headers = [
      "Reference ID", "Category", "Service / Facility",
      "Sentiment", "Rating", "Comment", "User", "Date",
    ];
    const rows = filteredData.map((item) => [
      item.referenceId, item.category, item.service, item.sentiment,
      item.rating,
      `"${(item.comment || "").replace(/"/g, '""')}"`,
      item.userName, item.date,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance_report_${startDate || "all"}_to_${endDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logTransaction(adminName, adminRole, "Exported CSV Report",
      `Exported performance report as CSV for date range: ${startDate || "All"} to ${endDate || "All"}. Total: ${filteredData.length}.`);
  };

  const handleExportDemographicsCSV = () => {
    const headers = ["Full Name", "Sex", "Age", "Birth Date", "Civil Status", "Household ID"];
    const rows = filteredResidents.map((r) => [
      `"${r.fullName}"`, r.sex, r.age ?? "N/A", r.birthDate, r.civilStatus, r.householdID,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resident_demographics_${sexFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    logTransaction(adminName, adminRole, "Exported Demographics CSV",
      `Exported resident demographics CSV. Filter: ${sexFilter}. Total: ${filteredResidents.length}.`);
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageH = doc.internal.pageSize.height;
      const lineH = 7;
      let y = 20;

      const checkPage = () => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
      };
      const write = (text, indent = 14, bold = false, size = 10) => {
        checkPage();
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.text(String(text), indent, y);
        y += lineH;
      };

      write("Community Performance Report", 14, true, 16);
      y += 2;
      write(`Date Range: ${startDate || "All"} — ${endDate || "All"}`, 14, false, 10);
      write(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 14, false, 10);
      y += 4;

      write("Summary", 14, true, 12);
      write(`Total Feedback: ${filteredData.length}`, 18);
      write(`Positive: ${sentimentBreakdown.positive}`, 18);
      write(`Neutral : ${sentimentBreakdown.neutral}`, 18);
      write(`Negative: ${sentimentBreakdown.negative}`, 18);
      y += 4;

      write("Feedback Per Category", 14, true, 12);
      Object.entries(categorizedServices).forEach(([cat, services]) => {
        write(`${cat}:`, 18, true, 10);
        services.forEach((svc) => {
          write(`${svc}: ${feedbackPerService[svc] || 0}`, 24, false, 9);
        });
        y += 2;
      });

      write("Sentiment Breakdown Per Category", 14, true, 12);
      Object.entries(categorySentiment).forEach(([cat, s]) => {
        const total = s.positive + s.neutral + s.negative;
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
        write(`${cat} (Total: ${total}):`, 18, true, 10);
        write(`Positive: ${s.positive} (${pct(s.positive)}%)`, 24, false, 9);
        write(`Neutral:  ${s.neutral}  (${pct(s.neutral)}%)`, 24, false, 9);
        write(`Negative: ${s.negative} (${pct(s.negative)}%)`, 24, false, 9);
        y += 2;
      });

      write("Highlights", 14, true, 12);
      write(`Most Positive Service: ${mostPositive.service} (${mostPositive.count} positives)`, 18, false, 10);
      write(`Most Negative Service: ${mostNegative.service} (${mostNegative.count} negatives)`, 18, false, 10);

      doc.save(`performance_report_${startDate || "all"}_to_${endDate || "all"}.pdf`);
      logTransaction(adminName, adminRole, "Exported PDF Report",
        `Exported performance report as PDF for date range: ${startDate || "All"} to ${endDate || "All"}. Total: ${filteredData.length}.`);
    } catch (err) {
      console.error("PDF export failed:", err);
      logTransaction(adminName, adminRole, "Failed PDF Export",
        `PDF export failed. Error: ${err.message}`);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  const handleExportDemographicsPDF = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      let y = 20;

      const checkPage = () => {
        if (y > pageH - 20) { doc.addPage(); y = 20; }
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Resident Demographics Report", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Filter: ${sexFilter === "all" ? "All Residents" : sexFilter} | Total: ${filteredResidents.length}`, 14, y);
      y += 5;
      doc.text(`Generated by: ${adminName} | ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 14, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Summary", 14, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Residents: ${residentData.length}`, 18, y); y += 6;
      doc.text(`Male: ${maleFemaleCount.Male}`, 18, y); y += 6;
      doc.text(`Female: ${maleFemaleCount.Female}`, 18, y); y += 10;

      const colX = { name: 14, sex: 110, age: 140, civil: 165, hhid: 200 };
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Full Name", colX.name, y);
      doc.text("Sex", colX.sex, y);
      doc.text("Age", colX.age, y);
      doc.text("Civil Status", colX.civil, y);
      doc.text("Household ID", colX.hhid, y);
      y += 3;
      doc.line(14, y, pageW - 14, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      filteredResidents.forEach((r) => {
        checkPage();
        doc.text(r.fullName.substring(0, 35), colX.name, y);
        doc.text(r.sex, colX.sex, y);
        doc.text(r.age !== null ? String(r.age) : "N/A", colX.age, y);
        doc.text(r.civilStatus, colX.civil, y);
        doc.text(r.householdID, colX.hhid, y);
        y += 6;
      });

      doc.save(`resident_demographics_${sexFilter}.pdf`);
      logTransaction(adminName, adminRole, "Exported Demographics PDF",
        `Exported resident demographics PDF. Filter: ${sexFilter}. Total: ${filteredResidents.length}.`);
    } catch (err) {
      console.error("Demographics PDF export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  const handleExportRBIPDF = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      let y = 20;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("RBI Form — Age Distribution Report", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated by: ${adminName} | ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 14, y);
      y += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Population Summary", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Total Registered Residents: ${residentData.length}`, 18, y); y += 7;
      doc.text(`Male: ${maleFemaleCount.Male}`, 18, y); y += 7;
      doc.text(`Female: ${maleFemaleCount.Female}`, 18, y); y += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Age Distribution", 14, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Age Bracket", 18, y);
      doc.text("Count", 100, y);
      doc.text("Percentage", 140, y);
      y += 3;
      doc.line(14, y, 185, y);
      y += 6;

      const total = residentData.length || 1;
      doc.setFont("helvetica", "normal");
      Object.entries(rbiData).forEach(([bracket, count]) => {
        if (bracket === "Unknown" && count === 0) return;
        const pct = ((count / total) * 100).toFixed(1);
        doc.text(bracket, 18, y);
        doc.text(String(count), 100, y);
        doc.text(`${pct}%`, 140, y);
        y += 8;
      });

      y += 4;
      doc.line(14, y, 185, y);
      y += 7;
      doc.setFont("helvetica", "bold");
      doc.text(`Total: ${residentData.length}`, 18, y);
      doc.text("100%", 140, y);

      doc.save("rbi_age_distribution_report.pdf");
      logTransaction(adminName, adminRole, "Exported RBI PDF",
        `Exported RBI age distribution PDF. Total residents: ${residentData.length}.`);
    } catch (err) {
      console.error("RBI PDF export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  return (
    <AdminLayout>
      <div className="main-content">

        {/* REPORT TYPE TABS */}
        <div className="report-tabs" style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {[
            { key: "performance", label: "Performance Report" },
            { key: "demographics", label: "Demographics" },
            { key: "rbi", label: "RBI Form" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReportType(tab.key)}
              style={{
                padding: "8px 20px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: reportType === tab.key ? "bold" : "normal",
                background: reportType === tab.key ? "#2563eb" : "#e5e7eb",
                color: reportType === tab.key ? "#fff" : "#374151",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── PERFORMANCE REPORT ─────────────────────────────────────────────── */}
        {reportType === "performance" && (
          <>
            {/* TOP SUMMARY CARDS */}
            <div className="card-grid">
              <div className="card">
                Total Feedback<br />
                <strong>{loading ? "…" : filteredData.length}</strong>
              </div>
              <div className="card">
                Positive<br />
                <strong>{loading ? "…" : sentimentBreakdown.positive}</strong>
              </div>
              <div className="card">
                Neutral<br />
                <strong>{loading ? "…" : sentimentBreakdown.neutral}</strong>
              </div>
              <div className="card">
                Negative<br />
                <strong>{loading ? "…" : sentimentBreakdown.negative}</strong>
              </div>
            </div>

            <div className="section">
              <div className="report-header">
                <h2>Community Performance Report</h2>
                <div className="report-controls">
                  <div className="filter-group">
                    <label>Start</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="filter-group">
                    <label>End</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <button className="clear-btn" onClick={() => { setStartDate(""); setEndDate(""); }}>Clear</button>
                  <button className="export-btn" onClick={handleExportCSV} disabled={loading || filteredData.length === 0}>Export CSV</button>
                  <button className="export-btn" onClick={handleExportPDF} disabled={loading || exportLoading || filteredData.length === 0}>
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>Loading feedback data…</div>
              ) : filteredData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No feedback found for the selected date range.</div>
              ) : (
                <div className="reports-grid">
                  <div className="report-card">
                    <h3>Total Feedback per Category</h3>
                    <ul>
                      {Object.entries(categorizedServices).map(([cat, services]) => (
                        <li key={cat}>
                          <strong>{cat}</strong>
                          <ul className="sub-list">
                            {services.map((svc) => (
                              <li key={svc}>{svc}: {feedbackPerService[svc] || 0}</li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="report-card">
                    <h3>Sentiment Breakdown per Category</h3>
                    {Object.entries(categorySentiment).map(([category, sentiments]) => {
                      const total = sentiments.positive + sentiments.neutral + sentiments.negative;
                      return (
                        <div key={category} className="category-sentiment">
                          <strong>{category}</strong>
                          <div className="sentiment-box">
                            {["positive", "neutral", "negative"].map((type) => {
                              const count = sentiments[type];
                              const percentage = total ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={type} className={`sentiment-pill ${type}`}>
                                  <div className="sentiment-label">
                                    {type.charAt(0).toUpperCase() + type.slice(1)}: {count} ({percentage}%)
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="report-card split-card">
                    <div className="stat-block">
                      <h3>Most Positive Service</h3>
                      <p className="highlight-positive">{mostPositive.service}</p>
                      <span className="stat-sub">({mostPositive.count} Positives)</span>
                    </div>
                    <div className="stat-block">
                      <h3>Most Negative Service</h3>
                      <p className="highlight-negative">{mostNegative.service}</p>
                      <span className="stat-sub">({mostNegative.count} Negatives)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── DEMOGRAPHICS REPORT ────────────────────────────────────────────── */}
        {reportType === "demographics" && (
          <>
            {/* Summary Cards */}
            <div className="card-grid">
              <div className="card">
                Total Residents<br />
                <strong>{residentData.length}</strong>
              </div>
              <div className="card">
                Male<br />
                <strong>{maleFemaleCount.Male}</strong>
              </div>
              <div className="card">
                Female<br />
                <strong>{maleFemaleCount.Female}</strong>
              </div>
            </div>

            <div className="section">
              <div className="report-header">
                <h2>Resident Demographics</h2>
                <div className="report-controls">
                  {/* Sex Filter */}
                  <div className="filter-group">
                    <label>Filter by Sex</label>
                    <select
                      value={sexFilter}
                      onChange={(e) => setSexFilter(e.target.value)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="all">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <button
                    className="export-btn"
                    onClick={handleExportDemographicsCSV}
                    disabled={filteredResidents.length === 0 || exportLoading}
                  >
                    Export Excel/CSV
                  </button>
                  <button
                    className="export-btn"
                    onClick={handleExportDemographicsPDF}
                    disabled={filteredResidents.length === 0 || exportLoading}
                  >
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>

              {filteredResidents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No residents found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                        <th style={thStyle}>Full Name</th>
                        <th style={thStyle}>Sex</th>
                        <th style={thStyle}>Age</th>
                        <th style={thStyle}>Civil Status</th>
                        <th style={thStyle}>Household ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResidents.map((r) => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={tdStyle}>{r.fullName}</td>
                          <td style={tdStyle}>{r.sex}</td>
                          <td style={tdStyle}>{r.age !== null ? r.age : "N/A"}</td>
                          <td style={tdStyle}>{r.civilStatus}</td>
                          <td style={tdStyle}>{r.householdID}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── RBI FORM ───────────────────────────────────────────────────────── */}
        {reportType === "rbi" && (
          <>
            {/* Summary Cards */}
            <div className="card-grid">
              <div className="card">
                Total Residents<br />
                <strong>{residentData.length}</strong>
              </div>
              <div className="card">
                Male<br />
                <strong>{maleFemaleCount.Male}</strong>
              </div>
              <div className="card">
                Female<br />
                <strong>{maleFemaleCount.Female}</strong>
              </div>
            </div>

            <div className="section">
              <div className="report-header">
                <h2>RBI Form — Age Distribution</h2>
                <div className="report-controls">
                  <button
                    className="export-btn"
                    onClick={handleExportRBIPDF}
                    disabled={residentData.length === 0 || exportLoading}
                  >
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>

              <div className="reports-grid">
                <div className="report-card">
                  <h3>Population by Age Bracket</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", marginTop: "12px" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        <th style={thStyle}>Age Bracket</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Percentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rbiData).map(([bracket, count]) => {
                        if (bracket === "Unknown" && count === 0) return null;
                        const pct = residentData.length
                          ? ((count / residentData.length) * 100).toFixed(1)
                          : "0.0";
                        return (
                          <tr key={bracket} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={tdStyle}><strong>{bracket}</strong></td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{count}</td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f9fafb", fontWeight: "bold" }}>
                        <td style={tdStyle}>Total</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>{residentData.length}</td>
                        <td style={{ ...tdStyle, textAlign: "right" }}>100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Visual bar chart */}
                <div className="report-card">
                  <h3>Age Distribution Chart</h3>
                  <div style={{ marginTop: "16px" }}>
                    {Object.entries(rbiData)
                      .filter(([bracket]) => bracket !== "Unknown")
                      .map(([bracket, count]) => {
                        const maxCount = Math.max(...Object.values(rbiData), 1);
                        const barWidth = (count / maxCount) * 100;
                        return (
                          <div key={bracket} style={{ marginBottom: "14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "13px" }}>
                              <span>{bracket}</span>
                              <span style={{ fontWeight: "bold" }}>{count}</span>
                            </div>
                            <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "16px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${barWidth}%`,
                                  height: "100%",
                                  background: "#2563eb",
                                  borderRadius: "4px",
                                  transition: "width 0.5s ease",
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
}


const thStyle = {
  padding: "10px 12px",
  fontWeight: "600",
  fontSize: "13px",
  color: "#374151",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "10px 12px",
  color: "#4b5563",
  fontSize: "13px",
};