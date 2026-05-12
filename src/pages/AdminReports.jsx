import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { useMemo, useState, useEffect } from "react";
import { collection, getDocs, query, where, collectionGroup } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";

export default function Reports() {

  // ── State ────────────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState("performance");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [feedbackData, setFeedbackData] = useState([]);
  const [residentData, setResidentData] = useState([]);
  const [householdData, setHouseholdData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [sexFilter, setSexFilter] = useState("all");
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // ── Auth ─────────────────────────────────────────────────────────────────────
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

  // ── Fetch Feedback ───────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "feedback"), where("Status", "==", "analyzed"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          const rawSentiment = (d.Sentiment || "").toLowerCase();
          const sentiment = ["positive", "neutral", "negative"].includes(rawSentiment) ? rawSentiment : "neutral";
          let dateStr = "";
          if (d.CreatedAt?.toDate) dateStr = d.CreatedAt.toDate().toISOString().split("T")[0];
          return {
            id: doc.id, service: d.FacilityName || "Unknown", category: d.Category || "General",
            sentiment, date: dateStr, userName: d.UserName || "Anonymous",
            comment: d.Comment || "", rating: d.Rating ?? 0, referenceId: d.ReferenceID || "",
          };
        });
        setFeedbackData(data);
      } catch (err) { console.error("Error fetching feedback:", err); }
      setLoading(false);
    };
    fetchFeedback();
  }, []);

  // ── Fetch Residents via collectionGroup ──────────────────────────────────────
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
            middleName: d.middleName || "",
            suffix: d.suffix || "",
            fullName: `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Unknown",
            sex: d.sex || "Unknown",
            birthDate: d.birthDate || "",
            birthPlace: d.birthPlace || "",
            age,
            civilStatus: d.civilStatus || "N/A",
            citizenship: d.citizenship || "Filipino",
            occupation: d.occupation || "",
            religion: d.religion || "",
            educationAttainment: d.educationAttainment || "",
            educationStatus: d.educationStatus || "",
            employmentStatus: d.employmentStatus || "",
            role: d.role || "",
            categories: d.categories || {},
          };
        });
        setResidentData(data);
      } catch (err) { console.error("Error fetching residents:", err); }
    };
    fetchResidents();
  }, []);

  // ── Fetch Households ─────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchHouseholds = async () => {
      try {
        const snapshot = await getDocs(collection(db, "households"));
        const data = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            householdID: d.householdID || doc.id,
            householdAddress: [d.houseNumber, d.street, d.barangay].filter(Boolean).join(", "),
            totalMembers: d.totalMembers || 0,
            householdClassification: d.householdClassification || "",
            barangay: d.barangay || "",
            city: d.city || "",
          };
        });
        setHouseholdData(data);
      } catch (err) { console.error("Error fetching households:", err); }
    };
    fetchHouseholds();
  }, []);

  // ── Performance memos ────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return feedbackData;
    return feedbackData.filter((item) => item.date >= startDate && item.date <= endDate);
  }, [feedbackData, startDate, endDate]);

  const categorizedServices = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => {
      const cat = item.category || "General";
      if (!result[cat]) result[cat] = new Set();
      result[cat].add(item.service);
    });
    return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, [...v].sort()]));
  }, [filteredData]);

  const feedbackPerService = useMemo(() => {
    const result = {};
    filteredData.forEach((item) => { result[item.service] = (result[item.service] || 0) + 1; });
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
      if (item.sentiment === "positive") counts[item.service] = (counts[item.service] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return { service: "No positive feedback", count: 0 };
    const [service, count] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    return { service, count };
  }, [filteredData]);

  const mostNegative = useMemo(() => {
    const counts = {};
    filteredData.forEach((item) => {
      if (item.sentiment === "negative") counts[item.service] = (counts[item.service] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return { service: "No negative feedback", count: 0 };
    const [service, count] = entries.reduce((a, b) => (a[1] > b[1] ? a : b));
    return { service, count };
  }, [filteredData]);

  // ── Demographics filter ──────────────────────────────────────────────────────
  const filteredResidents = useMemo(() => {
    if (sexFilter === "all") return residentData;
    return residentData.filter((r) => r.sex.toLowerCase() === sexFilter.toLowerCase());
  }, [residentData, sexFilter]);

  const maleFemaleCount = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    residentData.forEach((r) => {
      if (r.sex === "Male") counts.Male++;
      else if (r.sex === "Female") counts.Female++;
    });
    return counts;
  }, [residentData]);

  // ── RBI Form C age brackets (5-year increments matching physical form) ────────
  const AGE_BRACKETS = [
    { label: "Under 5 years old", min: 0, max: 4 },
    { label: "5–9 years old", min: 5, max: 9 },
    { label: "10–14 years old", min: 10, max: 14 },
    { label: "15–19 years old", min: 15, max: 19 },
    { label: "20–24 years old", min: 20, max: 24 },
    { label: "25–29 years old", min: 25, max: 29 },
    { label: "30–34 years old", min: 30, max: 34 },
    { label: "35–39 years old", min: 35, max: 39 },
    { label: "40–44 years old", min: 40, max: 44 },
    { label: "45–49 years old", min: 45, max: 49 },
    { label: "50–54 years old", min: 50, max: 54 },
    { label: "55–59 years old", min: 55, max: 59 },
    { label: "60–64 years old", min: 60, max: 64 },
    { label: "65–69 years old", min: 65, max: 69 },
    { label: "70–74 years old", min: 70, max: 74 },
    { label: "75–79 years old", min: 75, max: 79 },
    { label: "80 years old and over", min: 80, max: 999 },
  ];

  const rbiFormCData = useMemo(() => {
    const ageBrackets = AGE_BRACKETS.map((bracket) => {
      const male = residentData.filter((r) => r.age !== null && r.age >= bracket.min && r.age <= bracket.max && r.sex === "Male").length;
      const female = residentData.filter((r) => r.age !== null && r.age >= bracket.min && r.age <= bracket.max && r.sex === "Female").length;
      return { ...bracket, male, female, total: male + female };
    });

    const sectors = [
      {
        label: "Labor Force",
        male: residentData.filter((r) => r.sex === "Male" && r.employmentStatus === "Employed").length,
        female: residentData.filter((r) => r.sex === "Female" && r.employmentStatus === "Employed").length
      },
      {
        label: "Unemployed",
        male: residentData.filter((r) => r.sex === "Male" && r.employmentStatus === "Unemployed").length,
        female: residentData.filter((r) => r.sex === "Female" && r.employmentStatus === "Unemployed").length
      },
      {
        label: "Out of School Children (OSC) 6–14 yrs old",
        male: residentData.filter((r) => r.sex === "Male" && r.age !== null && r.age >= 6 && r.age <= 14 && r.educationStatus === "Out of School").length,
        female: residentData.filter((r) => r.sex === "Female" && r.age !== null && r.age >= 6 && r.age <= 14 && r.educationStatus === "Out of School").length
      },
      {
        label: "Out of School Youth (OSY) 15–24 yrs old",
        male: residentData.filter((r) => r.sex === "Male" && r.age !== null && r.age >= 15 && r.age <= 24 && r.educationStatus === "Out of School").length,
        female: residentData.filter((r) => r.sex === "Female" && r.age !== null && r.age >= 15 && r.age <= 24 && r.educationStatus === "Out of School").length
      },
      {
        label: "Person with Disabilities (PWDs)",
        male: residentData.filter((r) => r.sex === "Male" && r.categories?.isPWD).length,
        female: residentData.filter((r) => r.sex === "Female" && r.categories?.isPWD).length
      },
      {
        label: "Overseas Filipino Workers (OFWs)",
        male: residentData.filter((r) => r.sex === "Male" && r.categories?.isOFW).length,
        female: residentData.filter((r) => r.sex === "Female" && r.categories?.isOFW).length
      },
      {
        label: "Solo Parents",
        male: residentData.filter((r) => r.sex === "Male" && r.categories?.isSoloParent).length,
        female: residentData.filter((r) => r.sex === "Female" && r.categories?.isSoloParent).length
      },
      {
        label: "Indigenous Peoples (IPs)",
        male: residentData.filter((r) => r.sex === "Male" && r.categories?.isIP).length,
        female: residentData.filter((r) => r.sex === "Female" && r.categories?.isIP).length
      },
    ].map((s) => ({ ...s, total: s.male + s.female }));

    const civilStatuses = ["Single", "Married", "Widowed", "Separated"].map((status) => ({
      label: status,
      male: residentData.filter((r) => r.sex === "Male" && r.civilStatus === status).length,
      female: residentData.filter((r) => r.sex === "Female" && r.civilStatus === status).length,
      get total() { return this.male + this.female; },
    }));

    const citizenshipRows = [
      {
        label: "Filipino",
        male: residentData.filter((r) => r.sex === "Male" && r.citizenship !== "Foreigner").length,
        female: residentData.filter((r) => r.sex === "Female" && r.citizenship !== "Foreigner").length
      },
      {
        label: "Foreigner",
        male: residentData.filter((r) => r.sex === "Male" && r.citizenship === "Foreigner").length,
        female: residentData.filter((r) => r.sex === "Female" && r.citizenship === "Foreigner").length
      },
    ].map((s) => ({ ...s, total: s.male + s.female }));

    return { ageBrackets, sectors, civilStatuses, citizenshipRows };
  }, [residentData]);

  // ── RBI Form A household data ─────────────────────────────────────────────────
  const rbiFormAData = useMemo(() => {
    return householdData.map((hh) => ({
      ...hh,
      members: residentData.filter((r) => r.householdID === hh.householdID),
    }));
  }, [householdData, residentData]);

  // ── CSV Export (Performance) ─────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ["Reference ID", "Category", "Service / Facility", "Sentiment", "Rating", "Comment", "User", "Date"];
    const rows = filteredData.map((item) => [
      item.referenceId, item.category, item.service, item.sentiment, item.rating,
      `"${(item.comment || "").replace(/"/g, '""')}"`, item.userName, item.date,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `performance_report_${startDate || "all"}_to_${endDate || "all"}.csv`; a.click();
    URL.revokeObjectURL(url);
    logTransaction(adminName, adminRole, "Exported CSV Report", `Total: ${filteredData.length}.`);
  };

  // ── Demographics CSV Export ──────────────────────────────────────────────────
  const handleExportDemographicsCSV = () => {
    const headers = ["Full Name", "Sex", "Age", "Birth Date", "Civil Status", "Citizenship", "Occupation", "Household ID"];
    const rows = filteredResidents.map((r) => [
      `"${r.fullName}"`, r.sex, r.age ?? "N/A", r.birthDate, r.civilStatus,
      r.citizenship, r.occupation, r.householdID,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `resident_demographics_${sexFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
    logTransaction(adminName, adminRole, "Exported Demographics CSV", `Filter: ${sexFilter}. Total: ${filteredResidents.length}.`);
  };

  // ── Performance PDF Export ───────────────────────────────────────────────────
  const handleExportPDF = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const pageH = doc.internal.pageSize.height;
      let y = 20;
      const checkPage = () => { if (y > pageH - 20) { doc.addPage(); y = 20; } };
      const write = (text, indent = 14, bold = false, size = 10) => {
        checkPage(); doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size); doc.text(String(text), indent, y); y += 7;
      };
      write("Community Performance Report", 14, true, 16); y += 2;
      write(`Date Range: ${startDate || "All"} — ${endDate || "All"}`);
      write(`Generated: ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`);
      y += 4;
      write("Summary", 14, true, 12);
      write(`Total Feedback: ${filteredData.length}`, 18);
      write(`Positive: ${sentimentBreakdown.positive}`, 18);
      write(`Neutral: ${sentimentBreakdown.neutral}`, 18);
      write(`Negative: ${sentimentBreakdown.negative}`, 18);
      y += 4;
      write("Feedback Per Category", 14, true, 12);
      Object.entries(categorizedServices).forEach(([cat, services]) => {
        write(`${cat}:`, 18, true, 10);
        services.forEach((svc) => write(`${svc}: ${feedbackPerService[svc] || 0}`, 24, false, 9));
        y += 2;
      });
      write("Sentiment Breakdown Per Category", 14, true, 12);
      Object.entries(categorySentiment).forEach(([cat, s]) => {
        const total = s.positive + s.neutral + s.negative;
        const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
        write(`${cat} (Total: ${total}):`, 18, true, 10);
        write(`Positive: ${s.positive} (${pct(s.positive)}%)`, 24, false, 9);
        write(`Neutral: ${s.neutral} (${pct(s.neutral)}%)`, 24, false, 9);
        write(`Negative: ${s.negative} (${pct(s.negative)}%)`, 24, false, 9);
        y += 2;
      });
      write("Highlights", 14, true, 12);
      write(`Most Positive: ${mostPositive.service} (${mostPositive.count})`, 18, false, 10);
      write(`Most Negative: ${mostNegative.service} (${mostNegative.count})`, 18, false, 10);
      doc.save(`performance_report_${startDate || "all"}_to_${endDate || "all"}.pdf`);
      logTransaction(adminName, adminRole, "Exported PDF Report", `Total: ${filteredData.length}.`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  // ── Demographics PDF Export ──────────────────────────────────────────────────
  const handleExportDemographicsPDF = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      let y = 20;
      const checkPage = () => { if (y > pageH - 20) { doc.addPage(); y = 20; } };

      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("Resident Demographics Report", 14, y); y += 8;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      doc.text(`Filter: ${sexFilter === "all" ? "All Residents" : sexFilter} | Total: ${filteredResidents.length} | Generated: ${new Date().toLocaleDateString("en-PH")}`, 14, y);
      y += 8;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(`Total: ${residentData.length}  Male: ${maleFemaleCount.Male}  Female: ${maleFemaleCount.Female}`, 14, y);
      y += 10;

      const cols = { name: 14, sex: 90, age: 110, civil: 125, citizen: 155, occ: 185, hhid: 230 };
      doc.setFontSize(8); doc.setFont("helvetica", "bold");
      doc.text("Full Name", cols.name, y); doc.text("Sex", cols.sex, y);
      doc.text("Age", cols.age, y); doc.text("Civil Status", cols.civil, y);
      doc.text("Citizenship", cols.citizen, y); doc.text("Occupation", cols.occ, y);
      doc.text("HH ID", cols.hhid, y); y += 3;
      doc.line(14, y, pageW - 14, y); y += 5;
      doc.setFont("helvetica", "normal");
      filteredResidents.forEach((r) => {
        checkPage();
        doc.text(r.fullName.substring(0, 30), cols.name, y);
        doc.text(r.sex, cols.sex, y);
        doc.text(r.age !== null ? String(r.age) : "N/A", cols.age, y);
        doc.text(r.civilStatus, cols.civil, y);
        doc.text(r.citizenship || "Filipino", cols.citizen, y);
        doc.text((r.occupation || "—").substring(0, 18), cols.occ, y);
        doc.text(r.householdID, cols.hhid, y);
        y += 6;
      });
      doc.save(`resident_demographics_${sexFilter}.pdf`);
      logTransaction(adminName, adminRole, "Exported Demographics PDF", `Filter: ${sexFilter}. Total: ${filteredResidents.length}.`);
    } catch (err) {
      console.error("Demographics PDF export failed:", err);
      alert("PDF export failed.");
    }
    setExportLoading(false);
  };

  // ── RBI Form A PDF Export — one PDF per household ───────────────────────────
  const handleExportRBIFormA = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");

      for (const hh of rbiFormAData) {
        const doc = new jsPDF({ orientation: "landscape" });
        const pageW = doc.internal.pageSize.width;
        const pageH = doc.internal.pageSize.height;
        let y = 12;

        // Title
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text("RBI FORM A (Revised 2024)", 14, y);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        doc.text("RECORDS OF BARANGAY INHABITANTS BY HOUSEHOLD", pageW / 2, y, { align: "center" });
        y += 7;

        // Header row (skip Region/Province/City/Barangay — filled manually)
        doc.setFontSize(8);
        doc.text(`HOUSEHOLD ADDRESS: ${hh.householdAddress || "—"}`, 14, y);
        doc.text(`NO. OF HOUSEHOLD MEMBERS: ${hh.members.length || hh.totalMembers}`, 175, y);
        y += 8;

        // Column definitions
        const colDefs = [
          { label: "LAST NAME", x: 14, w: 33 },
          { label: "FIRST NAME", x: 47, w: 33 },
          { label: "MIDDLE NAME", x: 80, w: 26 },
          { label: "EXT", x: 106, w: 11 },
          { label: "PLACE OF BIRTH", x: 117, w: 30 },
          { label: "DATE OF BIRTH", x: 147, w: 22 },
          { label: "AGE", x: 169, w: 11 },
          { label: "SEX", x: 180, w: 13 },
          { label: "CIVIL STATUS", x: 193, w: 20 },
          { label: "CITIZENSHIP", x: 213, w: 21 },
          { label: "OCCUPATION", x: 234, w: 22 },
          { label: "CATEGORY", x: 256, w: pageW - 256 - 14 },
        ];

        // Header row
        doc.setFillColor(230, 236, 245);
        doc.rect(14, y, pageW - 28, 8, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6);
        colDefs.forEach((col) => {
          doc.rect(col.x, y, col.w, 8);
          doc.text(col.label, col.x + 1, y + 5.2);
        });
        y += 8;

        // Member rows — minimum 8 rows displayed
        doc.setFont("helvetica", "normal"); doc.setFontSize(7);
        const minRows = Math.max(8, hh.members.length);
        for (let i = 0; i < minRows; i++) {
          if (y > pageH - 38) { doc.addPage(); y = 14; }
          const m = hh.members[i] || null;
          const rowH = 7;
          colDefs.forEach((col) => doc.rect(col.x, y, col.w, rowH));
          if (m) {
            const cats = [];
            if (m.categories?.isPWD) cats.push("PWD");
            if (m.categories?.isOFW) cats.push("OFW");
            if (m.categories?.isSoloParent) cats.push("Solo Parent");
            if (m.categories?.isIP) cats.push("IP");
            if (m.employmentStatus === "Unemployed") cats.push("Unemployed");
            if (m.educationStatus === "Out of School" && m.age >= 6 && m.age <= 14) cats.push("OSC");
            if (m.educationStatus === "Out of School" && m.age >= 15 && m.age <= 24) cats.push("OSY");
            const catStr = cats.join(", ") || "—";

            doc.text((m.lastName || "").substring(0, 15), colDefs[0].x + 1, y + 5);
            doc.text((m.firstName || "").substring(0, 15), colDefs[1].x + 1, y + 5);
            doc.text((m.middleName || "").substring(0, 11), colDefs[2].x + 1, y + 5);
            doc.text((m.suffix || ""), colDefs[3].x + 1, y + 5);
            doc.text((m.birthPlace || "").substring(0, 13), colDefs[4].x + 1, y + 5);
            doc.text((m.birthDate || ""), colDefs[5].x + 1, y + 5);
            doc.text(m.age !== null ? String(m.age) : "", colDefs[6].x + 1, y + 5);
            doc.text((m.sex || "").substring(0, 6), colDefs[7].x + 1, y + 5);
            doc.text((m.civilStatus || "").substring(0, 9), colDefs[8].x + 1, y + 5);
            doc.text((m.citizenship || "Filipino").substring(0, 9), colDefs[9].x + 1, y + 5);
            doc.text((m.occupation || "").substring(0, 10), colDefs[10].x + 1, y + 5);
            doc.text(catStr.substring(0, 12), colDefs[11].x + 1, y + 5);
          }
          y += rowH;
        }

        y += 10;
        // Signatures
        doc.setFontSize(7.5);
        doc.text("Prepared by:", 14, y); y += 5;
        doc.line(14, y, 75, y);
        doc.text("Name of Household/Head Member", 14, y + 4);
        doc.text("(Signature over Printed Name)", 14, y + 8);

        doc.text("Certified Correct:", pageW / 2 - 25, y - 5);
        doc.line(pageW / 2 - 25, y, pageW / 2 + 30, y);
        doc.text("Barangay Secretary", pageW / 2 - 25, y + 4);
        doc.text("(Signature over Printed Name)", pageW / 2 - 25, y + 8);

        doc.text("Validated by:", pageW - 78, y - 5);
        doc.line(pageW - 78, y, pageW - 14, y);
        doc.text("Punong Barangay", pageW - 78, y + 4);
        doc.text("(Signature over Printed Name)", pageW - 78, y + 8);

        doc.save(`RBI_Form_A_${hh.householdID}.pdf`);
      }

      logTransaction(adminName, adminRole, "Exported RBI Form A", `${rbiFormAData.length} household PDFs generated.`);
    } catch (err) {
      console.error("RBI Form A export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  // ── RBI Form C PDF Export ─────────────────────────────────────────────────────
  const handleExportRBIFormC = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait" });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      let y = 12;

      const checkPage = () => { if (y > pageH - 28) { doc.addPage(); y = 14; } };

      // Title
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      doc.text("RBI FORM C (Revised 2024)", 14, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.text("MONITORING REPORT", pageW / 2, y, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, pageW - 14, y, { align: "right" });
      y += 8;

      // Summary counts
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text(`Total No. of Barangay Inhabitants: ${residentData.length}`, 14, y); y += 5;
      doc.text(`Total No. of Households: ${householdData.length}`, 14, y); y += 5;
      doc.text(`Total No. of Families: ${householdData.length}`, 14, y); y += 9;

      // Table layout
      const COL_X = { ind: 14, male: 120, female: 146, total: 170, remarks: 192 };
      const COL_W = { ind: 105, male: 25, female: 25, total: 21, remarks: pageW - 192 - 4 };

      const drawTableHeader = () => {
        doc.setFillColor(215, 228, 243);
        doc.rect(COL_X.ind, y, pageW - 28, 8, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.text("INDICATORS", COL_X.ind + 2, y + 5.5);
        doc.text("MALE", COL_X.male + 8, y + 5.5);
        doc.text("FEMALE", COL_X.female + 4, y + 5.5);
        doc.text("TOTAL", COL_X.total + 3, y + 5.5);
        doc.text("REMARKS", COL_X.remarks + 2, y + 5.5);
        Object.entries(COL_X).forEach(([key, x]) => doc.rect(x, y, COL_W[key], 8));
        y += 8;
      };

      const drawSectionHeader = (title) => {
        checkPage();
        doc.setFillColor(195, 212, 235);
        doc.rect(COL_X.ind, y, pageW - 28, 7, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(8);
        doc.text(title, COL_X.ind + 2, y + 5);
        Object.entries(COL_X).forEach(([key, x]) => doc.rect(x, y, COL_W[key], 7));
        y += 7;
      };

      const drawDataRow = (label, male, female, remarks = "") => {
        checkPage();
        const rowH = 6;
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
        Object.entries(COL_X).forEach(([key, x]) => doc.rect(x, y, COL_W[key], rowH));
        doc.text(label, COL_X.ind + 2, y + 4.2);
        doc.text(String(male), COL_X.male + 20, y + 4.2, { align: "right" });
        doc.text(String(female), COL_X.female + 20, y + 4.2, { align: "right" });
        doc.text(String(male + female), COL_X.total + 16, y + 4.2, { align: "right" });
        if (remarks) doc.text(remarks, COL_X.remarks + 2, y + 4.2);
        y += rowH;
      };

      // Draw all sections
      drawTableHeader();
      drawSectionHeader("Population by Age Bracket:");
      rbiFormCData.ageBrackets.forEach((b) => drawDataRow(b.label, b.male, b.female));

      y += 3; checkPage();
      drawSectionHeader("Population by Sector:");
      rbiFormCData.sectors.forEach((s) => drawDataRow(s.label, s.male, s.female));

      y += 3; checkPage();
      drawSectionHeader("Civil Status:");
      rbiFormCData.civilStatuses.forEach((s) => drawDataRow(s.label, s.male, s.female));

      y += 3; checkPage();
      drawSectionHeader("Citizenship:");
      rbiFormCData.citizenshipRows.forEach((s) => drawDataRow(s.label, s.male, s.female));

      // Total row
      y += 4; checkPage();
      doc.setFillColor(215, 228, 243);
      doc.rect(COL_X.ind, y, pageW - 28, 7, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      Object.entries(COL_X).forEach(([key, x]) => doc.rect(x, y, COL_W[key], 7));
      doc.text("TOTAL POPULATION", COL_X.ind + 2, y + 5);
      doc.text(String(maleFemaleCount.Male), COL_X.male + 20, y + 5, { align: "right" });
      doc.text(String(maleFemaleCount.Female), COL_X.female + 20, y + 5, { align: "right" });
      doc.text(String(residentData.length), COL_X.total + 16, y + 5, { align: "right" });
      y += 16;

      // Signatures
      checkPage();
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text("Prepared by:", 14, y); y += 5;
      doc.line(14, y, 80, y);
      doc.text("Barangay Secretary", 14, y + 4);
      doc.text("(Signature over Printed Name)", 14, y + 8);
      doc.text("Submitted by:", pageW - 80, y - 5);
      doc.line(pageW - 80, y, pageW - 14, y);
      doc.text("Punong Barangay", pageW - 80, y + 4);
      doc.text("(Signature over Printed Name)", pageW - 80, y + 8);
      y += 18;
      doc.text("Date Accomplished: ___________________________", 14, y);

      doc.save("RBI_Form_C_Monitoring_Report.pdf");
      logTransaction(adminName, adminRole, "Exported RBI Form C", `Total residents: ${residentData.length}.`);
    } catch (err) {
      console.error("RBI Form C export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  // ── Shared table styles ──────────────────────────────────────────────────────
  const thStyle = { padding: "10px 12px", fontWeight: "600", fontSize: "13px", color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f3f4f6", textAlign: "left" };
  const tdStyle = { padding: "8px 12px", color: "#4b5563", fontSize: "13px", borderBottom: "1px solid #f3f4f6" };
  const tdNum = { ...tdStyle, textAlign: "right", fontWeight: "600" };
  const thNum = { ...thStyle, textAlign: "right" };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="main-content">

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
            { key: "performance", label: "Performance Report" },
            { key: "demographics", label: "Demographics" },
            { key: "rbi-a", label: "RBI Form A" },
            { key: "rbi-c", label: "RBI Form C" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setReportType(tab.key)} style={{
              padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontWeight: reportType === tab.key ? "bold" : "normal",
              background: reportType === tab.key ? "#2563eb" : "#e5e7eb",
              color: reportType === tab.key ? "#fff" : "#374151", transition: "all 0.2s",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ══ PERFORMANCE REPORT ══════════════════════════════════════════════ */}
        {reportType === "performance" && (
          <>
            <div className="card-grid">
              <div className="card">Total Feedback<br /><strong>{loading ? "…" : filteredData.length}</strong></div>
              <div className="card">Positive<br /><strong>{loading ? "…" : sentimentBreakdown.positive}</strong></div>
              <div className="card">Neutral<br /><strong>{loading ? "…" : sentimentBreakdown.neutral}</strong></div>
              <div className="card">Negative<br /><strong>{loading ? "…" : sentimentBreakdown.negative}</strong></div>
            </div>
            <div className="section">
              <div className="report-header">
                <h2>Community Performance Report</h2>
                <div className="report-controls">
                  <div className="filter-group"><label>Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="filter-group"><label>End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
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
                        <li key={cat}><strong>{cat}</strong>
                          <ul className="sub-list">{services.map((svc) => (<li key={svc}>{svc}: {feedbackPerService[svc] || 0}</li>))}</ul>
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
                              const pct = total ? Math.round((count / total) * 100) : 0;
                              return (
                                <div key={type} className={`sentiment-pill ${type}`}>
                                  <div className="sentiment-label">{type.charAt(0).toUpperCase() + type.slice(1)}: {count} ({pct}%)</div>
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

        {/* ══ DEMOGRAPHICS ════════════════════════════════════════════════════ */}
        {reportType === "demographics" && (
          <>
            <div className="card-grid">
              <div className="card">Total Residents<br /><strong>{residentData.length}</strong></div>
              <div className="card">Male<br /><strong>{maleFemaleCount.Male}</strong></div>
              <div className="card">Female<br /><strong>{maleFemaleCount.Female}</strong></div>
            </div>
            <div className="section">
              <div className="report-header">
                <h2>Resident Demographics</h2>
                <div className="report-controls">
                  <div className="filter-group">
                    <label>Filter by Sex</label>
                    <select value={sexFilter} onChange={(e) => setSexFilter(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px" }}>
                      <option value="all">All</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <button className="export-btn" onClick={handleExportDemographicsCSV} disabled={filteredResidents.length === 0 || exportLoading}>Export CSV</button>
                  <button className="export-btn" onClick={handleExportDemographicsPDF} disabled={filteredResidents.length === 0 || exportLoading}>
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>
              {filteredResidents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No residents found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Full Name", "Sex", "Age", "Civil Status", "Citizenship", "Occupation", "Household ID"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {filteredResidents.map((r) => (
                        <tr key={r.id}>
                          <td style={tdStyle}>{r.fullName}</td>
                          <td style={tdStyle}>{r.sex}</td>
                          <td style={tdStyle}>{r.age !== null ? r.age : "N/A"}</td>
                          <td style={tdStyle}>{r.civilStatus}</td>
                          <td style={tdStyle}>{r.citizenship || "Filipino"}</td>
                          <td style={tdStyle}>{r.occupation || "—"}</td>
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

        {/* ══ RBI FORM A ══════════════════════════════════════════════════════ */}
        {reportType === "rbi-a" && (
          <>
            <div className="card-grid">
              <div className="card">Total Households<br /><strong>{householdData.length}</strong></div>
              <div className="card">Total Residents<br /><strong>{residentData.length}</strong></div>
              <div className="card">Male<br /><strong>{maleFemaleCount.Male}</strong></div>
              <div className="card">Female<br /><strong>{maleFemaleCount.Female}</strong></div>
            </div>
            <div className="section">
              <div className="report-header">
                <h2>RBI Form A — Records of Barangay Inhabitants by Household</h2>
                <div className="report-controls">
                  <button className="export-btn" onClick={handleExportRBIFormA}
                    disabled={rbiFormAData.length === 0 || exportLoading}>
                    {exportLoading ? "Generating…" : `Export PDF (${rbiFormAData.length} households)`}
                  </button>
                </div>
              </div>

              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                <strong>Note:</strong> Exports one PDF per household matching RBI Form A (Revised 2024). The table includes: Last Name, First Name, Middle Name, Suffix, Place of Birth, Date of Birth, Age, Sex, Civil Status, Citizenship, Occupation, and Category (PWD/OFW/Solo Parent/IP/OSC/OSY). Region/Province/City/Municipality/Barangay fields are filled in manually by the Barangay Secretary on the physical form.
              </div>

              {rbiFormAData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No household data found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>{["Household ID", "Household Address", "No. of Members", "Head of Household", "Members Preview"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rbiFormAData.map((hh) => {
                        const head = hh.members.find((m) => m.role === "head");
                        return (
                          <tr key={hh.id}>
                            <td style={tdStyle}><strong>{hh.householdID}</strong></td>
                            <td style={tdStyle}>{hh.householdAddress || "—"}</td>
                            <td style={{ ...tdStyle, textAlign: "center" }}>{hh.members.length}</td>
                            <td style={tdStyle}>{head ? head.fullName : "—"}</td>
                            <td style={tdStyle}>
                              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                                {hh.members.slice(0, 3).map((m) => m.fullName).join(", ")}
                                {hh.members.length > 3 && ` +${hh.members.length - 3} more`}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ RBI FORM C ══════════════════════════════════════════════════════ */}
        {reportType === "rbi-c" && (
          <>
            <div className="card-grid">
              <div className="card">Total Population<br /><strong>{residentData.length}</strong></div>
              <div className="card">Total Households<br /><strong>{householdData.length}</strong></div>
              <div className="card">Male<br /><strong>{maleFemaleCount.Male}</strong></div>
              <div className="card">Female<br /><strong>{maleFemaleCount.Female}</strong></div>
            </div>
            <div className="section">
              <div className="report-header">
                <h2>RBI Form C — Barangay Monitoring Report</h2>
                <div className="report-controls">
                  <button className="export-btn" onClick={handleExportRBIFormC}
                    disabled={residentData.length === 0 || exportLoading}>
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>

              {/* A. Age Brackets */}
              <div className="report-card" style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px" }}>A. Population by Age Bracket</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Age Bracket</th>
                        <th style={thNum}>Male</th>
                        <th style={thNum}>Female</th>
                        <th style={thNum}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rbiFormCData.ageBrackets.map((b) => (
                        <tr key={b.label}>
                          <td style={tdStyle}>{b.label}</td>
                          <td style={tdNum}>{b.male}</td>
                          <td style={tdNum}>{b.female}</td>
                          <td style={{ ...tdNum, fontWeight: "700", color: "#111827" }}>{b.total}</td>
                        </tr>
                      ))}
                      <tr style={{ background: "#eff6ff" }}>
                        <td style={{ ...tdStyle, fontWeight: "700", color: "#1e40af" }}>TOTAL</td>
                        <td style={{ ...tdNum, fontWeight: "700", color: "#1e40af" }}>{maleFemaleCount.Male}</td>
                        <td style={{ ...tdNum, fontWeight: "700", color: "#1e40af" }}>{maleFemaleCount.Female}</td>
                        <td style={{ ...tdNum, fontWeight: "700", color: "#1e40af" }}>{residentData.length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* B. Population by Sector */}
              <div className="report-card" style={{ marginBottom: "20px" }}>
                <h3 style={{ marginBottom: "12px" }}>B. Population by Sector</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Sector</th>
                        <th style={thNum}>Male</th>
                        <th style={thNum}>Female</th>
                        <th style={thNum}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rbiFormCData.sectors.map((s) => (
                        <tr key={s.label}>
                          <td style={tdStyle}>{s.label}</td>
                          <td style={tdNum}>{s.male}</td>
                          <td style={tdNum}>{s.female}</td>
                          <td style={{ ...tdNum, fontWeight: "700", color: "#111827" }}>{s.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* C & D side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="report-card">
                  <h3 style={{ marginBottom: "12px" }}>Civil Status</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr><th style={thStyle}>Status</th><th style={thNum}>Male</th><th style={thNum}>Female</th><th style={thNum}>Total</th></tr>
                    </thead>
                    <tbody>
                      {rbiFormCData.civilStatuses.map((s) => (
                        <tr key={s.label}>
                          <td style={tdStyle}>{s.label}</td>
                          <td style={tdNum}>{s.male}</td>
                          <td style={tdNum}>{s.female}</td>
                          <td style={{ ...tdNum, fontWeight: "700", color: "#111827" }}>{s.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="report-card">
                  <h3 style={{ marginBottom: "12px" }}>Citizenship</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr><th style={thStyle}>Type</th><th style={thNum}>Male</th><th style={thNum}>Female</th><th style={thNum}>Total</th></tr>
                    </thead>
                    <tbody>
                      {rbiFormCData.citizenshipRows.map((s) => (
                        <tr key={s.label}>
                          <td style={tdStyle}>{s.label}</td>
                          <td style={tdNum}>{s.male}</td>
                          <td style={tdNum}>{s.female}</td>
                          <td style={{ ...tdNum, fontWeight: "700", color: "#111827" }}>{s.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
}