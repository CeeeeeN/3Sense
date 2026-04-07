import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { useMemo, useState } from "react";

export default function Reports() {

  // DATE FILTER STATE
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const services = [
    "VAWC",
    "BOSCA",
    "BSWD",
    "PEACE AND ORDER",
    "LIVELIHOOD",
    "BADAC",
    "Documents Request",
    "Covered Court",
    "Health Services",
    "Lolo at Lola"
  ];

  // SAMPLE DATA
  const feedbackData = [
    { service: "VAWC", sentiment: "negative", date: "2026-03-20" },
    { service: "VAWC", sentiment: "positive", date: "2026-03-25" },

    { service: "BOSCA", sentiment: "neutral", date: "2026-03-21" },
    { service: "BOSCA", sentiment: "positive", date: "2026-03-23" },
    { service: "BOSCA", sentiment: "negative", date: "2026-03-28" },

    { service: "BSWD", sentiment: "positive", date: "2026-03-20" },
    { service: "BSWD", sentiment: "positive", date: "2026-03-24" },
    { service: "BSWD", sentiment: "negative", date: "2026-03-29" },

    { service: "PEACE AND ORDER", sentiment: "negative", date: "2026-03-22" },
    { service: "PEACE AND ORDER", sentiment: "negative", date: "2026-03-27" },

    { service: "LIVELIHOOD", sentiment: "positive", date: "2026-03-21" },
    { service: "LIVELIHOOD", sentiment: "positive", date: "2026-03-26" },
    { service: "LIVELIHOOD", sentiment: "neutral", date: "2026-03-28" },

    { service: "Documents Request", sentiment: "positive", date: "2026-03-20" },
    { service: "Documents Request", sentiment: "neutral", date: "2026-03-24" },
    { service: "Documents Request", sentiment: "negative", date: "2026-03-30" },

    { service: "Health Services", sentiment: "positive", date: "2026-03-21" },
    { service: "Health Services", sentiment: "negative", date: "2026-03-26" },
    { service: "Health Services", sentiment: "positive", date: "2026-03-31" },

    { service: "Covered Court", sentiment: "positive", date: "2026-03-18" },
    { service: "Covered Court", sentiment: "neutral", date: "2026-03-21" },

    { service: "Lolo at Lola", sentiment: "positive", date: "2026-03-27" },
  ];

  // FILTERED DATA
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return feedbackData;

    return feedbackData.filter(item => {
      return item.date >= startDate && item.date <= endDate;
    });
  }, [startDate, endDate]);

  // TOTAL FEEDBACK PER SERVICE
  const feedbackPerService = useMemo(() => {
    const result = {};

    // initialize all services to 0
    services.forEach(service => {
      result[service] = 0;
    });

    // count actual data
    filteredData.forEach(item => {
      result[item.service]++;
    });

    return result;
  }, [filteredData]);

  // SENTIMENT PER CATEGORY
  const categorySentiment = useMemo(() => {
    const categories = {
      Services: ["VAWC", "BOSCA", "BSWD", "PEACE AND ORDER", "BADAC", "LIVELIHOOD", "Health Services"],
      Facilities: ["Covered Court"],
      Documents: ["Documents Request"],
      Programs: ["Lolo at Lola"]
    };

    const result = {};

    for (const [category, list] of Object.entries(categories)) {
      result[category] = { positive: 0, neutral: 0, negative: 0 };

      filteredData.forEach(item => {
        if (list.includes(item.service)) {
          result[category][item.sentiment]++;
        }
      });
    }

    return result;
  }, [filteredData]);

  // SENTIMENT BREAKDOWN
  const sentimentBreakdown = useMemo(() => {
    const result = { positive: 0, neutral: 0, negative: 0 };
    filteredData.forEach(item => {
      result[item.sentiment]++;
    });
    return result;
  }, [filteredData]);

  // MOST POSITIVE SERVICE
  const mostPositive = useMemo(() => {
    const positives = {};

    services.forEach(service => {
      positives[service] = 0;
    });

    filteredData.forEach(item => {
      if (item.sentiment === "positive") {
        positives[item.service]++;
      }
    });

    let max = 0;
    let service = "None";

    for (let key in positives) {
      if (positives[key] > max) {
        max = positives[key];
        service = key;
      }
    }

    return max === 0
      ? { service: "No positive feedback", count: 0 }
      : { service, count: max };
  }, [filteredData]);

  // MOST NEGATIVE SERVICE
  const mostNegative = useMemo(() => {
    const negatives = {};

    services.forEach(service => {
      negatives[service] = 0;
    });

    filteredData.forEach(item => {
      if (item.sentiment === "negative") {
        negatives[item.service]++;
      }
    });

    let max = 0;
    let service = "None";

    for (let key in negatives) {
      if (negatives[key] > max) {
        max = negatives[key];
        service = key;
      }
    }

    return max === 0
      ? { service: "No negatives", count: 0 }
      : { service, count: max };
  }, [filteredData]);

  // EXPORT FUNCTION
  const handleExport = () => {
    const report = `
Weekly Community Performance Report

Date Range: ${startDate || "All"} to ${endDate || "All"}

Total Feedback: ${filteredData.length}

Feedback per Service:
${Object.entries(feedbackPerService)
        .map(([s, count]) => `${s}: ${count}`)
        .join("\n")}

Sentiment Breakdown:
Positive: ${sentimentBreakdown.positive}
Neutral: ${sentimentBreakdown.neutral}
Negative: ${sentimentBreakdown.negative}

Most Positive Service:
${mostPositive}

Most Negative Service:
${mostNegative}
    `;

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "community_performance_report.txt";
    a.click();
  };

  return (
    <AdminLayout>

      <div className="main-content">

        {/* TOP SUMMARY CARDS */}
        <div className="card-grid">
          <div className="card">
            Total Feedback<br />
            <strong>{filteredData.length}</strong>
          </div>

          <div className="card">
            Positive<br />
            <strong>{sentimentBreakdown.positive}</strong>
          </div>

          <div className="card">
            Neutral<br />
            <strong>{sentimentBreakdown.neutral}</strong>
          </div>

          <div className="card">
            Negative<br />
            <strong>{sentimentBreakdown.negative}</strong>
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
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Clear
              </button>

              <button className="export-btn" onClick={handleExport}>
                Export Report
              </button>
            </div>
          </div>

          <div className="reports-grid">
            {/* FEEDBACK PER CATEGORY */}
            <div className="report-card">
              <h3>Total Feedback per Category</h3>
              <ul>
                {/* SERVICES */}
                <li>
                  <strong>Services</strong>
                  <ul className="sub-list">
                    {["VAWC", "BOSCA", "BSWD", "PEACE AND ORDER", "BADAC", "LIVELIHOOD", "Health Services"].map(service => (
                      <li key={service}>
                        {service}: {feedbackPerService[service]}
                      </li>
                    ))}
                  </ul>
                </li>

                {/* FACILITIES */}
                <li>
                  <strong>Facilities</strong>
                  <ul className="sub-list">
                    {["Covered Court"].map(service => (
                      <li key={service}>
                        {service}: {feedbackPerService[service]}
                      </li>
                    ))}
                  </ul>
                </li>

                {/* DOCUMENTS */}
                <li>
                  <strong>Documents</strong>
                  <ul className="sub-list">
                    {["Documents Request"].map(service => (
                      <li key={service}>
                        {service}: {feedbackPerService[service]}
                      </li>
                    ))}
                  </ul>
                </li>

                {/* PROGRAMS */}
                <li>
                  <strong>Programs</strong>
                  <ul className="sub-list">
                    {["Lolo at Lola"].map(service => (
                      <li key={service}>
                        {service}: {feedbackPerService[service]}
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </div>

            {/* SENTIMENT */}
            <div className="report-card">
              <h3>Sentiment Breakdown per Category</h3>

              {Object.entries(categorySentiment).map(([category, sentiments]) => {
                const total = Object.values(sentiments).reduce((a, b) => a + b, 0);

                return (
                  <div key={category} className="category-sentiment">
                    <strong>{category}</strong>
                    <div className="sentiment-box">
                      {["positive", "neutral", "negative"].map(type => {
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

        </div>

      </div>

    </AdminLayout>
  );
}