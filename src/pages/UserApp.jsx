import { useState, useEffect } from "react";
import LandingPage from "./LandingPage";
import Login from "./Login";
import ForgotPassword from "./ForgotPassword";
import Registration from "./Registration";
import Activation from "./Activation";
import AddMembers from "./AddMembers";
import Profile from "./Profile";
import Dashboard from "./Dashboard";
import Navbar from "./Navbar";
import ServicesPage from "./ServicesPage";
import ScanPage from "./ScanPage";
import FeedbackForm from "./FeedbackForm";
import ActivityPage from "./ActivityPage";
import EmergencyPage from "./EmergencyPage";
import { requestPushPermission, listenForForegroundMessages } from "../services/fcm";

// Routing maps
const PAGE_TO_PATH = {
  home: "/home",
  dashboard: "/home",
  services: "/services",
  scan: "/scan",
  feedback: "/feedback",
  activity: "/activity",
  emergency: "/emergency",
  profile: "/profile",
};

const PATH_TO_PAGE = {
  "/home": "home",
  "/services": "services",
  "/scan": "scan",
  "/feedback": "feedback",
  "/activity": "activity",
  "/emergency": "emergency",
  "/profile": "profile",
};

const LOGGED_IN_PAGES = [
  "home",
  "dashboard",
  "services",
  "scan",
  "feedback",
  "activity",
  "emergency",
  "profile",
];

const getSaved = (key, fallback) => {
  try {
    return (
      JSON.parse(localStorage.getItem("brgy_session") || "{}")[key] || fallback
    );
  } catch {
    return fallback;
  }
};

export default function UserApp() {
  const urlParams = new URLSearchParams(window.location.search);
  const scannedServiceId = urlParams.get("serviceId");
  const scannedServiceName = urlParams.get('serviceName');

  // State
  const [page, setPage] = useState(() => {
    const hasSession = localStorage.getItem("brgy_session");
    if (scannedServiceId) {
      return hasSession ? "feedback" : "login";
    }
    const fromPath = PATH_TO_PAGE[window.location.pathname];
    if (fromPath && hasSession) return fromPath;
    return "landing";
  });

  const [householdID, setHouseholdID] = useState(() => getSaved("householdID", ""));
  const [userID, setUserID] = useState(() => getSaved("userID", ""));
  const [userName, setUserName] = useState(() => getSaved("userName", ""));
  const [memberID, setMemberID] = useState(() => getSaved("memberID", null));
  const [userRole, setUserRole] = useState(() =>
    getSaved("userRole", "member"),
  );
  const [hhAddress, setHhAddress] = useState(null);
  const [hhHeadName, setHhHeadName] = useState("");
  const [feedbackService, setFeedbackService] = useState(
    scannedServiceId ? { id: scannedServiceId, name: scannedServiceName } : null,
  );

  // Sync URL when page changes
  useEffect(() => {
    const path = PAGE_TO_PATH[page];
    if (path && window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    } else if (!path && window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  }, [page]);

  // Handle FCM pushing
  useEffect(() => {
    if (LOGGED_IN_PAGES.includes(page) && userID) {
      const unsubFcm = listenForForegroundMessages();
      return () => {
        if (unsubFcm) unsubFcm();
      };
    }
  }, [userID, page]);

  // Save session to localStorage
  useEffect(() => {
    try {
      if (LOGGED_IN_PAGES.includes(page)) {
        localStorage.setItem(
          "brgy_session",
          JSON.stringify({ householdID, userID, userName, memberID, userRole }),
        );
      } else {
        localStorage.removeItem("brgy_session");
      }
    } catch (e) { }
  }, [page, householdID, userID, userName, memberID, userRole]);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const onPop = () => {
      const fromPath = PATH_TO_PAGE[window.location.pathname];
      const saved = localStorage.getItem("brgy_session");
      if (fromPath && saved) {
        setPage(fromPath);
      } else {
        setPage("landing");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // ── Navigation handler ──
  const handleNav = (p, data) => {
    if (p === "logout") {
      localStorage.removeItem("brgy_session");
      window.history.pushState({}, "", "/");
      setPage("landing");
    } else if (p === "feedback" && data?.service) {
      setFeedbackService(data.service);
      setPage("feedback");
    } else {
      setPage(p);
    }
  };

  // ── LANDING ──
  if (page === "landing") {
    return (
      <LandingPage
        onLoginClick={() => setPage("login")}
        onRegisterClick={() => setPage("register")}
        onActivateClick={() => setPage("activate")}
      />
    );
  }

  // ── LOGIN ──
  if (page === "login") {
    return (
      <Login
        onBack={() => setPage("landing")}
        onForgotPassword={() => setPage("forgot")}
        onSuccess={(selectedProfile) => {
          // Clear any stale session first to prevent cross-user data leakage
          localStorage.removeItem("brgy_session");
          setHouseholdID("");
          setUserID("");
          setMemberID(null);
          setUserName("");
          setUserRole("member");

          if (selectedProfile?.householdID) setHouseholdID(selectedProfile.householdID);
          if (selectedProfile?.userID) setUserID(selectedProfile.userID);
          if (selectedProfile?.memberID) setMemberID(selectedProfile.memberID);
          if (selectedProfile?.name) setUserName(selectedProfile.name);
          if (selectedProfile?.role) setUserRole(selectedProfile.role);
          setPage(feedbackService ? "feedback" : "home");
        }}
        onRegister={() => setPage("register")}
        onActivate={() => setPage("activate")}
      />
    );
  }

  // ── FORGOT PASSWORD ──
  if (page === "forgot") {
    return (
      <ForgotPassword
        onBack={() => setPage("login")}
        onLoginClick={() => setPage("login")}
        onRegister={() => setPage("register")}
      />
    );
  }

  // ── REGISTRATION ──
  if (page === "register") {
    return (
      <Registration
        onBack={() => setPage("landing")}
        onSuccess={(address) => {
          if (address) setHhAddress(address);
          setPage("landing");
        }}
      />
    );
  }

  // ── ACTIVATION ──
  if (page === "activate") {
    return (
      <Activation
        onBack={() => setPage("landing")}
        onLoginClick={() => setPage("login")}
        onSuccess={(data) => {
          if (data?.householdID) setHouseholdID(data.householdID);
          if (data?.address) setHhAddress(data.address);
          setPage("add-members");
        }}
      />
    );
  }

  // ── ADD MEMBERS ──
  if (page === "add-members") {
    return (
      <AddMembers
        onBack={() => setPage("landing")}
        onDone={() => setPage("login")}
        householdID={householdID}
        hhAddress={hhAddress}
      />
    );
  }

  // ── PROFILE ──
  if (page === "profile") {
    return (
      <Profile
        onBack={() => setPage("home")}
        onNavigate={handleNav}
        householdID={householdID}
        userName={userName}
        memberID={memberID}
        userRole={userRole}
        userID={userID}
      />
    );
  }

  // ── HOME / DASHBOARD ──
  if (page === "home" || page === "dashboard") {
    return (
      <div className="app-page">
        <Navbar
          activePage="home"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <Dashboard userName={userName} onNavigate={handleNav} householdID={householdID} memberID={memberID} userRole={userRole} />
      </div>
    );
  }

  // ── SERVICES ──
  if (page === "services") {
    return (
      <div className="app-page">
        <Navbar
          activePage="services"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <ServicesPage onNavigate={handleNav} householdID={householdID} memberID={memberID} userName={userName} userID={userID} />
      </div>
    );
  }

  // ── SCAN PAGE ──
  if (page === "scan") {
    return (
      <div className="app-page">
        <Navbar
          activePage="scan"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <ScanPage onNavigate={handleNav} userName={userName} householdID={householdID} residentID={memberID} userID={userID} />
      </div>
    );
  }

  // ── FEEDBACK FORM ──
  if (page === "feedback") {
    const currentUrlParams = new URLSearchParams(window.location.search);
    if (!feedbackService && !currentUrlParams.get("serviceId")) {
      setPage("scan");
      return null;
    }
    return (
      <div className="app-page">
        <Navbar
          activePage="scan"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <FeedbackForm
          onNavigate={(p, data) => {
            if (p !== "feedback") setFeedbackService(null);
            handleNav(p, data);
          }}
          service={feedbackService}
          userName={userName}
          householdID={householdID}
          userID={memberID}  // FeedbackForm stores this as residentID
        />
      </div>
    );
  }

  // ── ACTIVITY ──
  if (page === "activity") {
    return (
      <div className="app-page">
        <Navbar
          activePage="activity"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <ActivityPage onNavigate={handleNav} userName={userName} memberID={memberID} householdID={householdID} />
      </div>
    );
  }

  // ── EMERGENCY ──
  if (page === "emergency") {
    return (
      <div className="app-page">
        <Navbar
          activePage="emergency"
          onNavigate={handleNav}
          householdID={householdID}
          userName={userName}
          userRole={userRole}
          memberID={memberID}
          userID={userID}
        />
        <EmergencyPage onNavigate={handleNav} userName={userName} />
      </div>
    );
  }

  // ── FALLBACK ──
  return (
    <LandingPage
      onLoginClick={() => setPage("login")}
      onRegisterClick={() => setPage("register")}
      onActivateClick={() => setPage("activate")}
    />
  );
}