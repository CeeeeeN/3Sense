import React, { useState, useEffect } from "react";
import AdminLayout from "../components/AdminLayout";
import "../AdminStyle.css";
import { IconLocation, IconCalendar, IconClock, IconAdd, IconQR, IconDownload, IconConfirmCheck } from "../components/Icons";
import { db } from "../firebase/firebase"; 
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot } from "firebase/firestore";

// REQUIRED FOR QR GENERATION
import { QRCodeSVG } from "qrcode.react";

export default function AdminServices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [selectedServiceQR, setSelectedServiceQR] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    // Point to a new 'services' collection, newest first
    const q = query(collection(db, "Services"), orderBy("CreatedAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveServices = snapshot.docs.map(doc => ({
        id: doc.id, // The unique Firebase document ID
        ...doc.data()
      }));
      
      setServices(liveServices);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  // Form State
  const [newService, setNewService] = useState({
    name: "", location: "", date: "", time: "", description: ""
  });

  const handleGenerateQR = (service) => {
    const residentAppUrl = "https://3-sense.vercel.app/";
    const validName = service.title || service.Name || service.FacilityName || "Barangay Service";
    const encodedUrl = `${residentAppUrl}?serviceId=${service.id}&serviceName=${encodeURIComponent(validName)}`;
    setSelectedServiceQR({ name: validName, qrValue: `${encodedUrl}` });
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
      downloadLink.download = `3Sense-QR-${selectedServiceQR.name}.png`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const handleAddService = async (e) => {
    e.preventDefault(); 
    
    try {
      // Push the exact form data to Firestore
      await addDoc(collection(db, "Services"), {
        Name: newService.name,
        Location: newService.location,
        Date: newService.date,
        Time: newService.time,
        Description: newService.description,
        Status: "Upcoming",
        CreatedAt: serverTimestamp()
      });

      // Reset the form and close the modal on success
      setNewService({ name: "", location: "", date: "", time: "", description: "" });
      setShowAddModal(false);

    } catch (error) {
      console.error("Error adding service: ", error);
      alert("Failed to save the new service. Please try again.");
    }
  };

  return (
    <AdminLayout>
      <div className="as-container">
        <div className="as-header-section">
          <div className="as-title-wrap">
            <h1>Services</h1>
            <p className="as-subtitle">Review and manage available/upcoming services</p>
          </div>
          <button className="as-btn-aqua" onClick={() => setShowAddModal(true)}>
            <IconAdd /> Add Service
          </button>
        </div>

        <div className="as-controls">
          <div className="as-search-box">
            <svg width="20" height="20" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" placeholder="Search service..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="as-filters">
            <select className="as-select"><option>Date Range</option></select>
            <select className="as-select"><option>Status</option></select>
          </div>
        </div>

        <div className="as-card-grid">
          {/* We now map over the 'services' state instead of mockServices */}
          {services.map((service) => (
            <div className="as-card" key={service.id}>
              <div className="as-card-header">
                <h2 className="as-card-title">{service.Name}</h2>
                <span className={`as-badge ${service.Status.toLowerCase().replace(" ", "-")}`}>{service.Status}</span>
              </div>
              <p className="as-card-desc">{service.Description}</p>
              <ul className="as-card-details">
                <li><IconLocation /> {service.Location}</li>
                <li><IconCalendar /> {service.Date}</li>
                <li><IconClock /> {service.Time}</li>
              </ul>
              <div className="as-card-footer">
                <button className="as-qr-btn" onClick={() => handleGenerateQR(service)}><IconQR /> Generate QR Code</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- ADD SERVICE MODAL --- */}
      {showAddModal && (
        <div className="as-modal-overlay">
          <div className="as-modal-content" style={{ maxWidth: '500px' }}>
            <div className="as-modal-header">
              <h2>Add New Service / Event</h2>
              <button className="as-modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
            </div>
            
            <div className="as-modal-body" style={{ alignItems: 'stretch' }}>
              <form className="as-form" onSubmit={handleAddService}>
                
                <div className="as-form-group">
                  <label className="as-form-label">Service Name</label>
                  <input type="text" className="as-form-input" required placeholder="e.g. Free Dental Mission"
                    value={newService.name} onChange={(e) => setNewService({...newService, name: e.target.value})} 
                  />
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Facility / Location</label>
                  <select className="as-form-select" required
                    value={newService.location} onChange={(e) => setNewService({...newService, location: e.target.value})}
                  >
                    <option value="" disabled>Select a location...</option>
                    <option value="Barangay Hall Ground">Barangay Hall Ground</option>
                    <option value="Malanday Health Center">Malanday Health Center</option>
                    <option value="Covered Court">Covered Court</option>
                  </select>
                </div>

                <div className="as-form-row">
                  <div className="as-form-group">
                    <label className="as-form-label">Date</label>
                    <input type="date" className="as-form-input" required
                      value={newService.date} onChange={(e) => setNewService({...newService, date: e.target.value})} 
                    />
                  </div>
                  <div className="as-form-group">
                    <label className="as-form-label">Time (e.g., 8AM - 5PM)</label>
                    <input type="text" className="as-form-input" required placeholder="8:00 AM - 5:00 PM"
                      value={newService.time} onChange={(e) => setNewService({...newService, time: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="as-form-group">
                  <label className="as-form-label">Description</label>
                  <textarea className="as-form-textarea" required placeholder="Briefly describe the service..."
                    value={newService.description} onChange={(e) => setNewService({...newService, description: e.target.value})} 
                  />
                </div>

                <div className="as-modal-actions">
                  <button type="button" className="as-btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="as-btn-aqua">Save Service</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- QR CODE MODAL POPUP --- */}
      {selectedServiceQR && (
        <div className="as-modal-overlay">
          <div className="as-modal-content">
            <div className="as-modal-header">
              <h2>QR Code Generated</h2>
              <button className="as-modal-close" onClick={() => setSelectedServiceQR(null)}>&times;</button>
            </div>
            <div className="as-modal-body">
              <div className="as-modal-confirm-icon"><IconConfirmCheck /></div>
              <h3>{selectedServiceQR.name}</h3>
              <p className="as-modal-desc">Residents can scan this code to access the feedback form.</p>
              <div className="as-qr-holder">
                <QRCodeSVG id="as-qr-svg" value={selectedServiceQR.qrValue} size={150} level={"H"} includeMargin={true}/>
              </div>
              <button className="as-btn-ghost" onClick={handleDownloadQR}><IconDownload /> Download QR Code (PNG)</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}