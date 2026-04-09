import React, { useState } from "react";
import { Manage_IconClock, IconAdd, Manage_IconQR, IconDownload, IconConfirmCheck } from "../../components/Icons";
import { QRCodeSVG } from "qrcode.react";
import FormBuilder from "../../components/FormBuilder";

export default function ManageDocuments() {
  const [documents, setDocuments] = useState([
    { id: "d1", title: "Barangay Clearance", processingTime: "1-2 Working Days", fee: "₱50.00", requirements: ["Valid ID", "Cedula"], customFields: [] },
    { id: "d2", title: "Certificate of Indigency", processingTime: "1 Working Day", fee: "Free", requirements: ["Valid ID", "Voter's Certification"], customFields: [] },
    { id: "d3", title: "Business Permit Clearance", processingTime: "3-5 Working Days", fee: "₱500.00", requirements: ["DTI Registration", "Contract of Lease", "Sketch of Business Location"], customFields: [] },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [editingDocId, setEditingDocId] = useState(null);

  const [newDocument, setNewDocument] = useState({ title: "", processingTime: "", fee: "", requirements: [""], customFields: [] });

  const handleEdit = (docType) => {
    setNewDocument({
      title: docType.title || "",
      processingTime: docType.processingTime || "",
      fee: docType.fee || "",
      requirements: docType.requirements && docType.requirements.length > 0 ? docType.requirements : [""],
      customFields: docType.customFields || []
    });
    setEditingDocId(docType.id);
    setShowAddModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this document type?")) {
      setDocuments(documents.filter(d => d.id !== id));
    }
  };

  const handleAddDocument = (e) => {
    e.preventDefault();
    const reqArray = newDocument.requirements.filter(r => r.trim() !== "");
    
    if (editingDocId) {
      setDocuments(documents.map(d => d.id === editingDocId ? { ...d, ...newDocument, requirements: reqArray } : d));
    } else {
      setDocuments([...documents, { ...newDocument, id: `d${Date.now()}`, requirements: reqArray }]);
    }
    setNewDocument({ title: "", processingTime: "", fee: "", requirements: [""], customFields: [] });
    setEditingDocId(null);
    setShowAddModal(false);
  };

  const openAddModal = () => {
    setEditingDocId(null);
    setNewDocument({ title: "", processingTime: "", fee: "", requirements: [""], customFields: [] });
    setShowAddModal(true);
  };

  const addReqField = () => {
    setNewDocument({ ...newDocument, requirements: [...newDocument.requirements, ""] });
  };

  const handleGenerateGlobalQR = () => {
    const residentAppUrl = "https://3-sense.vercel.app/";
    const encodedUrl = `${residentAppUrl}?serviceId=documents_global&serviceName=${encodeURIComponent("All Documents")}&category=Documents`;
    setSelectedQR({ name: "Document Request Portal", qrValue: encodedUrl });
  };

  const handleDownloadQR = () => {
    const svgElement = document.getElementById("as-qr-svg");
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0);
      const downloadLink = document.createElement("a");
      downloadLink.href = canvas.toDataURL("image/png");
      downloadLink.download = `3Sense-QR-Documents.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="as-container" style={{ padding: 0 }}>
      <div className="as-header-section">
        <div className="as-title-wrap">
          <h1>Documents</h1>
          <p className="as-subtitle">Manage barangay document types, fees, and processing times</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="as-qr-btn" onClick={handleGenerateGlobalQR}>
            <Manage_IconQR /> Generate Global QR
          </button>
          <button className="as-btn-aqua" onClick={openAddModal}>
            <IconAdd /> Add Document Type
          </button>
        </div>
      </div>

      <div className="as-controls">
        <div className="as-search-box">
          <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input type="text" placeholder="Search documents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="as-card-grid">
        {filteredDocs.map((doc) => (
          <div className="as-card" key={doc.id}>
            <div className="as-card-header">
              <h2 className="as-card-title">{doc.title}</h2>
            </div>
            <ul className="as-card-details">
              <li><Manage_IconClock /> <strong>Processing:</strong> {doc.processingTime}</li>
              <li><strong>Fee:</strong> {doc.fee}</li>
            </ul>
            <div className="as-card-footer" style={{ gap: '10px', display: 'flex' }}>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1 }} onClick={() => handleEdit(doc)}>Edit</button>
              <button className="as-btn-ghost" style={{ padding: '8px 16px', flex: 1, color: 'red', borderColor: '#fca5a5' }} onClick={() => handleDelete(doc.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '600px' }}>
            <div className="as-modal-header">
              <h2>{editingDocId ? "Edit Document Type" : "Add Document Type"}</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddDocument}>
                <div className="as-form-group">
                  <label className="as-form-label">Document Title</label>
                  <input type="text" className="as-form-input" required placeholder="e.g. Barangay Clearance"
                    value={newDocument.title} onChange={(e) => setNewDocument({...newDocument, title: e.target.value})} 
                  />
                </div>
                
                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Processing Time</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. 1-2 Working Days"
                      value={newDocument.processingTime} onChange={(e) => setNewDocument({...newDocument, processingTime: e.target.value})} 
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Fee</label>
                    <input type="text" className="as-form-input" required placeholder="e.g. ₱50.00 or Free"
                      value={newDocument.fee} onChange={(e) => setNewDocument({...newDocument, fee: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Requirements</label>
                  {newDocument.requirements.map((req, idx) => (
                    <input key={idx} type="text" className="as-form-input" style={{ marginBottom: '5px' }} placeholder="Requirement name"
                      value={req} onChange={(e) => {
                        const newReqs = [...newDocument.requirements];
                        newReqs[idx] = e.target.value;
                        setNewDocument({...newDocument, requirements: newReqs});
                      }}
                    />
                  ))}
                  <button type="button" className="as-btn-ghost" onClick={addReqField} style={{ width: 'fit-content', padding: '5px 10px', fontSize: '0.9rem' }}>+ Add Requirement</button>
                </div>

                <div className="as-form-section" style={{ marginTop: '20px' }}>
                  <h3 className="as-form-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    Default Collected Fields
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '12px', marginTop: '-10px' }}>The following information is automatically collected. Do not recreate them in the form builder.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {["First Name", "Middle Name", "Last Name", "Date of Birth", "Civil Status", "Complete Address", "Contact Number", "Email", "Residing Since (Year)", "Purpose of Request"].map(f => (
                      <span key={f} style={{ background: '#f3f4f6', color: '#4b5563', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <FormBuilder 
                  fields={newDocument.customFields} 
                  onChange={(fields) => setNewDocument({ ...newDocument, customFields: fields })} 
                />

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Save Document Type</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedQR && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '450px' }}>
            <div className="as-modal-header">
              <h2>QR Code Generated</h2>
              <button className="as-modal-close" onClick={() => setSelectedQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body" style={{ textAlign: 'center' }}>
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedQR.name}</h3>
              <p className="as-modal-desc">Residents can scan this shared code to access all Document Requests.</p>
              <div className="as-qr-holder" style={{ margin: '20px auto', display: 'flex', justifyContent: 'center' }}>
                <QRCodeSVG id="as-qr-svg" value={selectedQR.qrValue} size={150} level={"H"} includeMargin={true}/>
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR} style={{ width: '100%' }}><IconDownload /> Download QR Code (PNG)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
