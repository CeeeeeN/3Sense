import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, collectionGroup, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import FeedbackModal from "./FeedbackModal";
import { AlertCircleIcon } from "../Icons";

export default function FeedbackAlerts({ householdID, residentID, onNavigate }) {
  const [pendingItems, setPendingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ADDED FOR 480px RESPONSIVE
  const [isMobile480, setIsMobile480] = useState(window.innerWidth <= 480);

  // ADDED FOR 480px RESPONSIVE
  useEffect(() => {
    const handleResize = () => {
      setIsMobile480(window.innerWidth <= 480);
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!householdID || !residentID) return;

    // 1. Setup queries for items that are finished
    const qDocs = query(
      collection(db, "document_requests"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "Claimed"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const qRes = query(
      collection(db, "facility_reservations"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "Completed"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const qEq = query(
      collection(db, "equipment_rentals"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "Returned"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const qProg = query(
      collection(db, "livelihoodRegistrations"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "Completed"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const qGenProg = query(
      collectionGroup(db, "attendees"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "Completed"),
      limit(10) 
    );

    const qInc = query(
      collection(db, "incidentReports"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "resolved"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    const qBswd = query(
      collection(db, "bswdReports"),
      where("householdID", "==", householdID),
      where("residentID", "==", residentID),
      where("status", "==", "resolved"),
      orderBy("submittedAt", "desc"),
      limit(10)
    );

    // Added eqData to the arrays
    let docsData = [], resData = [], eqData = [], progData = [], genProgData = [], incData = [], bswdData = [];

    const updatePending = () => {
      // Include eqData in the combined array
      const combined = [...docsData, ...resData, ...eqData, ...progData, ...genProgData, ...incData, ...bswdData];

      const requiresFeedback = combined.filter(item => item.feedbackSubmitted !== true);

      requiresFeedback.sort((a, b) => {
        const timeA = (a.createdAt || a.submittedAt)?.toMillis ? (a.createdAt || a.submittedAt).toMillis() : 0;
        const timeB = (b.createdAt || b.submittedAt)?.toMillis ? (b.createdAt || b.submittedAt).toMillis() : 0;
        return timeA - timeB;
      });

      setPendingItems(requiresFeedback);
    };

    // Attach Listeners
    const unsubDocs = onSnapshot(qDocs, (snap) => {
      docsData = snap.docs.map(doc => ({ id: doc.id, _type: "DOCUMENT", title: doc.data().documentName || doc.data().documentType || doc.data().name || "Document Request", ...doc.data() }));
      updatePending();
    });

    const unsubRes = onSnapshot(qRes, (snap) => {
      resData = snap.docs.map(doc => ({ id: doc.id, _type: "FACILITY", title: doc.data().purpose || "Reservation", ...doc.data() }));
      updatePending();
    });

    const unsubEq = onSnapshot(qEq, (snap) => {
      eqData = snap.docs.map(doc => ({ id: doc.id, _type: "EQUIPMENT", title: doc.data().equipmentName || "Equipment Rental", ...doc.data() }));
      updatePending();
    });

    const unsubProg = onSnapshot(qProg, (snap) => {
      progData = snap.docs.map(doc => ({ id: doc.id, _type: "LIVELIHOOD", title: doc.data().programName, ...doc.data() }));
      updatePending();
    });

    const unsubGenProg = onSnapshot(qGenProg, (snap) => {
      genProgData = snap.docs.map(doc => ({
        id: doc.ref.path,
        _type: "GENERAL_PROGRAM",
        title: doc.data().programName || doc.data().eventName || doc.data().title || "Barangay Program",
        ...doc.data()
      }));
      updatePending();
    });

    const unsubInc = onSnapshot(qInc, (snap) => {
      incData = snap.docs.map(doc => ({ id: doc.id, _type: "PEACE_AND_ORDER", title: doc.data().incidentType, ...doc.data() }));
      updatePending();
    });

    const unsubBswd = onSnapshot(qBswd, (snap) => {
      bswdData = snap.docs.map(doc => ({ id: doc.id, _type: "BSWD_REPORT", title: doc.data().reportType, ...doc.data() }));
      updatePending();
    });

    return () => {
      unsubDocs();
      unsubRes();
      unsubEq(); // 👇 Clean up the equipment listener
      unsubProg();
      unsubGenProg();
      unsubInc();
      unsubBswd();
    };
  }, [householdID, residentID]);

  // Handlers
  const handleOpenModal = () => {
    setSelectedItem(pendingItems[0]);
    setIsModalOpen(true);
  };

  const handleAnswer = () => {
    setIsModalOpen(false);
    console.log("Redirecting to survey for:", selectedItem);

    const safeTitle = selectedItem?.title || "Barangay Service";

    // encodeURIComponent safely handles the slashes in the document path we passed!
    const queryParams = `?refId=${encodeURIComponent(selectedItem.id)}&type=${selectedItem._type}&title=${encodeURIComponent(safeTitle)}`;
    window.history.pushState({}, '', queryParams);

    if (typeof onNavigate === "function") {
      onNavigate("feedback");
    }
  };

  if (pendingItems.length === 0) return null;

  const count = pendingItems.length;
  const firstItem = pendingItems[0];

  return (
    <>
      <div style={{ marginBottom: "20px" }}>
        <div
          onClick={handleOpenModal}
          style={{
            display: isMobile480 ? "block" : "flex",
            alignItems: isMobile480 ? "unset" : "center",
            justifyContent: isMobile480 ? "unset" : "space-between",
            gap: isMobile480 ? "0" : "12px",
            backgroundColor: "#fffbeb",
            borderLeft: "4px solid #f59e0b",
            padding: "12px 16px",
            borderRadius: "8px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            cursor: "pointer",
            transition: "transform 0.1s ease-in-out",

            // RESPONSIVE FOR 480px
            textAlign: isMobile480 ? "center" : "left"
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
        >
          <div style={{ flex: isMobile480 ? "unset" : 1, marginBottom: isMobile480 ? "10px" : "0" }}>
            <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#92400e", fontFamily: "'Poppins', sans-serif" }}>
              {count > 1 ? `Action Required: ${count} Feedback Surveys Pending` : `Action Required: Feedback Needed`}
            </h4>

            <p style={{ margin: 0, fontSize: "0.8rem", color: "#b45309", fontFamily: "'Poppins', sans-serif" }}>
              {count > 1
                ? <>Please review your recently completed <strong>{firstItem.title}</strong> to continue clearing your queue.</>
                : <>Please provide feedback for your recently completed <strong>{firstItem.title}</strong>.</>
              }
            </p>
          </div>

          <button
            style={{
              backgroundColor: "#f59e0b",
              color: "#fff",
              border: "none",
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
              fontFamily: "'Poppins', sans-serif",
              whiteSpace: "nowrap",

              // RESPONSIVE FOR 480px
              display: "block",
              margin: isMobile480 ? "10px auto 0 auto" : "0"
            }}
          >
            Review Now
          </button>
        </div>
      </div>

      <FeedbackModal
        isOpen={isModalOpen}
        feedbackType={selectedItem?._type}
        onAnswer={handleAnswer}
        onLater={() => setIsModalOpen(false)}
      />
    </>
  );
}