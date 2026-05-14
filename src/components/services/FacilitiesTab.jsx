import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { submitFacilityReservation } from "../../services/services";
import { createNotification } from "../../services/notifications";
import { BuildingIcon, ChevronRightIcon, ChevronLeftIcon, ServiceInfoIcon, ServiceCheckCircleIcon, ServiceClockIcon } from "../Icons";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const to12h = (t) => {
  if (!t) return t;
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${m} ${suffix}`;
};

function dateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

const MIN_RESERVATION_DATE = dateOffset(3);

function isFullyCovered(approvedOnDate, openTime, closeTime) {
  if (!openTime || !closeTime || !approvedOnDate.length) return false;
  const intervals = approvedOnDate
    .map(r => ({ s: r.startTime, e: r.endTime }))
    .filter(r => r.s && r.e)
    .sort((a, b) => a.s.localeCompare(b.s));
  let covered = openTime;
  for (const iv of intervals) {
    if (iv.s > covered) break;
    if (iv.e > covered) covered = iv.e;
    if (covered >= closeTime) return true;
  }
  return false;
}

function AdvanceBookingBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      background: "#eff6ff",
      border: "1px solid #93c5fd",
      borderRadius: "10px",
      padding: "14px 16px",
      marginBottom: "18px",
      fontSize: "14px",
      color: "#1e40af",
    }}>
      {/* Calendar/clock icon */}
      <svg style={{ flexShrink: 0, marginTop: "1px" }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
      <div style={{ flex: 1 }}>
        <strong style={{ display: "block", marginBottom: "2px", color: "#1e3a8a" }}>
          Advance Booking Required
        </strong>
        Facility reservations must be submitted at least{" "}
        <strong>3 days before</strong> your intended date of use. Same-day
        and next-day bookings are not accepted. Please plan accordingly.
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss reminder"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1e40af",
          padding: "0",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export default function FacilitiesTab({ userData, householdID, userName, userID }) {
  const [facilities, setFacilities] = useState([]);
  const [reservationFacility, setReservationFacility] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "facilities"), snapshot => {
      setFacilities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  return (
    <>
      {/* ── Advance booking reminder shown on the facility list ── */}
      <AdvanceBookingBanner />

      <div className="sv-facilities-list">
        {facilities.map(f => (
          <div key={f.id} className="sv-facility-card">
            <div className="sv-facility-card__left">
              <div className="sv-facility-card__icon-wrap"><BuildingIcon /></div>
              <div>
                <div className="sv-facility-card__title">{f.facilityName || f.name || f.title}</div>
                <div className="sv-facility-card__meta">
                  <span>{f.capacity ? `Up to ${f.capacity} persons` : ""}</span>
                  <span className="sv-facility-card__dot" />
                  <span>{f.openTime && f.closeTime ? (() => {
                    const fmt = (t) => { if (!t) return ''; const [h, m] = t.split(':'); const hh = parseInt(h, 10); const s = hh >= 12 ? 'PM' : 'AM'; const h12 = hh % 12 || 12; return `${h12}:${m} ${s}`; };
                    return fmt(f.openTime) + ' – ' + fmt(f.closeTime);
                  })() : f.hours}</span>
                </div>
                <div className="sv-facility-card__desc">{f.description || f.fullDescription || f.desc}</div>
              </div>
            </div>
            <div className="sv-facility-card__right">
              <span className={`sv-avail-badge${f.available ? " sv-avail-badge--yes" : " sv-avail-badge--no"}`}>
                <span className="sv-avail-dot" />{f.available ? "Available" : "Unavailable"}
              </span>
              {f.available && (
                <button className="sv-btn-primary sv-btn-sm" onClick={() => setReservationFacility(f)}>Reserve <ChevronRightIcon /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {reservationFacility && (
        <div className="rsv-overlay" onClick={e => e.target === e.currentTarget && setReservationFacility(null)}>
          <div className="rsv-modal">
            <button className="rsv-modal__close" onClick={() => setReservationFacility(null)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <ReservationForm
              facility={reservationFacility}
              onBack={() => setReservationFacility(null)}
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

function Calendar({ selectedDate, onSelectDate, fullyBookedDates = [], blockedDates = [] }) {
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
    if (str < MIN_RESERVATION_DATE) return "past";
    if (blockedDates.includes(str)) return "past";
    if (fullyBookedDates.includes(str)) return "Reserved";
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
          const isBlocked = status === "past" || status === "Reserved";
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
        <span className="sv-legend-item"><span className="sv-legend-dot sv-legend-dot--reserved" />Fully Reserved</span>
      </div>

      {/* ── Inline 3-day rule note under calendar — mobile-responsive fix ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",   /* changed from "center" so icon stays top-aligned on wrap */
        gap: "6px",
        marginTop: "10px",
        fontSize: "12px",
        color: "#1e40af",
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        borderRadius: "6px",
        padding: "7px 10px",
      }}>
        <svg
          style={{ flexShrink: 0, marginTop: "1px" }}   /* nudge icon down 1px to align with first text line */
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        {/* flex: 1 lets the text take all remaining width and wrap naturally */}
        <span style={{ flex: 1, lineHeight: "1.5" }}>
          Bookings must be made at least <strong>3 days in advance</strong>. Greyed-out dates are unavailable.
        </span>
      </div>
    </div>
  );
}

function ReservationForm({ onBack, facility, userData, householdID, userName, userID }) {
  const facilityName = facility?.name || facility?.title || "Barangay Multi-Purpose Hall";
  const facilityDesc = facility
    ? `Reserve a time slot for ${facility?.name || facility?.title}. Approval is required before confirmation.`
    : "Reserve a facility for your event. Approval is required before confirmation.";

  const [approvedReservations, setApprovedReservations] = useState([]);
  const [allActiveReservations, setAllActiveReservations] = useState([]);
  const [fullyBookedDates, setFullyBookedDates] = useState([]);

  useEffect(() => {
    if (!facility) return;
    const unsub = onSnapshot(collection(db, "facility_reservations"), (snapshot) => {
      const approved = [];
      const allActive = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (String(data.facilityId) === String(facility.id) && data.date) {
          const stat = (data.status || "").toLowerCase();
          if (stat === "rejected") return;
          const entry = { id: doc.id, date: data.date, startTime: data.startTime, endTime: data.endTime, status: stat };
          allActive.push(entry);
          if (stat === "approved") approved.push(entry);
        }
      });
      setAllActiveReservations(allActive);
      setApprovedReservations(approved);

      const openTime = facility?.openTime;
      const closeTime = facility?.closeTime;
      if (openTime && closeTime) {
        const dateMap = {};
        approved.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date] = [];
          dateMap[r.date].push(r);
        });
        const booked = Object.keys(dateMap).filter(date =>
          isFullyCovered(dateMap[date], openTime, closeTime)
        );
        setFullyBookedDates(booked);
      } else {
        setFullyBookedDates([]);
      }
    });
    return () => unsub();
  }, [facility]);

  const [form, setForm] = useState({
    fullName: "", email: "", contactNumber: "",
    purpose: "", date: "", startTime: "", endTime: "",
    attendees: "", notes: ""
  });
  const [refNum, setRefNum] = useState("");
  const [dateStatus, setDateStatus] = useState(null);
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

  const hasApprovedOverlapOnDate = (date, startTime, endTime) => {
    if (!date || !startTime || !endTime) return false;
    return approvedReservations.some(r =>
      r.date === date && startTime < r.endTime && r.startTime < endTime
    );
  };

  const validate = () => {
    const e = {};
    if (!form.email?.trim()) e.email = "Email is required.";
    if (!form.purpose.trim()) e.purpose = "Purpose of use is required.";
    if (!form.date) e.date = "Please select a date.";
    if (!form.startTime) e.startTime = "Start time is required.";
    if (!form.endTime) e.endTime = "End time is required.";
    if (!form.attendees || String(form.attendees).trim() === "")
      e.attendees = "Estimated number of attendees is required.";

    if (form.date && form.date < MIN_RESERVATION_DATE) {
      e.date = "Reservations must be made at least 3 days in advance. Please select a later date.";
    }

    if (form.startTime && form.endTime && form.startTime >= form.endTime)
      e.endTime = "End time must be after start time.";

    const open = facility?.openTime;
    const close = facility?.closeTime;
    if (open && form.startTime && form.startTime < open)
      e.startTime = `Start time cannot be before opening time (${to12h(open)}).`;
    if (close && form.startTime && form.startTime > close)
      e.startTime = `Start time cannot be after closing time (${to12h(close)}).`;
    if (open && form.endTime && form.endTime < open)
      e.endTime = `End time cannot be before opening time (${to12h(open)}).`;
    if (close && form.endTime && form.endTime > close)
      e.endTime = `End time cannot be after closing time (${to12h(close)}).`;

    const capacityNum = facility?.capacity ? parseInt(String(facility.capacity).replace(/\D/g, ""), 10) : null;
    const attendeesNum = form.attendees ? parseInt(form.attendees, 10) : null;
    if (capacityNum && attendeesNum && attendeesNum > capacityNum)
      e.attendees = `Number of attendees exceeds facility capacity (max: ${capacityNum}).`;

    const extra = facility?.customFields || [];
    extra.forEach(f => {
      if (!f.required) return;
      if (f.type === "checkbox") { if (!form[f.id]) e[f.id] = "You must confirm this to proceed."; }
      else { if (!form[f.id]?.toString().trim()) e[f.id] = "Required."; }
    });
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    const hasOverlap = allActiveReservations.some(r => {
      if (r.date !== form.date) return false;
      return form.startTime < r.endTime && r.startTime < form.endTime;
    });
    if (hasOverlap) {
      setErrors({ timeOverlap: "The selected time slot conflicts with an existing reservation. Please select a different time." });
      return;
    }

    try {
      const customData = {};
      (facility?.customFields || []).forEach(f => {
        if (form[f.id] !== undefined) customData[f.label] = form[f.id];
      });
      const generatedRef = await submitFacilityReservation(
        householdID,
        userData?.residentID || userID || "",
        userName || "Unknown",
        facility,
        form,
        customData
      );
      setRefNum(generatedRef || "");
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit reservation:", error);
      setErrors({ submit: "Failed to submit. Please try again." });
    }
  };

  if (submitted) return (
    <div className="sv-success-wrap">
      <div className="sv-success-icon"><ServiceCheckCircleIcon /></div>
      <h3 className="sv-success-title">Reservation Submitted</h3>
      <p className="sv-success-sub">Your reservation request has been submitted and is awaiting barangay approval.</p>
      <div className="dr-ref-box" style={{ margin: '1.5rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <span className="dr-ref-label" style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Reference Number</span>
        <span className="dr-ref-num" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '2px' }}>{refNum}</span>
      </div>
      <div className="sv-status-badge"><ServiceClockIcon /> Pending Approval</div>
      <button className="sv-btn-outline" style={{ marginTop: '1rem' }} onClick={onBack}>Close</button>
    </div>
  );

  const showApprovedOverlapWarning =
    form.date && form.startTime && form.endTime &&
    hasApprovedOverlapOnDate(form.date, form.startTime, form.endTime);

  return (
    <div className="sv-form-wrap">
      <div className="sv-form-header">
        <div className="sv-form-header-icon"><BuildingIcon /></div>
        <div>
          <div className="sv-form-header-title">{facilityName} Reservation</div>
          <div className="sv-form-header-desc">{facilityDesc}</div>
        </div>
      </div>

      {/* ── Advance booking reminder inside the modal form ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        background: "#eff6ff",
        border: "1px solid #93c5fd",
        borderRadius: "8px",
        padding: "10px 14px",
        margin: "0 0 16px 0",
        fontSize: "13px",
        color: "#1e40af",
      }}>
        <svg style={{ flexShrink: 0, marginTop: "1px" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span style={{ flex: 1, lineHeight: "1.5" }}>
          Reservations must be submitted at least{" "}
          <strong>3 days before</strong> your intended date. The earliest available date is{" "}
          <strong>{MIN_RESERVATION_DATE}</strong>.
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
            <input
              className={`sv-input${errors.email ? " sv-input--error" : ""}`}
              type="email" placeholder="your@email.com" value={form.email}
              onChange={e => { set("email", e.target.value); setErrors(p => ({ ...p, email: "" })); }}
            />
            {errors.email && <span className="sv-error-msg">{errors.email}</span>}
          </div>

          <div className="sv-field-section-label" style={{ marginTop: "1.5rem" }}>Reservation Details</div>
          <div className="sv-field">
            <label className="sv-label">Purpose of Use <span className="sv-required">*</span></label>
            <input className={`sv-input${errors.purpose ? " sv-input--error" : ""}`} placeholder="e.g. Birthday celebration, community meeting..." value={form.purpose} onChange={e => { set("purpose", e.target.value); setErrors(p => ({ ...p, purpose: "" })); }} />
            {errors.purpose && <span className="sv-error-msg">{errors.purpose}</span>}
          </div>
          <div className="sv-field-row">
            <div className="sv-field">
              <label className="sv-label">Start Time <span className="sv-required">*</span></label>
              <input
                className={`sv-input${errors.startTime ? " sv-input--error" : ""}`}
                type="time" value={form.startTime}
                min={facility?.openTime || undefined}
                max={facility?.closeTime || undefined}
                onChange={e => { set("startTime", e.target.value); setErrors(p => ({ ...p, startTime: "" })); }}
              />
              {errors.startTime && <span className="sv-error-msg">{errors.startTime}</span>}
            </div>
            <div className="sv-field">
              <label className="sv-label">End Time <span className="sv-required">*</span></label>
              <input
                className={`sv-input${errors.endTime ? " sv-input--error" : ""}`}
                type="time" value={form.endTime}
                min={facility?.openTime || undefined}
                max={facility?.closeTime || undefined}
                onChange={e => { set("endTime", e.target.value); setErrors(p => ({ ...p, endTime: "" })); }}
              />
              {errors.endTime && <span className="sv-error-msg">{errors.endTime}</span>}
            </div>
          </div>
          {(facility?.openTime && facility?.closeTime) && (
            <div style={{ fontSize: '0.78rem', color: '#5e7a99', marginTop: '-0.25rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Facility hours: <strong>{to12h(facility.openTime)}</strong> – <strong>{to12h(facility.closeTime)}</strong>
            </div>
          )}
          <div className="sv-field">
            <label className="sv-label">
              Estimated Number of Attendees <span className="sv-required">*</span>
              {facility?.capacity && (
                <span style={{ fontWeight: 400, fontSize: '0.8rem', color: '#64748b', marginLeft: '6px' }}>
                  (Max: {facility.capacity})
                </span>
              )}
            </label>
            <input
              className={`sv-input${errors.attendees ? " sv-input--error" : ""}`}
              type="number" placeholder="e.g. 50" min="1" value={form.attendees}
              onChange={e => { set("attendees", e.target.value); setErrors(p => ({ ...p, attendees: "" })); }}
            />
            {errors.attendees && <span className="sv-error-msg">{errors.attendees}</span>}
          </div>
          <div className="sv-field">
            <label className="sv-label">Additional Notes <span className="sv-optional">(Optional)</span></label>
            <textarea className="sv-textarea" placeholder="Any special setup requirements, equipment needed, etc." rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        {facility?.customFields?.length > 0 && (
          <div className="sv-fields" style={{ marginTop: "1.5rem" }}>
            <div className="sv-field-section-label">Additional Information</div>
            <div className="dr-field-row dr-field-row--wrap">
              {facility.customFields.map(f => {
                if (f.type === "checkbox") {
                  return (
                    <div className="dr-field dr-field--full" key={f.id}>
                      <label className={`dr-checkbox-label${errors[f.id] ? " dr-checkbox-label--error" : ""}`}>
                        <input type="checkbox" checked={!!form[f.id]} onChange={e => set(f.id, e.target.checked)} className="dr-checkbox" />
                        <span>{f.label} {f.required && <span className="sv-required">*</span>}</span>
                      </label>
                      {errors[f.id] && <span className="sv-error-msg">{errors[f.id]}</span>}
                    </div>
                  );
                }
                return (
                  <div className="dr-field" key={f.id}>
                    <label className="sv-label">{f.label} {f.required && <span className="sv-required">*</span>}</label>
                    <input className={`sv-input${errors[f.id] ? " sv-input--error" : ""}`} type={f.type || "text"} value={form[f.id] || ""} placeholder={f.placeholder || ""} onChange={e => set(f.id, e.target.value)} />
                    {errors[f.id] && <span className="sv-error-msg">{errors[f.id]}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="sv-calendar-col">
          <div className="sv-field-section-label">Select Date <span className="sv-required">*</span></div>
          <Calendar
            selectedDate={form.date}
            fullyBookedDates={fullyBookedDates}
            blockedDates={facility?.blockedDates || []}
            onSelectDate={(str, status) => { set("date", str); setDateStatus(status); setErrors(p => ({ ...p, date: "" })); }}
          />
          {errors.date && <span className="sv-error-msg" style={{ marginTop: "0.5rem", display: "block" }}>{errors.date}</span>}
          {errors.timeOverlap && (
            <div className="sv-error-msg" style={{ marginTop: "0.5rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "0.375rem", color: "#b91c1c" }}>
              {errors.timeOverlap}
            </div>
          )}
          {showApprovedOverlapWarning && !errors.timeOverlap && (
            <div className="sv-cal-warning sv-cal-warning--pending">
              <ServiceInfoIcon /> This time slot overlaps with an existing approved reservation. Please choose a different time.
            </div>
          )}
        </div>
      </div>

      <div className="sv-form-actions">
        <button className="sv-btn-ghost" onClick={onBack}>Cancel</button>
        <button className="sv-btn-primary" onClick={handleSubmit}>Submit Reservation</button>
      </div>
    </div>
  );
}