import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function ServiceVawc({ onBack, userRole }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Form State
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

  // Access check
  const isAuthorized = !userRole || ["Super Admin", "VAWC Head", "Kapitan", "Secretary"].includes(userRole);

  useEffect(() => {
    const q = query(collection(db, "vawcCases"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCases(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching VAWC cases:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCase = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        gender: formData.gender === "Others" ? formData.genderOther.trim() : formData.gender,
        ageBracket: formData.ageBracket === "Others" ? formData.ageBracketOther.trim() : formData.ageBracket,
        typeOfViolence: formData.typeOfViolence === "Others" ? formData.typeOfViolenceOther.trim() : formData.typeOfViolence,
        perpetrator: formData.perpetrator === "Others" ? formData.perpetratorOther.trim() : formData.perpetrator,
        actionTaken: formData.actionTaken === "Others" ? formData.actionTakenOther.trim() : formData.actionTaken,
        status: formData.status,
        remarks: formData.remarks.trim(),
        referenceNumber: `VAC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
        createdAt: serverTimestamp(),
        loggedDate: new Date().toISOString().split("T")[0],
      };

      await addDoc(collection(db, "vawcCases"), payload);
      setIsModalOpen(false);
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
      alert("Failed to save VAWC Case. Please verify database connection.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="as-container" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Access Denied</h2>
        <p style={{ color: "#6b7280" }}>You do not have administrative privileges to view the VAWC workspace.</p>
        <button className="as-btn-aqua" style={{ marginTop: "16px" }} onClick={onBack}>&larr; Return to Services Hub</button>
      </div>
    );
  }

  const filteredCases = cases.filter((c) => {
    if (statusFilter === "all") return true;
    return (c.status || "").toLowerCase() === statusFilter.toLowerCase();
  });

  const totalVictims = cases.length;
  const femaleCount = cases.filter((c) => c.gender === "F").length;
  const maleCount = cases.filter((c) => c.gender === "M").length;
  const actedUponCount = cases.filter((c) => c.status === "Acted Upon").length;
  const pendingCount = cases.filter((c) => c.status === "Pending").length;

  return (
    <div className="as-container">
      {/* Top Header */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "#6b7280",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          &larr; Back to Services Hub
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "#111827", margin: 0 }}>VAWC Case Management</h1>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "4px 0 0 0" }}>
              Monitoring of incidence on Violence Against Children &amp; Women (Barangay Malanday).
            </p>
          </div>
          <button
            className="as-btn-aqua"
            onClick={() => setIsModalOpen(true)}
            style={{ padding: "9px 18px", fontSize: "0.88rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            + Add New VAWC Case
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>VAC Victims (Total)</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", marginTop: "4px" }}>{totalVictims}</div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Total No. of VAC Victims (1)</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#be185d", textTransform: "uppercase" }}>Gender Distribution (2)</span>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#be185d", marginTop: "4px" }}>
            F: {femaleCount} | M: {maleCount}
          </div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Female vs Male Intake</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#15803d", textTransform: "uppercase" }}>Acted Upon</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#15803d", marginTop: "4px" }}>{actedUponCount}</div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Referred or Intervened</span>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>Pending</span>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#b45309", marginTop: "4px" }}>{pendingCount}</div>
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Awaiting triage or review</span>
        </div>
      </div>

      {/* Case Directory Table */}
      <div className="section" style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1f2937", margin: 0 }}>VAWC Incident Logs</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "#6b7280" }}>Filter Status:</span>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: "6px 12px", fontSize: "0.82rem" }}
            >
              <option value="all">All Statuses</option>
              <option value="Acted Upon">Acted Upon</option>
              <option value="Pending">Pending</option>
              <option value="Closed / Resolved">Closed / Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>Loading VAWC records...</div>
        ) : filteredCases.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px", color: "#9ca3af" }}>No VAWC records found.</div>
        ) : (
          <div className="req-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="req-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "850px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>REF #</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>DATE LOGGED</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>GENDER (2)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>AGE (3)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>TYPE OF VIOLENCE (4)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>PERPETRATOR (5)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>ACTIONS TAKEN (6)</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 600, color: "#0f172a" }}>
                      {c.referenceNumber || c.id.substring(0, 8)}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#64748b" }}>{c.loggedDate || "—"}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600 }}>{c.gender}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{c.ageBracket}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 500, color: "#0f172a" }}>{c.typeOfViolence}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#475569" }}>{c.perpetrator}</td>
                    <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#0d9488", fontWeight: 500 }}>{c.actionTaken}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          background:
                            c.status === "Acted Upon" ? "#dcfce7" : c.status === "Pending" ? "#fef3c7" : "#f1f5f9",
                          color:
                            c.status === "Acted Upon" ? "#166534" : c.status === "Pending" ? "#92400e" : "#475569",
                        }}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: Add New VAWC Case (Form criteria matching Screenshot 1) ── */}
      {isModalOpen && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: "580px", padding: 0, overflow: "hidden" }}>
            <div className="as-modal-header" style={{ background: "#317D89", color: "#fff", padding: "16px 20px" }}>
              <div>
                <h2 style={{ color: "#fff", margin: 0, fontSize: "1.15rem" }}>Add New VAWC Case</h2>
                <p style={{ color: "#ccfbf1", fontSize: "0.75rem", margin: "2px 0 0 0" }}>
                  Recording Incident Form for Violence Against Children/Women
                </p>
              </div>
              <button className="as-modal-close" style={{ color: "#fff" }} onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleSaveCase} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px", maxHeight: "75vh", overflowY: "auto" }}>
              {/* Gender (2) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  GENDER (2) *
                </label>
                <select name="gender" value={formData.gender} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                    onChange={handleChange}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                )}
              </div>

              {/* Age (3) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  AGE (3) *
                </label>
                <select name="ageBracket" value={formData.ageBracket} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                    onChange={handleChange}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                )}
              </div>

              {/* Types of Violence (4) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  TYPES OF VIOLENCE (4) *
                </label>
                <select name="typeOfViolence" value={formData.typeOfViolence} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                    onChange={handleChange}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                )}
              </div>

              {/* Perpetrators (5) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  PERPETRATORS (5) *
                </label>
                <select name="perpetrator" value={formData.perpetrator} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                    onChange={handleChange}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                )}
              </div>

              {/* Actions Taken by Barangay / BCPC (6) */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>
                  ACTIONS TAKEN BY THE BARANGAY / BCPC (6) *
                </label>
                <select name="actionTaken" value={formData.actionTaken} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
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
                    onChange={handleChange}
                    style={{ width: "100%", marginTop: "6px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                )}
              </div>

              {/* Status and Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>STATUS</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="filter-select" style={{ width: "100%" }}>
                    <option value="Acted Upon">Acted Upon</option>
                    <option value="Pending">Pending</option>
                    <option value="Closed / Resolved">Closed / Resolved</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#374151", marginBottom: "4px" }}>REMARKS</label>
                  <input
                    type="text"
                    name="remarks"
                    placeholder="Optional case remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                <button
                  type="button"
                  className="as-btn-ghost"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="as-btn-aqua"
                  disabled={submitting}
                >
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