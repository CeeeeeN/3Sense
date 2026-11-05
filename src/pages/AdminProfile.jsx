import React, { useState, useEffect } from "react";
import "../AdminStyle.css";
import AdminLayout from "../components/AdminLayout";
import { auth, db } from "../firebase/firebase";
import {
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useAlert } from "../context/AlertContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminProfile() {
  const queryClient = useQueryClient();
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
    role: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);

      if (user) {
        const cached =
          sessionStorage.getItem(`admin_profile_${user.uid}`) ||
          sessionStorage.getItem("adminUserData");

        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setForm((prev) => ({
              ...prev,
              fullName: parsed.fullName || "",
              email: user.email || "",
              position: parsed.position || "",
              role: parsed.role || parsed.position || "Super Admin",
            }));
          } catch (e) {
            console.error(e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const { data: profileMeta, isLoading: profileLoading } = useQuery({
    queryKey: ["adminManage_myProfile", currentUser?.uid],
    queryFn: async () => {
      const approvedQ = query(
        collection(db, "approvedAdmins"),
        where("uid", "==", currentUser.uid)
      );
      const approvedSnap = await getDocs(approvedQ);

      if (!approvedSnap.empty) {
        const docSnap = approvedSnap.docs[0];
        return {
          docId: docSnap.id,
          collection: "approvedAdmins",
          data: docSnap.data(),
        };
      }

      const pendingQ = query(
        collection(db, "pendingAdmins"),
        where("uid", "==", currentUser.uid)
      );
      const pendingSnap = await getDocs(pendingQ);

      if (!pendingSnap.empty) {
        const docSnap = pendingSnap.docs[0];
        return {
          docId: docSnap.id,
          collection: "pendingAdmins",
          data: docSnap.data(),
        };
      }

      throw new Error("Profile not found");
    },
    enabled: !!currentUser,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (profileMeta && !isEditingProfile) {
      setForm((prev) => ({
        ...prev,
        fullName: profileMeta.data.fullName || "",
        username: profileMeta.data.username || "",
        email: profileMeta.data.email || currentUser?.email || "",
        contact: profileMeta.data.contact || "",
        position: profileMeta.data.position || "Standard Admin",
        role: profileMeta.data.role || profileMeta.data.position || "Super Admin",
      }));
    }
  }, [profileMeta, isEditingProfile, currentUser]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

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
        contact: form.contact,
      });

      queryClient.setQueryData(["adminManage_myProfile", currentUser?.uid], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            fullName: form.fullName,
            username: form.username,
            contact: form.contact,
          },
        };
      });

      const sessionKey = `admin_profile_${currentUser.uid}`;
      const existingSession = JSON.parse(sessionStorage.getItem(sessionKey) || "{}");
      sessionStorage.setItem(
        sessionKey,
        JSON.stringify({
          ...existingSession,
          fullName: form.fullName,
        })
      );

      await showAlert("Success", "Profile updated successfully!");
      setIsEditingProfile(false);
    } catch (error) {
      await showAlert("Error", "Failed to update profile: " + error.message);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    if (!form.password || !form.newPassword || !form.confirmPassword) {
      await showAlert("Warning", "Please fill in all password fields.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      await showAlert("Warning", "Passwords do not match.");
      return;
    }

    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, form.password);

      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);

      await showAlert("Success", "Password updated successfully!");
      setForm((prev) => ({
        ...prev,
        password: "",
        newPassword: "",
        confirmPassword: "",
      }));
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
    const nextState = !isEditingProfile;
    setIsEditingProfile(nextState);
    setIsEditingPassword(false);
    if (!nextState && profileMeta) {
      setForm((prev) => ({
        ...prev,
        fullName: profileMeta.data.fullName || "",
        username: profileMeta.data.username || "",
        contact: profileMeta.data.contact || "",
      }));
    }
  };

  const togglePasswordEdit = () => {
    const nextState = !isEditingPassword;
    setIsEditingPassword(nextState);
    setIsEditingProfile(false);
    if (!nextState) {
      setForm((prev) => ({
        ...prev,
        password: "",
        newPassword: "",
        confirmPassword: "",
      }));
    }
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const isPasswordValid =
    form.password &&
    form.newPassword &&
    form.confirmPassword &&
    form.newPassword === form.confirmPassword &&
    form.newPassword.length >= 8;

  const hasLength = (form.newPassword || "").length >= 8;
  const hasUpper = /[A-Z]/.test(form.newPassword || "");
  const hasNumber = /[0-9]/.test(form.newPassword || "");
  const strengthScore = [hasLength, hasUpper, hasNumber].filter(Boolean).length;
  const strengthColor =
    strengthScore === 3 ? "#10b981" : strengthScore === 2 ? "#f59e0b" : "#ef4444";
  const strengthLabel =
    strengthScore === 3 ? "Strong" : strengthScore === 2 ? "Moderate" : "Weak";

  const isPageLoading = !authInitialized || (currentUser && profileLoading);

  if (isPageLoading) {
    return (
      <AdminLayout>
        <div style={{ width: "100%", textAlign: "center", padding: "80px 0", color: "#64748b" }}>
          Loading profile...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div style={{ width: "100%", marginTop: "20px", display: "flex", flexDirection: "column", gap: "28px" }}>
        
        <section style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                Account Information
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "2px 0 0" }}>
                Personal credentials and contact information
              </p>
            </div>

            <button
              type="button"
              onClick={toggleProfileEdit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                border: isEditingProfile ? "1px solid #cbd5e1" : "1.5px solid #317d89",
                background: isEditingProfile ? "#ffffff" : "#317d89",
                color: isEditingProfile ? "#475569" : "#ffffff",
                boxShadow: isEditingProfile ? "none" : "0 2px 6px rgba(49,125,137,0.2)",
              }}
            >
              {isEditingProfile ? "Cancel" : "Edit Profile"}
            </button>
          </div>

          <div
            style={{
              width: "100%",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 28px",
                background: "#eff6ff",
                borderBottom: "1px solid #dbeafe",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  {form.fullName || "Admin"}
                </h3>
                <span className="dropdown-role" style={{ marginTop: 0 }}>
                  {form.role || "Super Admin"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#475569" }}>
                @{form.username || "username"} &bull; {form.email}
              </p>
            </div>

            <form onSubmit={handleProfileUpdate} style={{ padding: "28px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "20px 24px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    disabled={!isEditingProfile}
                    placeholder="Enter full name"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: isEditingProfile ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                      background: isEditingProfile ? "#ffffff" : "#f8fafc",
                      color: isEditingProfile ? "#0f172a" : "#64748b",
                      fontSize: "0.9rem",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Username
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: "12px", color: "#94a3b8", fontSize: "0.88rem" }}>@</span>
                    <input
                      type="text"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      disabled={!isEditingProfile}
                      placeholder="username"
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 30px",
                        borderRadius: "8px",
                        border: isEditingProfile ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                        background: isEditingProfile ? "#ffffff" : "#f8fafc",
                        color: isEditingProfile ? "#0f172a" : "#64748b",
                        fontSize: "0.9rem",
                        outline: "none",
                        transition: "all 0.15s ease",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Contact Number
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={form.contact}
                    onChange={handleChange}
                    disabled={!isEditingProfile}
                    placeholder="e.g. 0917-123-4567"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: isEditingProfile ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                      background: isEditingProfile ? "#ffffff" : "#f8fafc",
                      color: isEditingProfile ? "#0f172a" : "#64748b",
                      fontSize: "0.9rem",
                      outline: "none",
                      transition: "all 0.15s ease",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                      Email Address
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>Locked</span>
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    disabled={true}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f1f5f9",
                      color: "#64748b",
                      fontSize: "0.9rem",
                      cursor: "not-allowed",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                      Position / Role
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>System Assigned</span>
                  </div>
                  <input
                    type="text"
                    name="position"
                    value={form.role || "Super Admin"}
                    disabled={true}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#f1f5f9",
                      color: "#64748b",
                      fontSize: "0.9rem",
                      cursor: "not-allowed",
                    }}
                  />
                </div>
              </div>

              {isEditingProfile && (
                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleProfileEdit}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: "9px 24px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background: "#317d89",
                      color: "#ffffff",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(49, 125, 137, 0.25)",
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>

        <section style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                Security Settings
              </h2>
              <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "2px 0 0" }}>
                Update your login credentials and account security
              </p>
            </div>

            <button
              type="button"
              onClick={togglePasswordEdit}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                border: isEditingPassword ? "1px solid #cbd5e1" : "1.5px solid #317d89",
                background: isEditingPassword ? "#ffffff" : "#317d89",
                color: isEditingPassword ? "#475569" : "#ffffff",
                boxShadow: isEditingPassword ? "none" : "0 2px 6px rgba(49,125,137,0.2)",
              }}
            >
              {isEditingPassword ? "Cancel" : "Edit Password"}
            </button>
          </div>

          <div
            style={{
              width: "100%",
              background: "#ffffff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
              padding: "28px",
            }}
          >
            <form onSubmit={handlePasswordUpdate}>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Current Password
                  </label>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <input
                      type={showCurrent ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      disabled={!isEditingPassword}
                      placeholder={isEditingPassword ? "Enter current password" : "••••••••••••"}
                      style={{
                        width: "100%",
                        padding: "10px 42px 10px 14px",
                        borderRadius: "8px",
                        border: isEditingPassword ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                        background: isEditingPassword ? "#ffffff" : "#f8fafc",
                        color: isEditingPassword ? "#0f172a" : "#64748b",
                        fontSize: "0.9rem",
                        outline: "none",
                        transition: "all 0.15s ease",
                      }}
                    />
                    {isEditingPassword && (
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        style={{
                          position: "absolute",
                          right: "12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          {showCurrent ? (
                            <>
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </>
                          ) : (
                            <>
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </>
                          )}
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: "20px 24px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                      New Password
                    </label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showNew ? "text" : "password"}
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleChange}
                        disabled={!isEditingPassword}
                        placeholder={isEditingPassword ? "Enter new password" : ""}
                        style={{
                          width: "100%",
                          padding: "10px 42px 10px 14px",
                          borderRadius: "8px",
                          border: isEditingPassword ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                          background: isEditingPassword ? "#ffffff" : "#f8fafc",
                          color: isEditingPassword ? "#0f172a" : "#64748b",
                          fontSize: "0.9rem",
                          outline: "none",
                          transition: "all 0.15s ease",
                        }}
                      />
                      {isEditingPassword && (
                        <button
                          type="button"
                          onClick={() => setShowNew(!showNew)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            {showNew ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </>
                            )}
                          </svg>
                        </button>
                      )}
                    </div>

                    {isEditingPassword && form.newPassword && (
                      <div
                        style={{
                          marginTop: "6px",
                          padding: "10px 12px",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Password Strength:</span>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: strengthColor }}>
                            {strengthLabel}
                          </span>
                        </div>
                        <div
                          style={{
                            height: "4px",
                            width: "100%",
                            background: "#e2e8f0",
                            borderRadius: "4px",
                            overflow: "hidden",
                            marginBottom: "8px",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${(strengthScore / 3) * 100}%`,
                              background: strengthColor,
                              transition: "all 0.3s ease",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.72rem" }}>
                          <span style={{ color: hasLength ? "#10b981" : "#94a3b8" }}>
                            {hasLength ? "✓" : "○"} At least 8 characters
                          </span>
                          <span style={{ color: hasUpper ? "#10b981" : "#94a3b8" }}>
                            {hasUpper ? "✓" : "○"} At least one uppercase letter
                          </span>
                          <span style={{ color: hasNumber ? "#10b981" : "#94a3b8" }}>
                            {hasNumber ? "✓" : "○"} One number
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                      Confirm Password
                    </label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={showConfirm ? "text" : "password"}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        disabled={!isEditingPassword}
                        placeholder={isEditingPassword ? "Re-enter new password" : ""}
                        style={{
                          width: "100%",
                          padding: "10px 42px 10px 14px",
                          borderRadius: "8px",
                          border: isEditingPassword ? "1.5px solid #317d89" : "1px solid #e2e8f0",
                          background: isEditingPassword ? "#ffffff" : "#f8fafc",
                          color: isEditingPassword ? "#0f172a" : "#64748b",
                          fontSize: "0.9rem",
                          outline: "none",
                          transition: "all 0.15s ease",
                        }}
                      />
                      {isEditingPassword && (
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          style={{
                            position: "absolute",
                            right: "12px",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            {showConfirm ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </>
                            )}
                          </svg>
                        </button>
                      )}
                    </div>

                    {isEditingPassword && (form.newPassword || form.confirmPassword) && (
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          color: form.newPassword === form.confirmPassword ? "#10b981" : "#ef4444",
                          marginTop: "4px",
                        }}
                      >
                        {form.newPassword === form.confirmPassword
                          ? "✓ Passwords match"
                          : "✕ Passwords do not match"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isEditingPassword && (
                <div
                  style={{
                    marginTop: "24px",
                    paddingTop: "20px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={togglePasswordEdit}
                    style={{
                      padding: "9px 20px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background: "#f1f5f9",
                      color: "#475569",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isPasswordValid}
                    style={{
                      padding: "9px 24px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      background: isPasswordValid ? "#317d89" : "#cbd5e1",
                      color: "#ffffff",
                      border: "none",
                      cursor: isPasswordValid ? "pointer" : "not-allowed",
                      boxShadow: isPasswordValid ? "0 4px 12px rgba(49, 125, 137, 0.25)" : "none",
                    }}
                  >
                    Update Password
                  </button>
                </div>
              )}
            </form>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}