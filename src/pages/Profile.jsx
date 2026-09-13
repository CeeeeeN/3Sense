import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "./Navbar";
import { getMemberProfile, updateMemberProfile } from "../services/profile";
import { fetchUserTransactions } from "../services/services";
import QRCode from "qrcode";

import TransferHouseholdModal from "../components/TransferHouseholdModal";
import TransferHeadModal from "../components/TransferHeadModal";
import TransferBranchHeadModal from "../components/TransferBranchHeadModal";
import RemoveMemberModal from "../components/RemoveMemberModal";

const QR_PAT = [
  true, true, true, false, true,
  true, false, true, true, false,
  true, true, false, true, true,
  false, true, true, false, true,
  true, false, true, true, true,
];

const TABS = ["Personal", "Address", "Category", "Education", "Household"];
const CATS = ["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"];

const BLANK = {
  firstName: "", middleName: "", lastName: "", suffix: "",
  birthDate: "", birthPlace: "", sex: "Male", gender: "", genderOther: "", civilStatus: "",
  citizenship: "", religion: "", contactNumber: "", email: "", residingSinceYear: "",
  houseNumber: "", street: "", region: "NCR", province: "Metro Manila", city: "Valenzuela City", barangay: "Malanday",
  sameAddress: false,
  categories: [],
  pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
  educationAttainment: "", educationStatus: "", occupation: "", employmentStatus: "",
  totalMembers: "", householdClassification: "",
};

const STATUS_MAP = {
  "Clear Case": { label: "Clear Case", cls: "clear", color: "#0d7a55", desc: "This resident has no pending cases or violations on record." },
  "Pending Case": { label: "Pending Case", cls: "pending", color: "#e8a020", desc: "This resident has a case currently under review." },
  "Violation": { label: "Violation", cls: "violation", color: "#e03e3e", desc: "This resident has a recorded violation." },
};

// ── UID GENERATOR FALLBACK ──
const generateResidentUID = () => {
  const year = new Date().getFullYear();
  const timeSlice = Date.now().toString().slice(-4);
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  return `MAL-${year}-${timeSlice}${random4}`;
};

// ── Icons ──
const IconQR = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" /></svg>;
const IconCamera = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>;
const IconUpload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
const IconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const ProfileIconUser = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const ProfileIconPin = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const IconTag = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;
const IconGrad = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>;
const IconHome2 = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const ProfileIconShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IconHistory = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 0 .5-4.08" /><polyline points="3 3 3 9 9 9" /></svg>;
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const IconDl = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
const ProfileIconX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const ProfileIconArrow = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const IconSave = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

// Settings Icons
const IconSettings = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
const IconBell = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
const IconSupport = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="14.83" y1="9.17" x2="18.36" y2="5.64"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>;
const IconHelp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
const IconMessage = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
const IconInfo = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
const IconShield2 = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const IconTransfer = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="14" x2="21" y2="3"></line><polyline points="8 21 3 21 3 16"></polyline><line x1="20" y1="10" x2="3" y2="21"></line></svg>;
const IconChevronRight = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;

// ── Components ──
function InfoItem({ label, value }) {
  return (
    <div className="pf-info-item">
      <div className="pf-info-label">{label}</div>
      <div className={`pf-info-val${!value ? " empty" : ""}`}>{value || "Not provided"}</div>
    </div>
  );
}

function Card({ icon: Icon, title, tag, children }) {
  return (
    <div className="pf-card">
      <div className="pf-card-header">
        <div className="pf-card-icon"><Icon /></div>
        <span className="pf-card-title">{title}</span>
        {tag && <span className="pf-section-tag">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, req, children }) {
  return (
    <div className="pf-field">
      <label className="pf-lbl">{label}{req && <span className="req"> *</span>}</label>
      {children}
    </div>
  );
}

/** Format an ISO date string for display */
function formatHistoryDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch {
    return isoString;
  }
}

// ── Action Modals ──

function HelpFaqModal({ onClose }) {
  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '500px' }}>
        <div className="pf-modal-head">
          <div><h3>Help & FAQ</h3><p>Frequently asked questions</p></div>
          <button className="pf-modal-close" onClick={onClose}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Feature content to be added later.
        </div>
      </div>
    </div>
  );
}

function ContactModal({ onClose }) {
  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '500px' }}>
        <div className="pf-modal-head">
          <div><h3>Contact Barangay</h3><p>Get in touch with the local office</p></div>
          <button className="pf-modal-close" onClick={onClose}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Feature content to be added later.
        </div>
      </div>
    </div>
  );
}

function AboutModal({ onClose }) {
  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '500px' }}>
        <div className="pf-modal-head">
          <div><h3>About 3S+ Malanday</h3><p>System information and version</p></div>
          <button className="pf-modal-close" onClick={onClose}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Feature content to be added later.
        </div>
      </div>
    </div>
  );
}

function PrivacyModal({ onClose }) {
  return (
    <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pf-modal" style={{ maxWidth: '500px' }}>
        <div className="pf-modal-head">
          <div><h3>Privacy Policy</h3><p>How we handle your data</p></div>
          <button className="pf-modal-close" onClick={onClose}><ProfileIconX /></button>
        </div>
        <div className="pf-modal-body" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          Feature content to be added later.
        </div>
      </div>
    </div>
  );
}

export default function Profile({ onBack, onNavigate, householdID, memberID, userRole, userID }) {
  const [data, setData] = useState({ ...BLANK });
  const [draft, setDraft] = useState({ ...BLANK });
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const qrCanvasRef = useRef(null);
  
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txPage, setTxPage] = useState(1);
  const txPerPage = 8;

  // Profile picture state
  const [profilePic, setProfilePic] = useState(null); 
  const [picMenuOpen, setPicMenuOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef(null);

  // Live Camera Modal states
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Settings State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'transfer', 'help', 'contact', 'about', 'privacy'

  const fullName = [data.firstName, data.middleName, data.lastName, data.suffix].filter(Boolean).join(" ");
  const addressFields = ["houseNumber", "street", "barangay", "city", "province", "region"];

  const isHead = userRole === "Household Head" || userRole === "head";
  const isBranchHead = userRole === "Branch Head";

  // Load member profile from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    if (!householdID || !memberID) {
      setLoading(false);
      return;
    }

    getMemberProfile(householdID, memberID)
      .then(async profile => {
        if (!isMounted) return;
        
        let loadedProfile = profile || { ...BLANK };
        
        // ── LAZY PATCH: Generate and save UID if the resident doesn't have one yet ──
        if (!loadedProfile.UID) {
          const newUID = generateResidentUID();
          loadedProfile.UID = newUID;
          try {
            await updateMemberProfile(householdID, memberID, { ...loadedProfile, UID: newUID });
            
            // Sync with local storage
            const session = JSON.parse(localStorage.getItem("brgy_session") || "{}");
            session.UID = newUID;
            localStorage.setItem("brgy_session", JSON.stringify(session));
          } catch (e) {
            console.error("Failed to apply Lazy Patch UID:", e);
          }
        }

        setData(loadedProfile);
        if (loadedProfile?.profilePhoto) {
          setProfilePic(loadedProfile.profilePhoto);
        }
      })
      .catch(err => {
        console.error("[Profile] Error:", err);

        // Auto-logout if profile was transferred to a new household
        if (err.message.includes("not found")) {
          alert("Your profile has been transferred. Please log in again using your new Household ID.");
          localStorage.removeItem("brgy_session"); // Wipe the dead session
          if (onNavigate) onNavigate("logout");    // Kick back to login screen
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [householdID, memberID]);

  // Fetch transaction history
  useEffect(() => {
    let isMounted = true;
    if (!householdID) {
      setTxLoading(false);
      return;
    }

    // Include data.UID to securely fetch their individual history
    fetchUserTransactions(householdID, memberID, userID, userRole, data.UID)
      .then(txData => {
        if (!isMounted) return;
        setTransactions(txData || []);
      })
      .catch(err => {
        console.error("[Profile] Transaction fetch error:", err);
      })
      .finally(() => {
        if (isMounted) setTxLoading(false);
      });

    return () => { isMounted = false; };
  }, [householdID, memberID, userID, userRole, data.UID]);

  useEffect(() => {
    if (!memberID) return;

    QRCode.toDataURL(memberID, { width: 180, margin: 1, color: { dark: "#0d7a55", light: "#ffffff" } })
      .then(url => setQrUrl(url))
      .catch(console.error);
  }, [memberID]);

  // Camera cleanup & control
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const openCamera = async () => {
    setPicMenuOpen(false);
    setCameraError(null);
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setCameraError("Camera access denied or unavailable. Please check your browser permissions.");
    }
  };

  const closeCamera = () => {
    stopCamera();
    setCameraModalOpen(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const uploadBase64ToCloudinary = async (base64Image) => {
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("file", base64Image);
      formData.append("upload_preset", "3Sense+_ProfilePic");
      const cloudName = "dfnqeiksu";

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload to Cloudinary");
      const cloudinaryData = await res.json();
      const secureUrl = cloudinaryData.secure_url;

      await updateMemberProfile(householdID, memberID, {
        ...data,
        profilePhoto: secureUrl,
      });

      setData(prev => ({ ...prev, profilePhoto: secureUrl }));
      setProfilePic(secureUrl);
    } catch (err) {
      console.error("Error saving profile pic:", err);
      alert("Failed to save profile picture permanently. Please try again.");
    } finally {
      setUploadingPic(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL("image/jpeg", 0.9);

    closeCamera();
    setProfilePic(base64Image);
    await uploadBase64ToCloudinary(base64Image);
  };

  const openModal = () => {
    setDraft({ ...data });
    setTab(0);
    setOpen(true);
  };

  const closeModal = () => setOpen(false);

  const computeSameAddress = () => {
    if (userRole !== "Household Head" && data.sameAddress) {
      return addressFields.every(field => draft[field] === data[field]);
    }
    return false;
  };

  const save = async () => {
    if (!householdID || !memberID) {
      alert("Missing household or member info.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...draft, sameAddress: computeSameAddress() };
      // ensure we don't accidentally overwrite the UID with empty if draft missed it
      payload.UID = data.UID; 
      await updateMemberProfile(householdID, memberID, payload);
      setData(payload);
      setOpen(false);
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const downloadQR = () => {
    if (!qrUrl) return;
    const link = document.createElement("a");
    link.download = `${householdID}-${fullName || "member"}-QR.png`;
    link.href = qrUrl;
    link.click();
  };

  const normalizeCategories = (cats) => {
    let list = [];
    if (Array.isArray(cats)) list = cats;
    else if (typeof cats === "string") list = cats.split(",").map(s => s.trim()).filter(Boolean);

    return list.map(c => {
      let cln = c.replace(/[^\w\s-]/gi, '').trim();
      if (cln === "Indigenous") cln = "Indigenous People";
      return cln;
    });
  };

  const set = f => e => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setDraft(d => ({
      ...d,
      [f]: value,
      sameAddress: addressFields.includes(f) ? false : d.sameAddress,
    }));
  };

  const toggleCat = cat => setDraft(d => {
    const current = normalizeCategories(d.categories);
    return {
      ...d,
      categories: current.includes(cat)
        ? current.filter(c => c !== cat)
        : [...current, cat],
    };
  });

  const normalizedDataCategories = normalizeCategories(data.categories);
  const normalizedDraftCategories = normalizeCategories(draft.categories);
  const isPwd = normalizedDataCategories.includes("PWD");
  const draftPwd = normalizedDraftCategories.includes("PWD");

  const currentStatus = data.adminStatus || "Clear Case";
  const sInfo = STATUS_MAP[currentStatus] || STATUS_MAP["Clear Case"];
  const statusHistory = Array.isArray(data.statusHistory) ? data.statusHistory : [];

  const handlePicFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image locally immediately
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setProfilePic(base64);
      setPicMenuOpen(false);
      await uploadBase64ToCloudinary(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePic = async () => {
    if (!window.confirm("Are you sure you want to remove your profile picture?")) return;

    setPicMenuOpen(false);
    setUploadingPic(true);

    try {
      await updateMemberProfile(householdID, memberID, {
        ...data,
        profilePhoto: null,
      });

      setProfilePic(null);
      setData(prev => ({ ...prev, profilePhoto: null }));
    } catch (err) {
      console.error("Error removing profile pic:", err);
      alert("Failed to remove profile picture.");
    } finally {
      setUploadingPic(false);
    }
  };

  const totalPages = Math.ceil(transactions.length / txPerPage) || 1;

  // ── Settings Row Component ──
  const SettingRow = ({ icon: Icon, title, description, action, onClick }) => (
    <div 
      className="pf-setting-row" 
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", padding: "16px", cursor: onClick ? "pointer" : "default",
        borderBottom: "1px solid #e5e7eb", transition: "background 0.2s"
      }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "8px", background: "rgba(49,125,137,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)", marginRight: "14px"
      }}>
        <Icon />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--text)" }}>{title}</div>
        {description && <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "2px" }}>{description}</div>}
      </div>
      <div style={{ color: "var(--muted)", display: "flex", alignItems: "center" }}>
        {action || (onClick && <IconChevronRight />)}
      </div>
    </div>
  );

  return (
    <div className="pf-root" onClick={(e) => { if (picMenuOpen && !e.target.closest('.pf-avatar-wrap')) setPicMenuOpen(false); }}>
      <Navbar
        activePage="profile"
        householdID={householdID}
        onNavigate={onNavigate}
        userName={[data.firstName, data.lastName].filter(Boolean).join(" ") || ""}
        userRole={userRole}
        memberID={memberID}
        userID={userID}
      />

      {loading && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--muted)", fontSize: "0.9rem" }}>
          Loading profile...
        </div>
      )}

      {!loading && (
        <div className="pf-page">
          <div className="pf-page-header">
            <div>
              <h1>My Profile</h1>
              <p>Manage your personal information and barangay records.</p>
            </div>
            <button className="pf-btn-primary" onClick={openModal}>
              <IconEdit /> Edit Profile
            </button>
          </div>

          <div className="pf-hero-card">
            <div className="pf-hero-avatar-col">
              <div className="pf-avatar-wrap">
                <div className="pf-avatar-ring">
                  {uploadingPic ? (
                    <div className="pf-avatar-placeholder" style={{ fontSize: "0.85rem", color: "var(--teal)", fontWeight: "600" }}>Saving...</div>
                  ) : profilePic ? (
                    <img src={profilePic} alt="Profile" className="pf-avatar-img" />
                  ) : (
                    <div className="pf-avatar-placeholder"><IconUser /></div>
                  )}
                </div>
                <button
                  className="pf-avatar-cam-btn"
                  onClick={() => setPicMenuOpen(v => !v)}
                  aria-label="Change profile picture"
                >
                  <IconCamera />
                </button>

                {picMenuOpen && (
                  <div className="pf-pic-menu">
                    <input
                      ref={picInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handlePicFile}
                    />
                    <button className="pf-pic-menu-item" onClick={() => picInputRef.current?.click()}>
                      <IconUpload /> Upload Photo
                    </button>
                    <button className="pf-pic-menu-item" onClick={openCamera}>
                      <IconCamera /> Take Picture
                    </button>
                    {profilePic && (
                      <button className="pf-pic-menu-item danger" onClick={handleRemovePic}>
                        <IconTrash /> Remove Photo
                      </button>
                    )}
                    <div className="pf-pic-menu-divider" />
                    <button className="pf-pic-menu-item muted" onClick={() => setPicMenuOpen(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="pf-avatar-hint">Tap camera to change photo</div>
            </div>

            <div className="pf-hero-identity">
              <div className="pf-hero-name">{fullName || "Your Full Name"}</div>
              <div className="pf-hero-id">{householdID || "MAL-XXXX-XXXXX"} &bull; {userRole || "Member"}</div>
              
              {/* DISPLAY PERMANENT UID HERE */}
              {data.UID && (
                <div className="pf-hero-family-number" style={{ color: "#0d7a55", fontWeight: "600", marginTop: "4px", fontSize: "0.95rem" }}>
                  Barangay UID: {data.UID}
                </div>
              )}

              {data.familyNumber && (
                <div className="pf-hero-family-number">
                  Family Number: {data.familyNumber}
                </div>
              )}
              
              <div className="pf-hero-verified"><span className="pf-hero-dot" /> Verified Resident</div>
              <div className="pf-hero-divider" />
              <div className="pf-hero-meta">
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">Barangay</div>
                  <div className="pf-hero-mv">{data.barangay || "—"}</div>
                </div>
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">City</div>
                  <div className="pf-hero-mv">{data.city || "—"}</div>
                </div>
                <div className="pf-hero-meta-item">
                  <div className="pf-hero-ml">Record</div>
                  <div className="pf-hero-mv" style={{ color: sInfo.color }}>{sInfo.label}</div>
                </div>
              </div>
            </div>

            <div className="pf-hero-qr-col">
              <div className="pf-hero-qr-panel">
                <div className="pf-hero-qr-img-wrap">
                  {qrUrl
                    ? <img src={qrUrl} alt="Personal QR Code" className="pf-hero-qr-img" />
                    : <div className="pf-hero-qr-generating">Generating...</div>
                  }
                </div>
                <div className="pf-hero-qr-label">Scan to Verify</div>
                <button className="pf-btn-dl" onClick={downloadQR} disabled={!qrUrl}>
                  <IconDl /> Download QR
                </button>
              </div>
            </div>
          </div>

          <Card icon={ProfileIconUser} title="Personal Information">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="pf-info-grid c3">
                <InfoItem label="First Name" value={data.firstName} />
                <InfoItem label="Middle Name" value={data.middleName} />
                <InfoItem label="Last Name" value={data.lastName} />
              </div>
              <div className="pf-info-grid">
                <InfoItem label="Date of Birth" value={data.birthDate} />
                <InfoItem label="Birth Place" value={data.birthPlace} />
                <InfoItem label="Sex" value={data.sex} />
                <InfoItem label="Gender" value={data.gender === "Others" ? (data.genderOther || "Others") : data.gender} />
                <InfoItem label="Civil Status" value={data.civilStatus} />
                <InfoItem label="Citizenship" value={data.citizenship} />
                <InfoItem label="Religion" value={data.religion} />
                <InfoItem label="Residing Since" value={data.residingSinceYear} />
                <InfoItem label="Contact Number" value={data.contactNumber} />
                <InfoItem label="Email Address" value={data.email} />
              </div>
            </div>
          </Card>

          <Card icon={ProfileIconPin} title="Address Information">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="pf-info-grid">
                <InfoItem label="House / Unit Number" value={data.houseNumber} />
                <InfoItem label="Street" value={data.street} />
                <InfoItem label="Barangay" value={data.barangay} />
                <InfoItem label="City / Municipality" value={data.city} />
                <InfoItem label="Province" value={data.province} />
                <InfoItem label="Region" value={data.region} />
              </div>
            </div>
          </Card>

          <Card icon={IconTag} title="Category">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="pf-cat-grid">
                {data.categories && data.categories.length > 0
                  ? data.categories.map(cat => (
                    <div key={cat} className="pf-chip on">
                      {cat}
                    </div>
                  ))
                  : <div className="pf-chip off">No categories assigned</div>
                }
              </div>
              {isPwd && (
                <div className="pf-subfields">
                  <div className="pf-subtitle">♿ PWD Details</div>
                  <div className="pf-info-grid">
                    <InfoItem label="PWD Status" value={data.pwdStatus} />
                    <InfoItem label="Disability Type" value={data.disabilityType === "Others" ? (data.disabilityTypeOther || "Others") : data.disabilityType} />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card icon={IconGrad} title="Education & Employment">
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="pf-info-grid">
                <InfoItem label="Highest Educational Attainment" value={data.educationAttainment} />
                <InfoItem label="Education Status" value={data.educationStatus} />
                <InfoItem label="Occupation" value={data.occupation} />
                <InfoItem label="Employment Status" value={data.employmentStatus} />
              </div>
            </div>
          </Card>

          <Card icon={IconHome2} title="Household Information">
            <div className="pf-info-grid c3">
              <InfoItem label="Household Number" value={householdID} />
              {data.familyNumber && <InfoItem label="Family Number" value={data.familyNumber} />}
              <InfoItem label="Total Members" value={data.totalMembers} />
              <InfoItem label="Classification" value={data.householdClassification} />
            </div>
          </Card>

          <Card icon={ProfileIconShield} title="Barangay Record Status" tag="Circumstances">
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
              <div className={`pf-status-badge ${sInfo.cls}`}>
                <span className="pf-sdot" />{sInfo.label}
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text)", fontFamily: "'Poppins',sans-serif", fontSize: "0.82rem" }}>Current Standing: </strong>
                {sInfo.desc}
              </div>
            </div>

            {(data.adminRemarks || data.adminIncident) && (
              <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "0.9rem 1rem", marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {data.adminRemarks && (
                  <div style={{ fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.55 }}>
                    <strong style={{ fontFamily: "'Poppins',sans-serif" }}>Remarks: </strong>{data.adminRemarks}
                  </div>
                )}
                {data.adminIncident && (
                  <div style={{ fontSize: "0.82rem", color: "var(--muted)", lineHeight: 1.55 }}>
                    <strong style={{ fontFamily: "'Poppins',sans-serif", color: "var(--text)" }}>Incident: </strong>{data.adminIncident}
                  </div>
                )}
              </div>
            )}

            {data.adminLastUpdatedBy && (
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "1rem", fontStyle: "italic" }}>
                Last updated by <strong style={{ fontStyle: "normal" }}>{data.adminLastUpdatedBy}</strong>
                {data.adminLastUpdatedByPosition ? ` (${data.adminLastUpdatedByPosition})` : ""}
                {data.adminLastUpdatedAt ? ` · ${data.adminLastUpdatedAt}` : ""}
              </div>
            )}

            <div style={{ background: "var(--bg)", borderRadius: "10px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                Case History
              </div>

              {statusHistory.length > 0 ? (
                statusHistory.map((entry, i) => {
                  const dotColor = entry.status === "Clear Case"
                    ? "#0d7a55"
                    : entry.status === "Pending Case"
                      ? "#e8a020"
                      : "#e03e3e";
                  const byLine = [
                    entry.setBy,
                    entry.setByPosition ? `(${entry.setByPosition})` : null,
                  ].filter(Boolean).join(" ");

                  return (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, marginTop: 5 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text)", fontFamily: "'Poppins',sans-serif" }}>
                          Status set to "{entry.status}"
                          {entry.remarks ? ` — ${entry.remarks}` : ""}
                        </div>
                        {entry.incident && (
                          <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: 1 }}>
                            {entry.incident}
                          </div>
                        )}
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                          {formatHistoryDate(entry.setAt)} · by {byLine}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                  No status changes recorded yet.
                </div>
              )}
            </div>
          </Card>

          {/* ADVANCED TRANSACTION HISTORY (From Incoming Branch) */}
          <Card icon={IconHistory} title="Service & Transaction History">
            <div className="pf-table-wrap">
              <table className="pf-table">
                <thead>
                  <tr>
                    <th>Service Name</th>
                    <th>Ref #</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {txLoading ? (
                    <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--muted)", padding: "1.5rem" }}>Loading transactions...</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: "center", color: "var(--muted)", padding: "1.5rem" }}>No transactions found.</td></tr>
                  ) : (
                    transactions.slice((txPage - 1) * txPerPage, txPage * txPerPage).map((tx, i) => {
                      const dateStr = tx.date?.toDate
                        ? tx.date.toDate().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : tx.date ? new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                      
                      const statusLower = (tx.status || "pending").toLowerCase().replace(/\s+/g, "-");
                      const isOverdue = tx.status === "Overdue";
                      const isUnreturned = tx.status === "Unreturned";
                      const isAlerted = isOverdue || isUnreturned;

                      const returnDateStr = tx.category === "Equipment" && tx.returnDate
                        ? new Date(tx.returnDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : null;

                      const returnDateColor = isUnreturned ? "#c2410c" : isOverdue ? "#dc2626" : "var(--muted)";
                      const rowBg = isUnreturned
                        ? "rgba(249,115,22,0.05)"
                        : isOverdue
                          ? "rgba(239,68,68,0.04)"
                          : {};

                      return (
                        <tr key={tx.id || i} style={isAlerted ? { background: rowBg } : {}}>
                          <td>
                            <div className="pf-tx-name">{tx.serviceName}</div>
                            {returnDateStr && (
                              <div style={{ fontSize: "0.72rem", color: returnDateColor, marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                                {isAlerted ? (
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={returnDateColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                  </svg>
                                ) : (
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                  </svg>
                                )}
                                Return: {returnDateStr}
                              </div>
                            )}
                          </td>
                          <td><div className="pf-tx-date" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>{tx.refNum || "—"}</div></td>
                          <td><div className="pf-tx-date">{dateStr}</div></td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span className={`pf-tx-badge ${statusLower}`}>
                                <span className="pf-tx-bdot" />
                                {tx.status}
                              </span>
                              {isUnreturned && (
                                <div style={{ fontSize: "0.65rem", color: "#c2410c", fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                                  Contact barangay!
                                </div>
                              )}
                              {isOverdue && (
                                <div style={{ fontSize: "0.65rem", color: "#dc2626", fontWeight: 600, fontFamily: "'Poppins', sans-serif" }}>
                                  Past due date!
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{tx.category}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Advanced Alert Banners */}
              {!txLoading && transactions.some(tx => tx.status === "Unreturned") && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  background: "rgba(249,115,22,0.08)", border: "1.5px solid rgba(249,115,22,0.35)",
                  borderRadius: "10px", padding: "14px 16px", margin: "12px 0 0 0", fontSize: "13px", color: "#7c2d12",
                }}>
                  <svg style={{ flexShrink: 0, marginTop: "1px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div style={{ flex: 1, lineHeight: "1.6" }}>
                    <strong style={{ display: "block", color: "#9a3412", marginBottom: "2px" }}>⚠ Unreturned Equipment — Immediate Action Required</strong>
                    The Barangay has formally reported that equipment you rented has not been returned. Please visit the <strong>Barangay Hall</strong> immediately to return the equipment or clarify the situation. Continued non-return may result in further action.
                  </div>
                </div>
              )}

              {!txLoading && transactions.some(tx => tx.status === "Overdue") && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "10px", padding: "14px 16px", margin: "12px 0 0 0", fontSize: "13px", color: "#b91c1c",
                }}>
                  <svg style={{ flexShrink: 0, marginTop: "1px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <div style={{ flex: 1, lineHeight: "1.6" }}>
                    <strong style={{ display: "block", color: "#991b1b", marginBottom: "2px" }}>Overdue Equipment Return</strong>
                    You have equipment that has not been returned by its scheduled return date. Please return the equipment to the Barangay Hall as soon as possible to avoid further penalties. The status will update to <strong>Returned</strong> once the admin records the return.
                  </div>
                </div>
              )}

              {transactions.length > txPerPage && (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem", gap: "0.5rem" }}>
                  <button
                    onClick={() => setTxPage(p => Math.max(1, p - 1))}
                    disabled={txPage === 1}
                    style={{
                      padding: "0.4rem 0.8rem", borderRadius: "6px", fontFamily: "'Poppins', sans-serif", fontSize: "0.75rem",
                      background: txPage === 1 ? "#f1f5f9" : "var(--primary)", color: txPage === 1 ? "#94a3b8" : "#fff",
                      border: "none", cursor: txPage === 1 ? "not-allowed" : "pointer"
                    }}
                  >
                    Prev
                  </button>
                  <div style={{ fontSize: "0.8rem", fontFamily: "'Poppins', sans-serif", color: "var(--text)", margin: "0 0.5rem" }}>
                    Page {txPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setTxPage(p => Math.min(totalPages, p + 1))}
                    disabled={txPage === totalPages}
                    style={{
                      padding: "0.4rem 0.8rem", borderRadius: "6px", fontFamily: "'Poppins', sans-serif", fontSize: "0.75rem",
                      background: txPage === totalPages ? "#f1f5f9" : "var(--primary)",
                      color: txPage === totalPages ? "#94a3b8" : "#fff",
                      border: "none", cursor: txPage === totalPages ? "not-allowed" : "pointer"
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* ── SETTINGS AND PREFERENCES MENU (MOBILE APP MATCH) ── */}
          <div style={{ marginBottom: "2rem" }}>
            <Card icon={IconSettings} title="Preferences">
              {isHead && (
                <SettingRow 
                  icon={ProfileIconUser} 
                  title="Transfer Head Role" 
                  description="Assign the Household Head role to another member" 
                  onClick={() => setActiveModal('transferHead')} 
                />
              )}
              {/* Remove Member Button */}
              {isHead && (
                <SettingRow 
                  icon={IconTrash} 
                  title="Remove Member" 
                  description="Permanently delete a member from this household" 
                  onClick={() => setActiveModal('removeMember')} 
                />
              )}
              {isBranchHead && (
                <SettingRow 
                  icon={ProfileIconUser} 
                  title="Transfer Branch Head Role" 
                  description="Assign the Branch Head role to another member" 
                  onClick={() => setActiveModal('transferBranchHead')} 
                />
              )}
              <SettingRow 
                icon={IconBell} 
                title="Push Notifications" 
                description="Receive important updates & notifications" 
                action={
                  <label className="pf-toggle-switch" style={{ position: "relative", display: "inline-block", width: "40px", height: "24px" }}>
                    <input 
                      type="checkbox" 
                      style={{ opacity: 0, width: 0, height: 0 }} 
                      checked={pushEnabled} 
                      onChange={e => setPushEnabled(e.target.checked)} 
                    />
                    <span style={{
                      position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: pushEnabled ? "#317D89" : "#cbd5e1", transition: "0.4s", borderRadius: "24px"
                    }}>
                      <span style={{
                        position: "absolute", content: '""', height: "18px", width: "18px", left: "3px", bottom: "3px",
                        backgroundColor: "white", transition: "0.4s", borderRadius: "50%",
                        transform: pushEnabled ? "translateX(16px)" : "translateX(0)"
                      }} />
                    </span>
                  </label>
                }
              />
              <SettingRow 
                icon={IconTransfer} 
                title="Transfer Household" 
                description="Move your profile to a different household" 
                onClick={() => setActiveModal('transfer')} 
              />
            </Card>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <Card icon={IconSupport} title="Support">
              <SettingRow 
                icon={IconHelp} 
                title="Help & FAQ" 
                onClick={() => setActiveModal('help')} 
              />
              <SettingRow 
                icon={IconMessage} 
                title="Contact Barangay" 
                onClick={() => setActiveModal('contact')} 
              />
              <SettingRow 
                icon={IconInfo} 
                title="About" 
                onClick={() => setActiveModal('about')} 
              />
              <SettingRow 
                icon={IconShield2} 
                title="Privacy Policy" 
                onClick={() => setActiveModal('privacy')} 
              />
            </Card>
          </div>

          <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      )}

      {/* ── SETTINGS ACTION MODALS ── */}
      {activeModal === 'transfer' && (
        <TransferHouseholdModal 
          onClose={() => setActiveModal(null)} 
          currentHouseholdID={householdID} 
          userData={data}
          memberID={memberID} 
        />
      )}

      {/* Remove Member Modal */}
      {activeModal === 'removeMember' && (
        <RemoveMemberModal 
          householdID={householdID}
          currentHeadID={memberID}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'transferHead' && (
        <TransferHeadModal 
          onClose={() => setActiveModal(null)} 
          householdID={householdID} 
          currentHeadID={memberID} 
          onLogout={() => {
            localStorage.removeItem("brgy_session");
            if (onNavigate) onNavigate("logout");
          }}
        />
      )}

      {activeModal === 'transferBranchHead' && (
        <TransferBranchHeadModal 
          onClose={() => setActiveModal(null)} 
          householdID={householdID}
          currentBranchID={data.branchID} // Pass their current branch so it filters correctly
          currentHeadID={memberID} 
          onLogout={() => {
            localStorage.removeItem("brgy_session");
            if (onNavigate) onNavigate("logout");
          }}
        />
      )}

      {activeModal === 'help' && <HelpFaqModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'contact' && <ContactModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'about' && <AboutModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'privacy' && <PrivacyModal onClose={() => setActiveModal(null)} />}


      {/* ── LIVE CAMERA MODAL (From Current Branch) ── */}
      {cameraModalOpen && (
        <div className="pf-overlay" style={{ zIndex: 1050 }} onClick={(e) => { if (e.target === e.currentTarget) closeCamera(); }}>
          <div className="pf-modal" style={{ maxWidth: "460px" }}>
            <div className="pf-modal-head">
              <div>
                <h3>Take Profile Picture</h3>
                <p>Align your face inside the frame and capture</p>
              </div>
              <button className="pf-modal-close" onClick={closeCamera}><ProfileIconX /></button>
            </div>
            <div className="pf-modal-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem" }}>
              {cameraError ? (
                <div style={{ textAlign: "center", color: "#e03e3e", padding: "1.5rem", fontSize: "0.9rem" }}>
                  {cameraError}
                </div>
              ) : (
                <div style={{ position: "relative", width: "100%", maxWidth: "340px", aspectRatio: "1/1", borderRadius: "50%", overflow: "hidden", border: "4px solid var(--teal)", background: "#000" }}>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                  />
                </div>
              )}
            </div>
            <div className="pf-modal-foot" style={{ justifyContent: "flex-end" }}>
              <button className="pf-btn-ghost" onClick={closeCamera}>Cancel</button>
              {!cameraError && (
                <button className="pf-btn-primary" onClick={capturePhoto}>
                  <IconCamera /> Capture & Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {open && (
        <div className="pf-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="pf-modal">
            <div className="pf-modal-head">
              <div>
                <h3>Edit Profile</h3>
                <p>Fill in your personal information</p>
              </div>
              <button className="pf-modal-close" onClick={closeModal}><ProfileIconX /></button>
            </div>

            <div className="pf-modal-tabs">
              {TABS.map((t, i) => (
                <div key={i} className={`pf-modal-tab${i === tab ? " active" : i < tab ? " done" : ""}`} onClick={() => setTab(i)}>
                  <div className="pf-tab-num">{i < tab ? "✓" : i + 1}</div>{t}
                </div>
              ))}
            </div>

            <div className="pf-modal-body">
              {tab === 0 && <>
                <div className="fg c3">
                  <Field label="First Name" req><input className="pf-inp" placeholder="Maria" value={draft.firstName} onChange={set("firstName")} /></Field>
                  <Field label="Middle Name"><input className="pf-inp" placeholder="Santos" value={draft.middleName} onChange={set("middleName")} /></Field>
                  <Field label="Last Name" req><input className="pf-inp" placeholder="Dela Cruz" value={draft.lastName} onChange={set("lastName")} /></Field>
                </div>
                <div className="fg c3">
                  <Field label="Suffix">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.suffix} onChange={set("suffix")}><option value="">None</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option></select></div>
                  </Field>
                  <Field label="Religion"><input className="pf-inp" placeholder="Roman Catholic" value={draft.religion} onChange={set("religion")} /></Field>
                  <Field label="Civil Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.civilStatus} onChange={set("civilStatus")}><option value="">Select</option><option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option></select></div>
                  </Field>
                </div>
                <div className="fg c3">
                  <Field label="Date of Birth" req><input className="pf-inp" type="date" value={draft.birthDate} onChange={set("birthDate")} /></Field>
                  <Field label="Birth Place"><input className="pf-inp" placeholder="Valenzuela City" value={draft.birthPlace} onChange={set("birthPlace")} /></Field>
                  <Field label="Citizenship"><input className="pf-inp" placeholder="Filipino" value={draft.citizenship} onChange={set("citizenship")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Sex" req>
                    <div className="pf-radio-row">
                      {["Male", "Female"].map(v => (
                        <label key={v} className="pf-radio-opt">
                          <input type="radio" name="sex" value={v} checked={draft.sex === v} onChange={set("sex")} />
                          <span className="pf-radio-lbl">{v}</span>
                        </label>
                      ))}
                    </div>
                  </Field>
                  <Field label="Gender">
                    <div className="pf-sel-wrap">
                      <select className="pf-sel" value={draft.gender} onChange={set("gender")}>
                        <option value="">Select gender</option>
                        <option>Cisgender</option>
                        <option>Non-binary</option>
                        <option>Transgender Man</option>
                        <option>Transgender Woman</option>
                        <option>Genderqueer</option>
                        <option>Others</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                  </Field>
                </div>
                {draft.gender === "Others" && (
                  <div className="fg c1">
                    <Field label="Please specify gender">
                      <input className="pf-inp" placeholder="Please specify" value={draft.genderOther || ""} onChange={set("genderOther")} />
                    </Field>
                  </div>
                )}
                <div className="fg">
                  <Field label="Contact Number"><input className="pf-inp" type="tel" placeholder="09XX XXX XXXX" value={draft.contactNumber} onChange={set("contactNumber")} /></Field>
                  <Field label="Email Address"><input className="pf-inp" type="email" placeholder="email@example.com" value={draft.email} onChange={set("email")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Residing Since (Year)" req><input className="pf-inp" type="number" min="1900" max={new Date().getFullYear()} placeholder="e.g. 2010" value={draft.residingSinceYear} onChange={set("residingSinceYear")} /></Field>
                </div>
              </>}

              {tab === 1 && <>
                <div className="fg">
                  <Field label="House / Unit Number" req><input className="pf-inp" placeholder="123" value={draft.houseNumber} onChange={set("houseNumber")} /></Field>
                  <Field label="Street" req><input className="pf-inp" placeholder="Malanday Street" value={draft.street} onChange={set("street")} /></Field>
                </div>
                <div className="fg">
                  <Field label="Region">
                    <input className="pf-inp" value="NCR" readOnly />
                  </Field>
                  <Field label="Province"><input className="pf-inp" placeholder="Metro Manila" value={draft.province} onChange={set("province")} readOnly={draft.sameAddress} /></Field>
                </div>
                <div className="fg">
                  <Field label="City / Municipality"><input className="pf-inp" value="Valenzuela City" readOnly /></Field>
                  <Field label="Barangay"><input className="pf-inp" value="Malanday" readOnly /></Field>
                </div>
              </>}

              {tab === 2 && <>
                {(() => {
                  const draftCategories = Array.isArray(draft.categories) ? draft.categories : [];
                  return (
                    <div className="pf-chk-grid">
                      {CATS.map(cat => (
                        <label key={cat} className="pf-chk-opt">
                          <input type="checkbox" checked={draftCategories.includes(cat)} onChange={() => toggleCat(cat)} />
                          <span className="pf-chk-lbl">
                            <span className="pf-chk-box">{draftCategories.includes(cat) ? "✓" : ""}</span>
                            {cat}
                          </span>
                        </label>
                      ))}
                    </div>
                  );
                })()}
                {draftPwd && (
                  <div className="pf-subfields">
                    <div className="pf-subtitle">♿ PWD Details</div>
                    <div className="fg">
                      <Field label="PWD Status">
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.pwdStatus} onChange={set("pwdStatus")}><option value="">Select</option><option>Children with Disabilities</option><option>Person with Disabilities</option></select></div>
                      </Field>
                      <Field label="Disability Type">
                        <div className="pf-sel-wrap"><select className="pf-sel" value={draft.disabilityType} onChange={set("disabilityType")}>
                          <option value="">Select</option>
                          <option>Physical Disability</option>
                          <option>Visual Disability</option>
                          <option>Hearing Disability</option>
                          <option>Speech Impairment</option>
                          <option>Intellectual Disability</option>
                          <option>Learning Disability</option>
                          <option>Psychosocial Disability</option>
                          <option>Multiple Disabilities</option>
                          <option>Chronic Illness</option>
                          <option>Rare Disease</option>
                          <option>Others</option>
                        </select></div>
                      </Field>
                    </div>
                    {draft.disabilityType === "Others" && (
                      <div className="fg c1">
                        <Field label="Please specify disability type">
                          <input className="pf-inp" placeholder="Please specify" value={draft.disabilityTypeOther || ""} onChange={set("disabilityTypeOther")} />
                        </Field>
                      </div>
                    )}
                  </div>
                )}
              </>}

              {tab === 3 && <>
                <div className="fg">
                  <Field label="Highest Educational Attainment">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationAttainment} onChange={set("educationAttainment")}><option value="">Select</option><option>Elementary</option><option>High School</option><option>College</option><option>Post Graduate</option><option>Vocational</option></select></div>
                  </Field>
                  <Field label="Education Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.educationStatus} onChange={set("educationStatus")}><option value="">Select</option><option>In School</option><option>Out of School Youth (OSY)</option><option>Graduate</option></select></div>
                  </Field>
                </div>
                <div className="fg">
                  <Field label="Occupation"><input className="pf-inp" placeholder="e.g. Teacher, Student" value={draft.occupation} onChange={set("occupation")} /></Field>
                  <Field label="Employment Status">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.employmentStatus} onChange={set("employmentStatus")}><option value="">Select</option><option>Employed</option><option>Unemployed</option><option>Self-employed</option><option>Student</option></select></div>
                  </Field>
                </div>
              </>}

              {tab === 4 && <>
                <div className="fg">
                  <Field label="Total Members"><input className="pf-inp" type="number" min="1" placeholder="e.g. 4" value={draft.totalMembers} onChange={set("totalMembers")} /></Field>
                  <Field label="Household Classification">
                    <div className="pf-sel-wrap"><select className="pf-sel" value={draft.householdClassification} onChange={set("householdClassification")}><option value="">Select</option><option>Owner</option><option>Rental</option><option>Co-habit / Shared</option><option>Informal Settler</option></select></div>
                  </Field>
                </div>
              </>}
            </div>

            <div className="pf-modal-foot">
              <button className="pf-btn-ghost" onClick={tab === 0 ? closeModal : () => setTab(t => t - 1)}>
                {tab === 0 ? "Cancel" : "← Back"}
              </button>
              <div style={{ display: "flex", gap: "0.65rem" }}>
                {tab < TABS.length - 1
                  ? <button className="pf-btn-primary" onClick={() => setTab(t => t + 1)}>Next <ProfileIconArrow /></button>
                  : <button className="pf-btn-primary" onClick={save} disabled={saving}><IconSave /> {saving ? "Saving..." : "Save Changes"}</button>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}