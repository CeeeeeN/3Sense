import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { useMemo, useState, useEffect } from "react";
import { collection, getDocs, query, where, collectionGroup } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { logTransaction } from "../services/logger";

export default function Reports() {

  // ── State ────────────────────────────────────────────────────────────────────
  const [reportType, setReportType] = useState("demographics");
  const [residentData, setResidentData] = useState([]);
  const [householdData, setHouseholdData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [sexFilter, setSexFilter] = useState("all");
  const [sortDemographics, setSortDemographics] = useState("name_asc"); // name_asc, name_desc, age_asc, age_desc, hhid_asc, hhid_desc
  const [sortRbiA, setSortRbiA] = useState("hhid_asc"); // hhid_asc, hhid_desc, members_desc, members_asc, head_asc, head_desc
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [demoPage, setDemoPage] = useState(1);
  const [rbiAPage, setRbiAPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setDemoPage(1);
  }, [sexFilter, sortDemographics]);

  useEffect(() => {
    setRbiAPage(1);
  }, [sortRbiA]);

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

  // ── Fetch Residents via collectionGroup ──────────────────────────────────────
  useEffect(() => {
    const fetchResidents = async () => {
      setLoading(true);
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
      setLoading(false);
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
            barangay: d.barangay || "Malanday",
            city: d.city || "Valenzuela City",
          };
        });
        setHouseholdData(data);
      } catch (err) { console.error("Error fetching households:", err); }
    };
    fetchHouseholds();
  }, []);

  // ── Demographics filter & sort ───────────────────────────────────────────────
  const filteredResidents = useMemo(() => {
    let result = residentData;
    if (sexFilter !== "all") {
      result = result.filter((r) => (r.sex || "").toLowerCase() === sexFilter.toLowerCase());
    }
    return result.slice().sort((a, b) => {
      if (sortDemographics === "name_asc") return a.fullName.localeCompare(b.fullName);
      if (sortDemographics === "name_desc") return b.fullName.localeCompare(a.fullName);
      if (sortDemographics === "age_asc") return (a.age ?? 0) - (b.age ?? 0);
      if (sortDemographics === "age_desc") return (b.age ?? 0) - (a.age ?? 0);
      if (sortDemographics === "hhid_asc") return (a.householdID || "").localeCompare(b.householdID || "");
      if (sortDemographics === "hhid_desc") return (b.householdID || "").localeCompare(a.householdID || "");
      return 0;
    });
  }, [residentData, sexFilter, sortDemographics]);

  const filteredStats = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    filteredResidents.forEach((r) => {
      if (r.sex === "Male") counts.Male++;
      else if (r.sex === "Female") counts.Female++;
    });
    return { total: filteredResidents.length, ...counts };
  }, [filteredResidents]);

  const maleFemaleCount = useMemo(() => {
    const counts = { Male: 0, Female: 0 };
    residentData.forEach((r) => {
      if (r.sex === "Male") counts.Male++;
      else if (r.sex === "Female") counts.Female++;
    });
    return counts;
  }, [residentData]);

  // ── RBI Form C age brackets ─────────────────────────────────────────────────
  const AGE_BRACKETS = [
    { label: "0–1 yrs old (Infant)", min: 0, max: 1 },
    { label: "2–5 yrs old (Toddler)", min: 2, max: 5 },
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

  // ── RBI Form A household data & sorting ───────────────────────────────────────
  const rbiFormAData = useMemo(() => {
    return householdData
      .map((hh) => {
        const members = residentData.filter((r) => r.householdID === hh.householdID);
        const head = members.find((m) => m.role === "head");
        return {
          ...hh,
          members,
          headName: head ? head.fullName : "",
        };
      })
      .sort((a, b) => {
        if (sortRbiA === "hhid_asc") return (a.householdID || "").localeCompare(b.householdID || "");
        if (sortRbiA === "hhid_desc") return (b.householdID || "").localeCompare(a.householdID || "");
        if (sortRbiA === "members_desc") return b.members.length - a.members.length;
        if (sortRbiA === "members_asc") return a.members.length - b.members.length;
        if (sortRbiA === "head_asc") return (a.headName || "").localeCompare(b.headName || "");
        if (sortRbiA === "head_desc") return (b.headName || "").localeCompare(a.headName || "");
        return 0;
      });
  }, [householdData, residentData, sortRbiA]);

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
      doc.text("BARANGAY 3S+ MALANDAY", 14, y); y += 6;
      doc.setFontSize(12);
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

      if (y + 25 > pageH) { doc.addPage(); y = 20; }
      y += 10;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Prepared By:", 14, y);
      doc.setFont("helvetica", "bold");
      doc.text((adminName || "ADMIN").toUpperCase(), 14, y + 12);
      doc.line(14, y + 13, 75, y + 13);
      doc.setFont("helvetica", "normal");
      doc.text(adminRole || "Barangay Staff", 14, y + 17);

      doc.text("Noted By:", pageW - 75, y);
      doc.setFont("helvetica", "bold");
      doc.text("HON. PUNONG BARANGAY", pageW - 75, y + 12);
      doc.line(pageW - 75, y + 13, pageW - 14, y + 13);
      doc.setFont("helvetica", "normal");
      doc.text("Barangay Captain", pageW - 75, y + 17);

      doc.save(`resident_demographics_${sexFilter}.pdf`);
      logTransaction(adminName, adminRole, "Exported Demographics PDF", `Filter: ${sexFilter}. Total: ${filteredResidents.length}.`);
    } catch (err) {
      console.error("Demographics PDF export failed:", err);
      alert("PDF export failed.");
    }
    setExportLoading(false);
  };

  const handleExportRBIFormA = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      let y = 12;

      const drawHeader = () => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text("BARANGAY 3S+ MALANDAY", 14, 12);
        doc.setFontSize(9);
        doc.text("RBI FORM A (Revised 2024)", 14, 17);

        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        doc.text("RECORDS OF BARANGAY INHABITANTS MASTERLIST", pageW / 2, 14, { align: "center" });
        doc.setFontSize(8);
        doc.text(`Total Households: ${householdData.length} | Total Inhabitants: ${residentData.length}`, pageW - 14, 14, { align: "right" });
      };

      const colDefs = [
        { label: "HOUSEHOLD ID", x: 14, w: 32 },
        { label: "LAST NAME", x: 46, w: 27 },
        { label: "FIRST NAME", x: 73, w: 27 },
        { label: "MIDDLE NAME", x: 100, w: 24 },
        { label: "EXT", x: 124, w: 10 },
        { label: "PLACE OF BIRTH", x: 134, w: 26 },
        { label: "DATE OF BIRTH", x: 160, w: 22 },
        { label: "AGE", x: 182, w: 10 },
        { label: "SEX", x: 192, w: 12 },
        { label: "CIVIL STATUS", x: 204, w: 20 },
        { label: "CITIZENSHIP", x: 224, w: 20 },
        { label: "OCCUPATION", x: 244, w: 20 },
        { label: "CATEGORY", x: 264, w: pageW - 264 - 14 },
      ];

      const drawTableHeader = () => {
        doc.setFillColor(230, 236, 245);
        doc.rect(14, y, pageW - 28, 8, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(6);
        colDefs.forEach((col) => {
          doc.rect(col.x, y, col.w, 8);
          doc.text(col.label, col.x + 1, y + 5.2);
        });
        y += 8;
      };

      drawHeader();
      y = 24;
      drawTableHeader();

      const allMasterlistRows = [];

      householdData.forEach((hh) => {
        const members = residentData.filter((r) => r.householdID === hh.householdID);

        if (members && members.length > 0) {
          members.forEach((m) => {
            allMasterlistRows.push({ ...m, hhid: hh.householdID });
          });
        } else {
          allMasterlistRows.push({
            hhid: hh.householdID,
            lastName: "— No Members —",
          });
        }
      });

      doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
      allMasterlistRows.forEach((m) => {
        if (y > pageH - 35) {
          doc.addPage();
          drawHeader();
          y = 24;
          drawTableHeader();
          doc.setFont("helvetica", "normal"); doc.setFontSize(6.5);
        }

        const rowH = 7;
        colDefs.forEach((col) => doc.rect(col.x, y, col.w, rowH));

        const cats = [];
        if (m.categories?.isPWD) cats.push("PWD");
        if (m.categories?.isOFW) cats.push("OFW");
        if (m.categories?.isSoloParent) cats.push("Solo Parent");
        if (m.categories?.isIP) cats.push("IP");
        if (m.employmentStatus === "Unemployed") cats.push("Unemployed");
        if (m.educationStatus === "Out of School" && m.age >= 6 && m.age <= 14) cats.push("OSC");
        if (m.educationStatus === "Out of School" && m.age >= 15 && m.age <= 24) cats.push("OSY");
        const catStr = cats.join(", ") || "—";

        doc.text(String(m.hhid || ""), colDefs[0].x + 1, y + 5);
        doc.text((m.lastName || "").substring(0, 15), colDefs[1].x + 1, y + 5);
        doc.text((m.firstName || "").substring(0, 15), colDefs[2].x + 1, y + 5);
        doc.text((m.middleName || "").substring(0, 11), colDefs[3].x + 1, y + 5);
        doc.text((m.suffix || ""), colDefs[4].x + 1, y + 5);
        doc.text((m.birthPlace || "").substring(0, 13), colDefs[5].x + 1, y + 5);
        doc.text((m.birthDate || ""), colDefs[6].x + 1, y + 5);
        doc.text(m.age !== null && m.age !== undefined ? String(m.age) : "", colDefs[7].x + 1, y + 5);
        doc.text((m.sex || "").substring(0, 6), colDefs[8].x + 1, y + 5);
        doc.text((m.civilStatus || "").substring(0, 9), colDefs[9].x + 1, y + 5);
        doc.text((m.citizenship || "Filipino").substring(0, 9), colDefs[10].x + 1, y + 5);
        doc.text((m.occupation || "").substring(0, 10), colDefs[11].x + 1, y + 5);
        doc.text(catStr.substring(0, 12), colDefs[12].x + 1, y + 5);

        y += rowH;
      });

      if (y + 30 > pageH) {
        doc.addPage();
        y = 20;
      } else {
        y += 10;
      }

      doc.setFontSize(7.5);
      doc.text("Prepared by:", 14, y); y += 5;
      doc.setFont("helvetica", "bold");
      doc.text((adminName || "ADMIN STAFF").toUpperCase(), 14, y + 3);
      doc.line(14, y + 4, 75, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("(Signature over Printed Name)", 14, y + 8);

      doc.text("Certified Correct:", pageW / 2 - 25, y - 5);
      doc.setFont("helvetica", "bold");
      doc.text("BARANGAY SECRETARY", pageW / 2 - 25, y + 3);
      doc.line(pageW / 2 - 25, y + 4, pageW / 2 + 30, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Barangay Secretary", pageW / 2 - 25, y + 8);

      doc.text("Noted by:", pageW - 78, y - 5);
      doc.setFont("helvetica", "bold");
      doc.text("HON. PUNONG BARANGAY", pageW - 78, y + 3);
      doc.line(pageW - 78, y + 4, pageW - 14, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Punong Barangay", pageW - 78, y + 8);

      doc.save(`RBI_Form_A_Masterlist_${new Date().toISOString().split("T")[0]}.pdf`);
      logTransaction(adminName, adminRole, "Exported RBI Form A Masterlist", `${householdData.length} households in 1 Masterlist PDF.`);
    } catch (err) {
      console.error("RBI Form A export failed:", err);
      alert("PDF export failed. Make sure jsPDF is installed:\nnpm install jspdf");
    }
    setExportLoading(false);
  };

  const handleExportRBIFormC = async () => {
    setExportLoading(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait" });
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      let y = 12;

      const checkPage = () => { if (y > pageH - 28) { doc.addPage(); y = 14; } };

      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("BARANGAY 3S+ MALANDAY", 14, y);
      doc.setFontSize(11);
      doc.text("RBI FORM C (Revised 2024)", 14, y + 5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.text("MONITORING REPORT", pageW / 2, y + 2, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en-PH")}`, pageW - 14, y + 2, { align: "right" });
      y += 14;

      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.text(`Total No. of Barangay Inhabitants: ${residentData.length}`, 14, y); y += 5;
      doc.text(`Total No. of Households: ${householdData.length}`, 14, y); y += 5;
      doc.text(`Total No. of Families: ${householdData.length}`, 14, y); y += 9;

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

      checkPage();
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text("Prepared by:", 14, y); y += 5;
      doc.setFont("helvetica", "bold");
      doc.text((adminName || "BARANGAY SECRETARY").toUpperCase(), 14, y + 3);
      doc.line(14, y + 4, 80, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Barangay Secretary / Admin", 14, y + 8);

      doc.text("Noted by:", pageW - 80, y - 5);
      doc.setFont("helvetica", "bold");
      doc.text("HON. PUNONG BARANGAY", pageW - 80, y + 3);
      doc.line(pageW - 80, y + 4, pageW - 14, y + 4);
      doc.setFont("helvetica", "normal");
      doc.text("Punong Barangay", pageW - 80, y + 8);
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

  const thStyle = { padding: "10px 12px", fontWeight: "600", fontSize: "13px", color: "#374151", borderBottom: "2px solid #e5e7eb", background: "#f3f4f6", textAlign: "left" };
  const tdStyle = { padding: "8px 12px", color: "#4b5563", fontSize: "13px", borderBottom: "1px solid #f3f4f6" };
  const tdNum = { ...tdStyle, textAlign: "right", fontWeight: "600" };
  const thNum = { ...thStyle, textAlign: "right" };

  const totalDemoPages = Math.ceil(filteredResidents.length / ITEMS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice(
    (demoPage - 1) * ITEMS_PER_PAGE,
    demoPage * ITEMS_PER_PAGE
  );

  const totalRbiAPages = Math.ceil(rbiFormAData.length / ITEMS_PER_PAGE);
  const paginatedRbiA = rbiFormAData.slice(
    (rbiAPage - 1) * ITEMS_PER_PAGE,
    rbiAPage * ITEMS_PER_PAGE
  );

  const renderPaginationControls = (currentPage, totalPages, setPageFn) => {
    if (totalPages <= 1) return null;

    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    const pages = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    const btnStyle = { padding: "6px 12px", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "13px" };

    return (
      <div style={{ display: "flex", gap: "4px" }}>
        <button
          onClick={() => setPageFn(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ ...btnStyle, background: currentPage === 1 ? "#f3f4f6" : "#fff", color: currentPage === 1 ? "#9ca3af" : "#374151", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          Prev
        </button>

        {startPage > 1 && (
          <>
            <button onClick={() => setPageFn(1)} style={{ ...btnStyle, background: "#fff", color: "#374151" }}>1</button>
            {startPage > 2 && <span style={{ padding: "6px 4px", color: "#6b7280" }}>...</span>}
          </>
        )}

        {pages.map(i => (
          <button
            key={i}
            onClick={() => setPageFn(i)}
            style={{ ...btnStyle, background: currentPage === i ? "#2563eb" : "#fff", color: currentPage === i ? "#fff" : "#374151", fontWeight: currentPage === i ? "bold" : "normal" }}
          >
            {i}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span style={{ padding: "6px 4px", color: "#6b7280" }}>...</span>}
            <button onClick={() => setPageFn(totalPages)} style={{ ...btnStyle, background: "#fff", color: "#374151" }}>{totalPages}</button>
          </>
        )}

        <button
          onClick={() => setPageFn(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ ...btnStyle, background: currentPage === totalPages ? "#f3f4f6" : "#fff", color: currentPage === totalPages ? "#9ca3af" : "#374151", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="main-content">

        {/* ── TABS ── */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "24px", flexWrap: "wrap" }}>
          {[
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

        {/* ══ DEMOGRAPHICS ════════════════════════════════════════════════════ */}
        {reportType === "demographics" && (
          <>
            <div className="card-grid">
              <div className="card">Total Residents<br /><strong>{loading ? "..." : filteredStats.total}</strong></div>
              <div className="card">Male<br /><strong>{loading ? "..." : filteredStats.Male}</strong></div>
              <div className="card">Female<br /><strong>{loading ? "..." : filteredStats.Female}</strong></div>
            </div>
            <div className="section">
              <div className="report-header">
                <h2>Resident Demographics</h2>
                <div className="report-controls" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div className="filter-group" style={{ display: "flex", flexDirection: "row", gap: "12px", alignItems: "center", flexWrap: "nowrap" }}>
                    <select
                      value={sexFilter}
                      onChange={(e) => setSexFilter(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: "#fff" }}
                    >
                      <option value="all">All Sexes</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>

                    <select
                      value={sortDemographics}
                      onChange={(e) => setSortDemographics(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: "#fff" }}
                    >
                      <option value="name_asc">Name: A to Z</option>
                      <option value="name_desc">Name: Z to A</option>
                      <option value="age_asc">Age: Lowest First</option>
                      <option value="age_desc">Age: Highest First</option>
                      <option value="hhid_asc">Household ID: Ascending</option>
                      <option value="hhid_desc">Household ID: Descending</option>
                    </select>
                  </div>
                  <button className="export-btn" onClick={handleExportDemographicsCSV} disabled={filteredResidents.length === 0 || exportLoading}>Export CSV</button>
                  <button className="export-btn" onClick={handleExportDemographicsPDF} disabled={filteredResidents.length === 0 || exportLoading}>
                    {exportLoading ? "Generating…" : "Export PDF"}
                  </button>
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>Loading resident data…</div>
              ) : filteredResidents.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No residents found.</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Full Name", "Sex", "Age", "Civil Status", "Citizenship", "Occupation", "Household ID"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {paginatedResidents.map((r, index) => (
                          <tr key={`${r.id}-${index}`}>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{r.fullName}</td>
                            <td style={tdStyle}>{r.sex}</td>
                            <td style={tdStyle}>{r.age !== null ? r.age : "N/A"}</td>
                            <td style={tdStyle}>{r.civilStatus}</td>
                            <td style={tdStyle}>{r.citizenship || "Filipino"}</td>
                            <td style={tdStyle}>{r.occupation || "—"}</td>
                            <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.82rem" }}>{r.householdID}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9fafb" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      Showing {filteredResidents.length > 0 ? (demoPage - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(demoPage * ITEMS_PER_PAGE, filteredResidents.length)} of {filteredResidents.length} entries
                    </span>

                    {renderPaginationControls(demoPage, totalDemoPages, setDemoPage)}
                  </div>
                </>
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
                <h2>RBI Form A — Records of Barangay Inhabitants Masterlist</h2>
                <div className="report-controls" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                  <div className="filter-group" style={{ display: "flex", flexDirection: "row", gap: "12px", alignItems: "center", flexWrap: "nowrap" }}>
                    <select
                      value={sortRbiA}
                      onChange={(e) => setSortRbiA(e.target.value)}
                      style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "14px", background: "#fff" }}
                    >
                      <option value="hhid_asc">Household ID: Ascending</option>
                      <option value="hhid_desc">Household ID: Descending</option>
                      <option value="members_desc">Members: Highest First</option>
                      <option value="members_asc">Members: Lowest First</option>
                      <option value="head_asc">Head Name: A to Z</option>
                      <option value="head_desc">Head Name: Z to A</option>
                    </select>
                  </div>
                  <button className="export-btn" onClick={handleExportRBIFormA}
                    disabled={rbiFormAData.length === 0 || exportLoading}>
                    {exportLoading ? "Generating…" : "Export Masterlist PDF"}
                  </button>
                </div>
              </div>

              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1e40af" }}>
                <strong>Note:</strong> Exports 1 Masterlist PDF file containing all households matching RBI Form A (Revised 2024) in a single continuous table structure.
              </div>

              {rbiFormAData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#9ca3af" }}>No household data found.</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>{["Household ID", "Household Address", "No. of Members", "Head of Household", "Members Preview"].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {paginatedRbiA.map((hh) => {
                          const head = hh.members.find((m) => m.role === "head");
                          return (
                            <tr key={hh.id}>
                              <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace" }}><strong>{hh.householdID}</strong></td>
                              <td style={tdStyle}>{hh.householdAddress || "—"}</td>
                              <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>{hh.members.length}</td>
                              <td style={{ ...tdStyle, fontWeight: 500 }}>{head ? head.fullName : "—"}</td>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9fafb" }}>
                    <span style={{ fontSize: "13px", color: "#6b7280" }}>
                      Showing {rbiFormAData.length > 0 ? (rbiAPage - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(rbiAPage * ITEMS_PER_PAGE, rbiFormAData.length)} of {rbiFormAData.length} entries
                    </span>

                    {renderPaginationControls(rbiAPage, totalRbiAPages, setRbiAPage)}
                  </div>
                </>
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
              <div className="rbi-bottom-grid">
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