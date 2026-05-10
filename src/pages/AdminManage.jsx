import React, { useState } from "react";
import AdminLayout from "../components/AdminLayout";
import "../AdminStyle.css"; // ensure styles are preserved

import ManagePrograms from "./ManageTabs/ManagePrograms";
import ManageServices from "./ManageTabs/ManageServices";
import ManageDocuments from "./ManageTabs/ManageDocuments";
import ManageFacilities from "./ManageTabs/ManageFacilities";
import ManageAnnouncements from "./ManageTabs/ManageAnnouncements";

export default function AdminManage() {
  const [activeTab, setActiveTab] = useState("services");

  const TABS = [
    { id: "programs", label: "Programs" },
    { id: "services", label: "Services" },
    { id: "documents", label: "Documents" },
    { id: "facilities", label: "Facilities" },
    { id: "announcements", label: "Announcements" },
  ];

  return (
    <AdminLayout>
      <div className="as-container" style={{ paddingTop: '20px' }}>
        
        {/* Tab Navigation */}
        <div style={{
          display: 'flex', gap: '10px', marginBottom: '24px', 
          borderBottom: '1px solid #E5E7EB', paddingBottom: '8px',
          overflowX: 'auto', whiteSpace: 'nowrap'
        }}>
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #317D89' : '2px solid transparent',
                color: activeTab === tab.id ? '#317D89' : '#6B7280',
                fontWeight: activeTab === tab.id ? '600' : '400',
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
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
          {activeTab === "announcements" && <ManageAnnouncements />}
        </div>
        
      </div>
    </AdminLayout>
  );
}