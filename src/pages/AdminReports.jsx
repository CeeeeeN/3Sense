import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { useMemo, useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";

export default function Reports() {

  // ── State ────────────────────────────────────────────────────────────────────
  const [startDate, setStartDate]     = useState("");
  const [endDate, setEndDate]         = useState("");
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // For logging purposes
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  useEffect(() => {
        // Listen for the currently logged-in user
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            // Find their document in the approvedAdmins collection
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

  // ── Fetch from Firestore (only analyzed docs) ────────────────────────────────
  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "Feedback"),
          where("Status", "==", "analyzed")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          // Normalize sentiment to lowercase for consistent comparisons
          const rawSentiment = (d.Sentiment || "").toLowerCase();
          const sentiment =
            rawSentiment === "positive" || rawSentiment === "neutral" || rawSentiment === "negative"
              ? rawSentiment
              : "neutral";

          // Convert Firestore Timestamp → "YYYY-MM-DD" string for date filtering
          let dateStr = "";
          if (d.CreatedAt?.toDate) {
            dateStr = d.CreatedAt.toDate().toISOString().split("T")[0];
          }

          return {
            id:          doc.id,
            service:     d.FacilityName  || "Unknown",
            category:    d.Category      || "General",
            sentiment,
            date:        dateStr,
            userName:    d.UserName      || "Anonymous",
            comment:     d.Comment       || "",
            rating:      d.Rating        ?? 0,
            referenceId: d.ReferenceID   || "",
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

  // ── Date-filtered data ────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return feedbackData;
    return feedbackData.filter(
      (item) => item.date >= startDate && item.date <= endDate
    );
  }, [feedbackData, startDate, endDate]);

  // ── Unique services per category (dynamic from real data) ────────────────────
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

  // ── Total feedback count per service ─────────────────────────────────────────
  const feedbackPerService = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      result[item.service] = (result[item.service] || 0) + 1;
    });
    return result;
  }, [filteredData]);

  // ── Sentiment breakdown per category ─────────────────────────────────────────
  const categorySentiment = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      const cat = item.category || "General";
      if (!result[cat]) result[cat] = { positive: 0, neutral: 0, negative: 0 };
      result[cat][item.sentiment]++;
    });
    return result;
  }, [filteredData]);

  // ── Overall sentiment totals ──────────────────────────────────────────────────
  const sentimentBreakdown = useMemo(() => {
    const result = { positive: 0, neutral: 0, negative: 0 };
    filteredData.forEach((item) => { result[item.sentiment]++; });
    return result;
  }, [filteredData]);

  // ── Most Positive service ─────────────────────────────────────────────────────
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

  // ── Most Negative service ─────────────────────────────────────────────────────
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

  // ── CSV Export ────────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = [
      "Reference ID",
      "Category",
      "Service / Facility",
      "Sentiment",
      "Rating",
      "Comment",
      "User",
      "Date",
    ];

    const rows = filteredData.map((item) => [
      item.referenceId,
      item.category,
      item.service,
      item.sentiment,
      item.rating,
      `"${(item.comment || "").replace(/"/g, '""')}"`,
      item.userName,
      item.date,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `performance_report_${startDate || "all"}_to_${endDate || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logTransaction(
      adminName,
      adminRole,
      "Exported CSV Report",
      `Exported performance report as CSV for date range: ${startDate || "All"} to ${endDate || "All"}. Total feedback exported: ${filteredData.length}.`
    );
  };

  // ── PDF Export (jsPDF) ────────────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      // Dynamic import so bundle stays lean
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageH  = doc.internal.pageSize.height;
      const lineH  = 7;
      let y        = 20;

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

      // ── Title ──
      write("Community Performance Report", 14, true, 16);
      y += 2;
      write(`Date Range: ${startDate || "All"} — ${endDate || "All"}`, 14, false, 10);
      write(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`, 14, false, 10);
      y += 4;

      // ── Summary ──
      write("Summary", 14, true, 12);
      write(`Total Feedback: ${filteredData.length}`, 18);
      write(`Positive: ${sentimentBreakdown.positive}`, 18);
      write(`Neutral : ${sentimentBreakdown.neutral}`, 18);
      write(`Negative: ${sentimentBreakdown.negative}`, 18);
      y += 4;

      // ── Feedback per Category ──
      write("Feedback Per Category", 14, true, 12);
      Object.entries(categorizedServices).forEach(([cat, services]) => {
        write(`${cat}:`, 18, true, 10);
        services.forEach((svc) => {
          write(`${svc}: ${feedbackPerService[svc] || 0}`, 24, false, 9);
        });
        y += 2;
      });

      // ── Sentiment per Category ──
      write("Sentiment Breakdown Per Category", 14, true, 12);
      Object.entries(categorySentiment).forEach(([cat, s]) => {
        const total = s.positive + s.neutral + s.negative;
        const pct   = (n) => (total ? Math.round((n / total) * 100) : 0);
        write(`${cat} (Total: ${total}):`, 18, true, 10);
        write(`Positive: ${s.positive} (${pct(s.positive)}%)`, 24, false, 9);
        write(`Neutral:  ${s.neutral}  (${pct(s.neutral)}%)`, 24, false, 9);
        write(`Negative: ${s.negative} (${pct(s.negative)}%)`, 24, false, 9);
        y += 2;
      });

      // ── Highlights ──
      write("Highlights", 14, true, 12);
      write(`Most Positive Service: ${mostPositive.service} (${mostPositive.count} positives)`, 18, false, 10);
      write(`Most Negative Service: ${mostNegative.service} (${mostNegative.count} negatives)`, 18, false, 10);

      doc.save(`performance_report_${startDate || "all"}_to_${endDate || "all"}.pdf`);

      logTransaction(
        adminName,
        adminRole,
        "Exported PDF Report",
        `Exported performance report as PDF for date range: ${startDate || "All"} to ${endDate || "All"}. Total feedback included: ${filteredData.length}.`
      );
    } catch (err) {
      console.error("PDF export failed:", err);
      logTransaction(
        adminName,
        adminRole,
        "Failed PDF Export",
        `Attempted to export performance report as PDF for date range: ${startDate || "All"} to ${endDate || "All"}, but failed. Error: ${err.message}`
      );
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="main-content">

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

        {/* REPORT SECTION */}
        <div className="section">
          <div className="report-header">
            <h2>Community Performance Report</h2>

            <div className="report-controls">
              <div className="filter-group">
                <label>Start</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>End</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <button
                className="clear-btn"
                onClick={() => { setStartDate(""); setEndDate(""); }}
              >
                Clear
              </button>

              <button
                className="export-btn"
                onClick={handleExportCSV}
                disabled={loading || filteredData.length === 0}
              >
                Export CSV
              </button>

              <button
                className="export-btn"
                onClick={handleExportPDF}
                disabled={loading || exportLoading || filteredData.length === 0}
              >
                {exportLoading ? "Generating…" : "Export PDF"}
              </button>
            </div>
          </div>

          {/* LOADING STATE */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
              Loading feedback data…
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>
              No feedback found for the selected date range.
            </div>
          ) : (
            <div className="reports-grid">

              {/* FEEDBACK PER CATEGORY — fully dynamic */}
              <div className="report-card">
                <h3>Total Feedback per Category</h3>
                <ul>
                  {Object.entries(categorizedServices).map(([cat, services]) => (
                    <li key={cat}>
                      <strong>{cat}</strong>
                      <ul className="sub-list">
                        {services.map((svc) => (
                          <li key={svc}>
                            {svc}: {feedbackPerService[svc] || 0}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>

              {/* SENTIMENT PER CATEGORY — fully dynamic */}
              <div className="report-card">
                <h3>Sentiment Breakdown per Category</h3>
                {Object.entries(categorySentiment).map(([category, sentiments]) => {
                  const total = sentiments.positive + sentiments.neutral + sentiments.negative;
                  return (
                    <div key={category} className="category-sentiment">
                      <strong>{category}</strong>
                      <div className="sentiment-box">
                        {["positive", "neutral", "negative"].map((type) => {
                          const count      = sentiments[type];
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

              {/* HIGHLIGHTS CARD */}
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
      </div>
    </AdminLayout>
  );
}