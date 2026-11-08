import React, { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import "../AdminStyle.css";

import ManagePrograms from "./ManageTabs/ManagePrograms";
import ManageServices from "./ManageTabs/ManageServices";
import ManageDocuments from "./ManageTabs/ManageDocuments";
import ManageFacilities from "./ManageTabs/ManageFacilities";
import ManageEquipment from "./ManageTabs/ManageEquipment";
import ManageAnnouncements from "./ManageTabs/ManageAnnouncements";

// NEW: Import the custom language hook
import { useLanguage } from '../context/LanguageContext';

export default function AdminManage() {
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("adminManageActiveTab") || "programs";
  });

  // NEW: Destructure the translation hook
  const { t } = useLanguage();

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    sessionStorage.setItem("adminManageActiveTab", tabId);
  };

  // Dynamic TABS array inside the component so it re-translates instantly on toggle
  const TABS = [
    { id: "programs", label: t('admin_manage_programs') },
    { id: "services", label: t('admin_manage_services') },
    { id: "documents", label: t('admin_manage_documents') },
    { id: "facilities", label: t('admin_manage_facilities') },
    { id: "equipment", label: t('admin_manage_equipment') },
    { id: "announcements", label: t('admin_manage_announcements') },
  ];

  return (
    <AdminLayout>
      <div className="as-container" style={{ paddingTop: "20px" }}>
        
        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "24px",
            borderBottom: "1px solid #E5E7EB",
            paddingBottom: "8px",
            overflowX: "auto",
            whiteSpace: "nowrap",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: "10px 20px",
                background: "none",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid #317D89"
                    : "2px solid transparent",
                color: activeTab === tab.id ? "#317D89" : "#6B7280",
                fontWeight: activeTab === tab.id ? "600" : "400",
                fontSize: "1rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="manage-tab-content">
          {activeTab === "programs" && <ManagePrograms />}
          {activeTab === "services" && <ManageServices />}
          {activeTab === "documents" && <ManageDocuments />}
          {activeTab === "facilities" && <ManageFacilities />}
          {activeTab === "equipment" && <ManageEquipment />}
          {activeTab === "announcements" && <ManageAnnouncements />}
        </div>

      </div>
    </AdminLayout>
  );
}