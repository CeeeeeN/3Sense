import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, collectionGroup, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import FeedbackModal from "./FeedbackModal";
import { useLanguage } from "../../context/LanguageContext";

export default function FeedbackAlerts({ householdID, residentID, onNavigate }) {
  const { t } = useLanguage();
  const [pendingItems, setPendingItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

    let docsData = [], resData = [], eqData = [], progData = [], genProgData = [], incData = [], bswdData = [];

    const updatePending = () => {
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
      unsubEq();
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

    const safeTitle = selectedItem?.title || "Barangay Service";

    // encodeURIComponent safely handles the slashes in the document path
    const queryParams = `?refId=${encodeURIComponent(selectedItem.id)}&type=${selectedItem._type}&title=${encodeURIComponent(safeTitle)}`;
    window.history.pushState({}, '', queryParams);

    if (typeof onNavigate === "function") {
      onNavigate("feedback");
    }
  };

  if (pendingItems.length === 0) return null;

  const count = pendingItems.length;
  const firstItem = pendingItems[0];

  const formatItemTitle = (item) => {
    if (!item?.title) return "";
    if (item.title === "Document Request") return t("feedback_modal_doc_label", "Document Request");
    if (item.title === "Facility Reservation" || item.title === "Reservation") return t("feedback_modal_facility_label", "Facility Reservation");
    if (item.title === "Equipment Rental") return t("feedback_modal_equip_label", "Equipment Rental");
    if (item.title === "Barangay Program") return t("feedback_modal_prog_label", "Barangay Program");
    return item.title;
  };

  return (
    <>
      {/* Layout and phone styles live in the Dashboard CSS (.db-banner) */}
      <div
        className="db-banner db-banner--amber db-banner--clickable"
        role="button"
        tabIndex={0}
        onClick={handleOpenModal}
        onKeyDown={(e) => e.key === "Enter" && handleOpenModal()}
      >
        <div className="db-banner__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>

        <div className="db-banner__body">
          <h4 className="db-banner__title">
            {count > 1 ? t('feedback_action_pending', count) : t('feedback_action_needed', 'Action Required: Feedback Needed')}
          </h4>

          <p className="db-banner__text">
            {count > 1
              ? <>{t('feedback_review_queue_prefix', 'Please review your recently completed ')}<strong>{formatItemTitle(firstItem)}</strong>{t('feedback_review_queue_suffix', ' to continue clearing your queue.')}</>
              : <>{t('feedback_provide_prefix', 'Please provide feedback for your recently completed ')}<strong>{formatItemTitle(firstItem)}</strong>{t('feedback_provide_suffix', '.')}</>
            }
          </p>
        </div>

        <button
          type="button"
          className="db-banner__btn"
          onClick={(e) => { e.stopPropagation(); handleOpenModal(); }}
        >
          {t('feedback_review_now_btn', 'Review Now')}
        </button>
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