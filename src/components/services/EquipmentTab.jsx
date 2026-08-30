import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, limit } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { submitEquipmentRental } from "../../services/services"; 
import { ChevronRightIcon, ChevronLeftIcon, ServiceInfoIcon, ServiceCheckCircleIcon, ServiceClockIcon } from "../Icons";

const EquipmentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function dateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

const MIN_RENTAL_DATE = dateOffset(3);

function AdvanceRentalBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: "12px",
      background: "#eff6ff", border: "1px solid #93c5fd",
      borderRadius: "10px", padding: "14px 16px", marginBottom: "18px",
      fontSize: "14px", color: "#1e40af",
    }}>
      <svg style={{ flexShrink: 0, marginTop: "1px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <div style={{ flex: 1 }}>
        <strong style={{ display: "block", marginBottom: "2px", color: "#1e3a8a" }}>
          Advance Request Required
        </strong>
        Equipment rentals must be submitted at least{" "}
        <strong>3 days before</strong> your intended pick-up date. Please plan accordingly.
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", padding: "0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function EquipmentTab({ userData, householdID, userName, userID }) {
  const [equipmentList, setEquipmentList] = useState([]);
  const [rentalEquipment, setRentalEquipment] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "equipment"),
      limit(100) 
    );

    const unsub = onSnapshot(q, snapshot => {
      setEquipmentList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    return () => unsub();
  }, []);

  return (
    <>
      <AdvanceRentalBanner />

      <div className="sv-facilities-list">
        {equipmentList.map(eq => {
          // Dynamically check if the item is out of stock (quantity <= 0)
          const isOutOfStock = eq.quantity !== undefined && eq.quantity !== "" && Number(eq.quantity) <= 0;
          
          // It is only available if the admin switch is ON and it has stock
          const isAvailable = eq.available !== false && !isOutOfStock;

          return (
            <div key={eq.id} className="sv-facility-card">
              <div className="sv-facility-card__left">
                <div className="sv-facility-card__icon-wrap"><EquipmentIcon /></div>
                <div>
                  <div className="sv-facility-card__title">{eq.equipmentName || eq.name}</div>
                  <div className="sv-facility-card__meta">
                    <span>{eq.quantity !== undefined && eq.quantity !== "" ? `Total Inventory: ${eq.quantity} units` : "Quantity unlisted"}</span>
                  </div>
                  <div className="sv-facility-card__desc">{eq.description || eq.fullDescription}</div>
                </div>
              </div>
              <div className="sv-facility-card__right">
                <span className={`sv-avail-badge${isAvailable ? " sv-avail-badge--yes" : " sv-avail-badge--no"}`}>
                  <span className="sv-avail-dot" />
                  {isAvailable ? "Available" : (isOutOfStock ? "Unavailable (Out of Stock)" : "Unavailable")}
                </span>
                {isAvailable && (
                  <button className="sv-btn-primary sv-btn-sm" onClick={() => setRentalEquipment(eq)}>Rent <ChevronRightIcon /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {rentalEquipment && (
        <div className="rsv-overlay" onClick={e => e.target === e.currentTarget && setRentalEquipment(null)}>
          <div className="rsv-modal">
            <button className="rsv-modal__close" onClick={() => setRentalEquipment(null)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <RentalForm
              equipment={rentalEquipment}
              onBack={() => setRentalEquipment(null)}
              userData={userData}
              householdID={householdID}
              userName={userName}
              userID={userID}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Calendar({ selectedDate, onSelectDate, blockedDates = [] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const isPastMonth = (year, month) => {
    const now = new Date();
    return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());
  };
  const prevMonth = () => {
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    if (!isPastMonth(newYear, newMonth)) { setViewMonth(newMonth); setViewYear(newYear); }
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const getStatus = (d) => {
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const date = new Date(viewYear, viewMonth, d);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (date < todayMidnight) return "past";
    if (str < MIN_RENTAL_DATE) return "past";
    if (blockedDates.includes(str)) return "past"; // Blocked by admin
    return "available";
  };

  const isSelected = (d) => {
    const str = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return str === selectedDate;
  };

  return (
    <div className="sv-calendar">
      <div className="sv-cal-nav">
        <button className="sv-cal-arrow" onClick={prevMonth}><ChevronLeftIcon /></button>
        <span className="sv-cal-title">{MONTHS[viewMonth]} {viewYear}</span>
        <button className="sv-cal-arrow" onClick={nextMonth}><ChevronRightIcon /></button>
      </div>
      <div className="sv-cal-grid">
        {DAYS.map(d => <div key={d} className="sv-cal-day-label">{d}</div>)}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const status = getStatus(d);
          const sel = isSelected(d);
          const isBlocked = status === "past";
          return (
            <button key={d}
              className={`sv-cal-cell sv-cal-cell--${status}${sel ? " sv-cal-cell--selected" : ""}`}
              onClick={() => {
                if (isBlocked) return;
                const str = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                onSelectDate(str, status);
              }}
              disabled={isBlocked}
            >{d}</button>
          );
        })}
      </div>
      <div className="sv-cal-legend">
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--available" />Available</span>
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--reserved" />Blocked</span>
      </div>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "10px",
        fontSize: "12px", color: "#1e40af", background: "#eff6ff", border: "1px solid #bfdbfe",
        borderRadius: "6px", padding: "7px 10px",
      }}>
        <svg style={{ flexShrink: 0, marginTop: "1px" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        <span style={{ flex: 1, lineHeight: "1.5" }}>
          Select your <strong>Pick-up Date</strong>. Must be at least 3 days in advance.
        </span>
      </div>
    </div>
  );
}

function RentalForm({ onBack, equipment, userData, householdID, userName, userID }) {
  const equipmentName = equipment?.equipmentName || equipment?.name || "Equipment";
  const maxQty = equipment?.quantity ? parseInt(equipment.quantity, 10) : 0;
  
  const [form, setForm] = useState({
    fullName: "", email: "", contactNumber: "",
    purpose: "", customPurpose: "", quantity: "", pickUpDate: "", returnDate: "", notes: ""
  });
  const [refNum, setRefNum] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (userData) {
      const name = [userData.firstName, userData.middleName, userData.lastName].filter(Boolean).join(" ");
      setForm(f => ({
        ...f,
        fullName: name,
        email: userData.email || "",
        contactNumber: userData.contactNumber != null ? String(userData.contactNumber) : ""
      }));
    }
  }, [userData]);

  const validate = () => {
    const e = {};
    if (!form.email?.trim()) e.email = "Email is required.";
    
    if (!form.purpose) e.purpose = "Please select a purpose.";
    if (form.purpose === "Other" && !form.customPurpose.trim()) e.customPurpose = "Please specify your purpose.";
    
    if (!form.quantity || form.quantity <= 0) e.quantity = "Please enter a valid quantity.";
    if (maxQty > 0 && form.quantity > maxQty) e.quantity = `Requested quantity exceeds available inventory (Max: ${maxQty}).`;
    
    if (!form.pickUpDate) e.pickUpDate = "Please select a pick-up date.";
    if (!form.returnDate) e.returnDate = "Please select a return date.";
    if (form.returnDate && form.pickUpDate && form.returnDate < form.pickUpDate) {
      e.returnDate = "Return date cannot be before the pick-up date.";
    }

    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    try {
      const finalPurpose = form.purpose === "Other" ? form.customPurpose : form.purpose;
      
      const generatedRef = await submitEquipmentRental(
        householdID,
        userData?.residentID || userID || "",
        userName || "Unknown",
        equipment,
        { ...form, purpose: finalPurpose },
        {} // custom data if needed later
      );
      setRefNum(generatedRef || "");
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit rental:", error);
      setErrors({ submit: "Failed to submit. Please try again." });
    }
  };

  if (submitted) return (
    <div className="sv-success-wrap">
      <div className="sv-success-icon"><ServiceCheckCircleIcon /></div>
      <h3 className="sv-success-title">Request Submitted</h3>
      <p className="sv-success-sub">Your equipment rental request has been submitted and is awaiting barangay approval.</p>
      <div className="dr-ref-box" style={{ margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <span className="dr-ref-label" style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Reference Number</span>
        <span className="dr-ref-num" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '2px' }}>{refNum}</span>
      </div>
      <div className="sv-status-badge"><ServiceClockIcon /> Pending Approval</div>
      <button className="sv-btn-outline" style={{ marginTop: '1rem' }} onClick={onBack}>Close</button>
    </div>
  );

  return (
    <div className="sv-form-wrap">
      <div className="sv-form-header">
        <div className="sv-form-header-icon"><EquipmentIcon /></div>
        <div>
          <div className="sv-form-header-title">{equipmentName} Rental</div>
          <div className="sv-form-header-desc">Reserve equipment for your event. Approval is required before confirmation.</div>
        </div>
      </div>

      <div style={{
        display: "flex", alignItems: "flex-start", gap: "10px", background: "#eff6ff", border: "1px solid #93c5fd",
        borderRadius: "8px", padding: "10px 14px", margin: "0 0 16px 0", fontSize: "13px", color: "#1e40af",
      }}>
        <svg style={{ flexShrink: 0, marginTop: "1px" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span style={{ flex: 1, lineHeight: "1.5" }}>
          Requests must be submitted at least <strong>3 days before</strong> pick-up. Earliest available date is <strong>{MIN_RENTAL_DATE}</strong>.
        </span>
      </div>

      <div className="sv-form-body">
        <div className="sv-fields">
          <div className="sv-field-section-label">Requester Information</div>
          <div className="sv-field-row">
            <div className="sv-field">
              <label className="sv-label">Full Name</label>
              <input className="sv-input sv-input--readonly" value={form.fullName} readOnly />
            </div>
            <div className="sv-field">
              <label className="sv-label">Contact Number</label>
              <input className="sv-input sv-input--readonly" value={form.contactNumber} readOnly />
            </div>
          </div>
          <div className="sv-field">
            <label className="sv-label">Email Address <span className="sv-required">*</span></label>
            <input className={`sv-input${errors.email ? " sv-input--error" : ""}`} type="email" placeholder="your@email.com" value={form.email} onChange={e => { set("email", e.target.value); setErrors(p => ({ ...p, email: "" })); }} />
            {errors.email && <span className="sv-error-msg">{errors.email}</span>}
          </div>

          <div className="sv-field-section-label" style={{ marginTop: "1.5rem" }}>Rental Details</div>
          
          <div className="sv-field">
            <label className="sv-label">Purpose of Rental <span className="sv-required">*</span></label>
            <select 
              className={`sv-input${errors.purpose ? " sv-input--error" : ""}`} 
              value={form.purpose} 
              onChange={e => { set("purpose", e.target.value); setErrors(p => ({ ...p, purpose: "" })); }}
            >
              <option value="" disabled>Select a purpose...</option>
              {(equipment?.purposeOptions || []).map((opt, i) => (
                <option key={i} value={opt}>{opt}</option>
              ))}
              <option value="Other">Other (Please specify)</option>
            </select>
            {errors.purpose && <span className="sv-error-msg">{errors.purpose}</span>}
          </div>

          {form.purpose === "Other" && (
            <div className="sv-field">
              <label className="sv-label">Specify Purpose <span className="sv-required">*</span></label>
              <input className={`sv-input${errors.customPurpose ? " sv-input--error" : ""}`} placeholder="e.g. Community Cleanup, Sportsfest" value={form.customPurpose} onChange={e => { set("customPurpose", e.target.value); setErrors(p => ({ ...p, customPurpose: "" })); }} />
              {errors.customPurpose && <span className="sv-error-msg">{errors.customPurpose}</span>}
            </div>
          )}

          <div className="sv-field">
            <label className="sv-label">Quantity Requested <span className="sv-required">*</span> {maxQty > 0 && <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#64748b' }}>(Max: {maxQty})</span>}</label>
            <input className={`sv-input${errors.quantity ? " sv-input--error" : ""}`} type="number" min="1" max={maxQty || undefined} placeholder="e.g. 50" value={form.quantity} onChange={e => { set("quantity", e.target.value); setErrors(p => ({ ...p, quantity: "" })); }} />
            {errors.quantity && <span className="sv-error-msg">{errors.quantity}</span>}
          </div>

          <div className="sv-field-row" style={{ marginTop: "1rem" }}>
             <div className="sv-field">
              <label className="sv-label">Return Date <span className="sv-required">*</span></label>
              <input 
                className={`sv-input${errors.returnDate ? " sv-input--error" : ""}`} 
                type="date" 
                min={form.pickUpDate || MIN_RENTAL_DATE}
                value={form.returnDate} 
                onChange={e => { set("returnDate", e.target.value); setErrors(p => ({ ...p, returnDate: "" })); }} 
              />
              {errors.returnDate && <span className="sv-error-msg">{errors.returnDate}</span>}
            </div>
          </div>

          <div className="sv-field">
            <label className="sv-label">Additional Notes <span className="sv-optional">(Optional)</span></label>
            <textarea className="sv-textarea" placeholder="Delivery requests, condition requirements, etc." rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="sv-calendar-col">
          <div className="sv-field-section-label">Select Pick-up Date <span className="sv-required">*</span></div>
          <Calendar
            selectedDate={form.pickUpDate}
            blockedDates={equipment?.blockedDates || []}
            onSelectDate={(str) => { set("pickUpDate", str); setErrors(p => ({ ...p, pickUpDate: "" })); }}
          />
          {errors.pickUpDate && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{errors.pickUpDate}</span>}
        </div>
      </div>

      <div className="sv-form-actions">
        <button className="sv-btn-ghost" onClick={onBack}>Cancel</button>
        <button className="sv-btn-primary" onClick={handleSubmit}>Submit Request</button>
      </div>
    </div>
  );
}