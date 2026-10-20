import { useState, useEffect } from "react"
import '../AdminStyle.css';
import AdminLayout from "../components/AdminLayout"
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAlert } from "../context/AlertContext";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // <-- Added React Query

export default function AdminProfile() {
  const queryClient = useQueryClient(); // <-- For local cache mutation
  const { showAlert } = useAlert();

  const [currentUser, setCurrentUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    contact: "",
    position: "",
    password: "",
    newPassword: "",
    confirmPassword: ""
  });

  // ─── 1. INITIALIZE AUTHENTICATION ───
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);

      // Instantly hydrate form from session storage for zero-flicker UI
      if (user) {
        const cachedProfile = sessionStorage.getItem(`admin_profile_${user.uid}`);
        if (cachedProfile) {
          const parsed = JSON.parse(cachedProfile);
          setForm(prev => ({
            ...prev,
            fullName: parsed.fullName || "",
            email: user.email || "",
            position: parsed.position || ""
          }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ─── 2. OPTIMIZED: Fetch Profile Metadata (Cached Indefinitely) ───
  const { data: profileMeta, isLoading: profileLoading } = useQuery({
    queryKey: ['adminManage_myProfile', currentUser?.uid],
    queryFn: async () => {
      const approvedQ = query(collection(db, "approvedAdmins"), where("uid", "==", currentUser.uid));
      const approvedSnap = await getDocs(approvedQ);

      if (!approvedSnap.empty) {
        const docSnap = approvedSnap.docs[0];
        return { docId: docSnap.id, collection: "approvedAdmins", data: docSnap.data() };
      }

      const pendingQ = query(collection(db, "pendingAdmins"), where("uid", "==", currentUser.uid));
      const pendingSnap = await getDocs(pendingQ);

      if (!pendingSnap.empty) {
        const docSnap = pendingSnap.docs[0];
        return { docId: docSnap.id, collection: "pendingAdmins", data: docSnap.data() };
      }

      throw new Error("Profile not found");
    },
    enabled: !!currentUser,
    staleTime: Infinity, // The admin's own profile only changes when THEY edit it. No need to refetch.
  });

  // Sync fully loaded profile data into form (only if not actively editing)
  useEffect(() => {
    if (profileMeta && !isEditingProfile) {
      setForm(prev => ({
        ...prev,
        fullName: profileMeta.data.fullName || "",
        username: profileMeta.data.username || "",
        email: profileMeta.data.email || currentUser?.email || "",
        contact: profileMeta.data.contact || "",
        position: profileMeta.data.position || ""
      }));
    }
  }, [profileMeta, isEditingProfile, currentUser]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ─── 3. OPTIMIZED: Zero-Read Profile Mutation & Cross-Component Sync ───
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!profileMeta?.docId || !profileMeta?.collection) {
      await showAlert("Error", "Could not find your profile. Please try again.");
      return;
    }

    try {
      await updateDoc(doc(db, profileMeta.collection, profileMeta.docId), {
        fullName: form.fullName,
        username: form.username,
        contact: form.contact
      });

      // Update React Query Cache Surgically (0 Reads)
      queryClient.setQueryData(['adminManage_myProfile', currentUser?.uid], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            fullName: form.fullName,
            username: form.username,
            contact: form.contact
          }
        };
      });

      // Update Session Storage instantly so Sidebar/Header catches the new name immediately
      const sessionKey = `admin_profile_${currentUser.uid}`;
      const existingSession = JSON.parse(sessionStorage.getItem(sessionKey) || '{}');
      sessionStorage.setItem(sessionKey, JSON.stringify({
        ...existingSession,
        fullName: form.fullName
      }));

      await showAlert("Success", "Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (error) {
      await showAlert("Error", "Failed to update profile: " + error.message);
    }
  };

  // ─── 4. AUTH ONLY: Password Update (0 Firestore Reads) ───
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!form.password || !form.newPassword || !form.confirmPassword) {
      await showAlert("Warning", "Please fill in all password fields");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      await showAlert("Warning", "Passwords do not match");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, form.password);
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);

      await showAlert("Success", "Password updated successfully!");
      setForm(prev => ({ ...prev, password: "", newPassword: "", confirmPassword: "" }));
      setIsEditingPassword(false);
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);

    } catch (error) {
      if (error.code === "auth/wrong-password") {
        await showAlert("Error", "Current password is incorrect.");
      } else {
        await showAlert("Error", "Failed to update password: " + error.message);
      }
    }
  };

  const toggleProfileEdit = () => {
    setIsEditingProfile(!isEditingProfile);
    setIsEditingPassword(false);
    setForm(prev => ({ ...prev, password: "", newPassword: "", confirmPassword: "" }));
    
    // Reset form to cached data if cancelling
    if (isEditingProfile && profileMeta) {
      setForm(prev => ({
        ...prev,
        fullName: profileMeta.data.fullName || "",
        username: profileMeta.data.username || "",
        contact: profileMeta.data.contact || "",
      }));
    }
  };

  const togglePasswordEdit = () => {
    const newState = !isEditingPassword;
    setIsEditingPassword(newState);
    setIsEditingProfile(false);
    if (!newState) {
      setForm(prev => ({ ...prev, password: "", newPassword: "", confirmPassword: "" }));
    }
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const isPasswordValid =
    form.password && form.newPassword && form.confirmPassword &&
    form.newPassword === form.confirmPassword;

  // Derive loading state
  const isPageLoading = !authInitialized || (currentUser && profileLoading);

  if (isPageLoading) {
    return (
      <AdminLayout>
        <div style={{ textAlign: "center", padding: "60px", fontSize: "1.2rem", color: "#64748b" }}>
          Loading profile...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="main-content no-scroll-page">

        {/* ACCOUNT INFO */}
        <div className="section">
          <div className="section-header">
            <h2>Account Information</h2>
            <button className="btn-edit" onClick={toggleProfileEdit}>
              {isEditingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div className="profile-card" style={{ display: "block" }}>
            <div className="profile-header">
              <div>
                <h3>{form.fullName || "Admin"}</h3>
                <span>{form.position || "Standard Admin"}</span>
              </div>
            </div>

            <div className="admin-profile-grid">
              <div className="field">
                <label>Full Name</label>
                <div className="input-wrap">
                  <input type="text" name="fullName" value={form.fullName} onChange={handleChange} disabled={!isEditingProfile} />
                </div>
              </div>

              <div className="field">
                <label>Username</label>
                <div className="input-wrap">
                  <input type="text" name="username" value={form.username} onChange={handleChange} disabled={!isEditingProfile} />
                </div>
              </div>

              <div className="field">
                <label>Email</label>
                <div className="input-wrap">
                  <input type="email" name="email" value={form.email} disabled={true} />
                </div>
              </div>

              <div className="field">
                <label>Contact</label>
                <div className="input-wrap">
                  <input type="text" name="contact" value={form.contact} onChange={handleChange} disabled={!isEditingProfile} />
                </div>
              </div>

              <div className="field">
                <label>Position</label>
                <div className="input-wrap">
                  <input type="text" name="position" value={form.position} disabled={true} />
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <button className="btn-main" onClick={handleProfileUpdate}>
                Update Profile
              </button>
            )}
          </div>
        </div>

        {/* SECURITY */}
        <div className="section">
          <div className="section-header">
            <h2>Security Settings</h2>
            <button className="btn-edit" onClick={togglePasswordEdit}>
              {isEditingPassword ? "Cancel" : "Edit Password"}
            </button>
          </div>

          <div className="profile-card" style={{ display: "block" }}>
            <div className="admin-profile-grid">

              {/* CURRENT PASSWORD */}
              <div className="field full-width">
                <label>Current Password</label>
                <div className="input-wrap has-toggle">
                  <input
                    type={showCurrent ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    disabled={!isEditingPassword}
                    placeholder={isEditingPassword ? "Enter current password" : "••••••••"}
                  />
                  {isEditingPassword && (
                    <button type="button" className="toggle-pw" onClick={() => setShowCurrent(!showCurrent)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {showCurrent ? (
                          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        ) : (
                          <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        )}
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* NEW PASSWORD */}
              <div className="field">
                <label>New Password</label>
                <div className="input-wrap has-toggle">
                  <input
                    type={showNew ? "text" : "password"}
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleChange}
                    disabled={!isEditingPassword}
                    placeholder={isEditingPassword ? "Enter new password" : "••••••••"}
                  />
                  {isEditingPassword && (
                    <button type="button" className="toggle-pw" onClick={() => setShowNew(!showNew)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {showNew ? (
                          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        ) : (
                          <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        )}
                      </svg>
                    </button>
                  )}
                </div>

                {form.newPassword && (() => {
                  const hasLength = form.newPassword.length >= 8;
                  const hasUpper = /[A-Z]/.test(form.newPassword);
                  const hasNumber = /[0-9]/.test(form.newPassword);
                  const score = [hasLength, hasUpper, hasNumber].filter(Boolean).length;
                  const strengthColor = ["#d9534f", "#f0ad4e", "#28a745"][score - 1] || "#d9534f";
                  const strengthText = ["Weak", "Fair", "Strong"][score - 1] || "Weak";
                  return (
                    <>
                      <div className="password-strength">
                        <div className="strength-bar" style={{ width: `${(score / 3) * 100}%`, backgroundColor: strengthColor, height: "5px", borderRadius: "4px", marginTop: "4px" }}></div>
                      </div>
                      <small className="strength-text" style={{ color: strengthColor }}>{strengthText}</small>
                      <div className={`pw-rule ${hasLength ? "pass" : ""}`}><span className="rule-dot"></span> At least 8 characters</div>
                      <div className={`pw-rule ${hasUpper ? "pass" : ""}`}><span className="rule-dot"></span> One uppercase letter</div>
                      <div className={`pw-rule ${hasNumber ? "pass" : ""}`}><span className="rule-dot"></span> One number</div>
                    </>
                  );
                })()}
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="field">
                <label>Confirm Password</label>
                <div className="input-wrap has-toggle">
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={!isEditingPassword}
                    placeholder={isEditingPassword ? "Re-enter new password" : "••••••••"}
                  />
                  {isEditingPassword && (
                    <button type="button" className="toggle-pw" onClick={() => setShowConfirm(!showConfirm)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {showConfirm ? (
                          <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
                        ) : (
                          <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        )}
                      </svg>
                    </button>
                  )}
                </div>

                {(form.newPassword || form.confirmPassword) ? (
                  <small style={{ color: form.newPassword === form.confirmPassword ? "#28a745" : "#d9534f", fontWeight: "bold", display: "block", marginTop: "5px" }}>
                    {form.newPassword === form.confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </small>
                ) : null}
              </div>
            </div>

            {isEditingPassword && (
              <button className="btn-main" onClick={handlePasswordUpdate} disabled={!isPasswordValid}>
                Update Password
              </button>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}