import React, { useState } from 'react';
import { doc, collection, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAlert } from '../context/AlertContext';
import { useQueryClient } from '@tanstack/react-query';
import { X, Save, User, MapPin, Mail, Tag, BookOpen, Home } from 'lucide-react';
import { logTransaction } from '../services/logger';

const generateResidentUID = () => {
  const year = new Date().getFullYear();
  const random8Digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `MAL-${year}-${random8Digits}`;
};

export default function AdminAddHouseholdPanel({ isOpen, onClose, adminName, adminRole }) {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const initialForm = {
    idNumber: "",
    firstName: "", lastName: "", middleName: "", suffix: "",
    birthDate: "", birthPlace: "", sex: "Male", gender: "", genderOther: "",
    civilStatus: "", religion: "", religionOther: "",
    citizenship: "Filipino", citizenshipOther: "", residingSinceYear: "",
    contactNumber: "", email: "",
    houseNumber: "", street: "", subdivision: "", province: "",
    categories: [],
    pwdStatus: "", disabilityType: "", disabilityTypeOther: "",
    educationAttainment: "", postGradLevel: "", educationStatus: "",
    occupation: "", employmentStatus: "",
    totalMembers: "1", householdClassification: ""
  };
  const [form, setForm] = useState(initialForm);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "contactNumber" || name === "residingSinceYear") {
      newValue = value.replace(/\D/g, '');
      if (name === "contactNumber") newValue = newValue.slice(0, 11);
      if (name === "residingSinceYear") newValue = newValue.slice(0, 4);
    }

    setForm({ ...form, [name]: newValue });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    const nameRegex = /^[a-zA-ZñÑ\s\-\.]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.firstName.trim()) newErrors.firstName = "Required.";
    else if (!nameRegex.test(form.firstName)) newErrors.firstName = "Invalid format.";
    
    if (!form.lastName.trim()) newErrors.lastName = "Required.";
    else if (!nameRegex.test(form.lastName)) newErrors.lastName = "Invalid format.";

    if (!form.contactNumber) newErrors.contactNumber = "Required.";
    else if (!/^09\d{9}$/.test(form.contactNumber)) newErrors.contactNumber = "Must be 11 digits starting with 09.";

    if (!form.email.trim()) newErrors.email = "Required for activation.";
    else if (!emailRegex.test(form.email)) newErrors.email = "Invalid email.";

    if (!form.birthDate) {
      newErrors.birthDate = "Required.";
    } else {
      const dob = new Date(form.birthDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob > today) newErrors.birthDate = "Cannot be in future.";
      if (dob.getFullYear() < 1900) newErrors.birthDate = "Invalid year.";
    }

    if (!form.birthPlace.trim()) newErrors.birthPlace = "Required.";
    if (!form.civilStatus) newErrors.civilStatus = "Required.";
    if (!form.residingSinceYear || form.residingSinceYear.length < 4) newErrors.residingSinceYear = "Required (YYYY).";
    
    if (!form.street.trim()) newErrors.street = "Required.";
    if (!form.province.trim()) newErrors.province = "Required.";
    
    if (form.categories.includes("PWD")) {
      if (!form.pwdStatus) newErrors.pwdStatus = "Required.";
      if (!form.disabilityType) newErrors.disabilityType = "Required.";
    }

    if (!form.educationAttainment) newErrors.educationAttainment = "Required.";
    if (!form.educationStatus) newErrors.educationStatus = "Required.";
    if (!form.employmentStatus) newErrors.employmentStatus = "Required.";
    
    if (!form.totalMembers || Number(form.totalMembers) < 1) newErrors.totalMembers = "Required.";
    if (!form.householdClassification) newErrors.householdClassification = "Required.";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showAlert("Validation Error", "Please check the highlighted fields for errors.");
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      const currentYearStr = String(new Date().getFullYear());
      const counterRef = doc(db, "counters", "household");
      let generatedHouseholdID = "";
      
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let maxCount = 0;

        if (!counterDoc.exists()) {
          maxCount = 1;
          transaction.set(counterRef, { currentYear: currentYearStr, count: 1 });
        } else {
          const data = counterDoc.data();
          if (data.currentYear === currentYearStr) {
            maxCount = (data.count || 0) + 1;
            transaction.update(counterRef, { count: maxCount });
          } else {
            maxCount = 1;
            transaction.update(counterRef, { currentYear: currentYearStr, count: 1 });
          }
        }
        generatedHouseholdID = `MAL-${currentYearStr}-${String(maxCount).padStart(5, "0")}`;
      });

      const dob = new Date(form.birthDate);
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) {
        calculatedAge--;
      }

      const genderResolved = form.gender === "Others" ? (form.genderOther || "Others") : form.gender;
      const religionResolved = form.religion === "Others" ? (form.religionOther || "Others") : form.religion;
      const citizenshipResolved = form.citizenship === "Others" ? (form.citizenshipOther || "Others") : form.citizenship;
      const disabilityResolved = form.disabilityType === "Others" ? (form.disabilityTypeOther || "Others") : form.disabilityType;

      const householdRef = doc(db, "households", generatedHouseholdID);
      
      await runTransaction(db, async (transaction) => {
         transaction.set(householdRef, {
          householdID: generatedHouseholdID,
          email: form.email.trim().toLowerCase(),
          houseNumber: form.houseNumber.trim(),
          street: form.street.trim(),
          subdivision: form.subdivision.trim(),
          barangay: "Malanday",
          city: "Valenzuela City",
          province: form.province.trim(),
          region: "NCR",
          totalMembers: Number(form.totalMembers), 
          householdClassification: form.householdClassification,
          createdAt: serverTimestamp(),
          activated: false,
          activatedAt: null,
          
          _pendingHeadData: {
            UID: generateResidentUID(), 
            idNumber: form.idNumber.trim(),
            firstName: form.firstName.trim(),
            middleName: form.middleName.trim(),
            lastName: form.lastName.trim(),
            suffix: form.suffix === "None" ? "" : form.suffix,
            birthDate: form.birthDate,
            age: calculatedAge,
            birthPlace: form.birthPlace.trim(),
            sex: form.sex,
            gender: genderResolved,
            genderOrientation: genderResolved,
            civilStatus: form.civilStatus,
            religion: religionResolved,
            citizenship: citizenshipResolved,
            contactNumber: Number(form.contactNumber),
            email: form.email.trim().toLowerCase(),
            residingSinceYear: form.residingSinceYear ? Number(form.residingSinceYear) : null,
            categories: form.categories,
            pwdStatus: form.pwdStatus,
            disabilityType: disabilityResolved,
            disabilityTypeOther: form.disabilityTypeOther,
            educationAttainment: form.educationAttainment === "Post Graduate" ? `${form.educationAttainment} - ${form.postGradLevel}` : form.educationAttainment,
            educationStatus: form.educationStatus,
            occupation: form.occupation.trim(),
            employmentStatus: form.employmentStatus,
            idImageUrl: "",
            selfieImageUrl: "",
            idImage: "",
            selfieImage: "",
          },
        });
      });

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`;
      try {
        await fetch("/api/resend-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Barangay 3S+ Malanday <noreply@3s-sense.site>",
            to: [form.email.trim().toLowerCase()],
            subject: "Your Barangay 3S+ Registration Has Been Approved",
            html: `<p>Hello ${fullName},</p><p>Your household registration has been manually approved by the Barangay Office.</p><p>Your Household ID is: <strong>${generatedHouseholdID}</strong></p><p>Please log in to the portal using this email address and click "Activate Account" to set your password and complete your profile.</p>`, 
          }),
        });
      } catch (err) {
        console.warn("Email endpoint skipped:", err.message);
      }

      queryClient.invalidateQueries({ queryKey: ['adminManage_residents'] });
      logTransaction(adminName, adminRole, "Created Household (Pending Act)", `Manually created unactivated household ${generatedHouseholdID} for ${fullName}`);
      
      await showAlert("Success", `Household ${generatedHouseholdID} created successfully. An activation email has been sent.`);
      setForm(initialForm);
      setErrors({});
      onClose();

    } catch (error) {
      console.error("Household creation failed: ", error);
      await showAlert("Error", "Failed to create household: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = (errorField) => ({
    width: '100%', padding: '8px 12px', borderRadius: '6px', fontSize: '0.9rem',
    border: errorField ? '1px solid #ef4444' : '1px solid #cbd5e1',
    background: errorField ? '#fef2f2' : 'white', outline: 'none'
  });
  const labelStyle = { display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '4px', fontWeight: 500 };
  const sectionHeaderStyle = { display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', margin: '0 0 16px 0', borderTop: '1px solid #e2e8f0', paddingTop: '24px' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1040, opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? 'auto' : 'none', transition: 'opacity 0.2s' }} />
      
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '600px', background: '#fff', zIndex: 1050, boxShadow: '-4px 0 20px rgba(0,0,0,0.15)', transform: isOpen ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Add Comprehensive Household</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          
          {/* PERSONAL INFO */}
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f766e', margin: '0 0 16px 0' }}><User size={18} /> Personal Information</h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>PhilSys Card Number (PCN) <span style={{color:'#94a3b8'}}>(Optional)</span></label>
            <input name="idNumber" value={form.idNumber} onChange={handleChange} placeholder="e.g. 1234-5678-9012-0000" style={inputStyle(false)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} style={inputStyle(errors.firstName)} />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} style={inputStyle(errors.lastName)} />
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} style={inputStyle(false)} />
            </div>
            <div>
              <label style={labelStyle}>Suffix</label>
              <select name="suffix" value={form.suffix} onChange={handleChange} style={inputStyle(false)}>
                <option value="">None</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Birth Date *</label>
              <input type="date" name="birthDate" max={todayStr} value={form.birthDate} onChange={handleChange} style={inputStyle(errors.birthDate)} />
            </div>
            <div>
              <label style={labelStyle}>Birth Place *</label>
              <input name="birthPlace" value={form.birthPlace} onChange={handleChange} style={inputStyle(errors.birthPlace)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Sex</label>
              <select name="sex" value={form.sex} onChange={handleChange} style={inputStyle(false)}>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Civil Status *</label>
              <select name="civilStatus" value={form.civilStatus} onChange={handleChange} style={inputStyle(errors.civilStatus)}>
                <option value="">Select status</option>
                <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option><option>Cohabitation</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Gender <span style={{color:'#94a3b8'}}>(Optional)</span></label>
              <select name="gender" value={form.gender} onChange={handleChange} style={inputStyle(false)}>
                <option value="">Select gender</option><option>Man</option><option>Woman</option><option>Non-binary</option><option>Prefer not to say</option><option>Others</option>
              </select>
              {form.gender === "Others" && <input name="genderOther" placeholder="Specify" value={form.genderOther} onChange={handleChange} style={{...inputStyle(false), marginTop: '8px'}} />}
            </div>
            <div>
              <label style={labelStyle}>Religion</label>
              <select name="religion" value={form.religion} onChange={handleChange} style={inputStyle(false)}>
                <option value="">Select religion</option><option>Roman Catholic</option><option>Islam</option><option>Iglesia ni Cristo</option><option>Evangelical</option><option>None</option><option>Others</option>
              </select>
              {form.religion === "Others" && <input name="religionOther" placeholder="Specify" value={form.religionOther} onChange={handleChange} style={{...inputStyle(false), marginTop: '8px'}} />}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Citizenship</label>
              <select name="citizenship" value={form.citizenship} onChange={handleChange} style={inputStyle(false)}>
                <option>Filipino</option><option>Dual Citizen</option><option>Foreign National</option><option>Naturalized Filipino</option><option>Others</option>
              </select>
              {form.citizenship === "Others" && <input name="citizenshipOther" placeholder="Specify" value={form.citizenshipOther} onChange={handleChange} style={{...inputStyle(false), marginTop: '8px'}} />}
            </div>
            <div>
              <label style={labelStyle}>Residing Since (Year) *</label>
              <input type="text" maxLength="4" placeholder="e.g. 2010" name="residingSinceYear" value={form.residingSinceYear} onChange={handleChange} style={inputStyle(errors.residingSinceYear)} />
            </div>
          </div>

          {/* CONTACT & ACCOUNT */}
          <h4 style={sectionHeaderStyle}><Mail size={18} /> Contact & Account Access</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Contact Number *</label>
              <input type="tel" name="contactNumber" placeholder="09XX XXX XXXX" value={form.contactNumber} onChange={handleChange} style={inputStyle(errors.contactNumber)} />
            </div>
            <div>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" name="email" placeholder="email@example.com" value={form.email} onChange={handleChange} style={inputStyle(errors.email)} />
            </div>
          </div>
          
          {/* ADDRESS */}
          <h4 style={sectionHeaderStyle}><MapPin size={18} /> Address</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>House / Unit No.</label>
              <input name="houseNumber" value={form.houseNumber} onChange={handleChange} style={inputStyle(false)} />
            </div>
            <div>
              <label style={labelStyle}>Street *</label>
              <input name="street" value={form.street} onChange={handleChange} style={inputStyle(errors.street)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Subdivision / Village</label>
              <input name="subdivision" value={form.subdivision} onChange={handleChange} style={inputStyle(false)} />
            </div>
            <div>
              <label style={labelStyle}>Province *</label>
              <input name="province" placeholder="e.g. Metro Manila" value={form.province} onChange={handleChange} style={inputStyle(errors.province)} />
            </div>
          </div>

          {/* CATEGORIES */}
          <h4 style={sectionHeaderStyle}><Tag size={18} /> Classifications</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            {["Student", "Senior Citizen", "Solo Parent", "OFW", "LGBT", "Indigenous People", "PWD"].map((cat) => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.categories.includes(cat)} onChange={() => toggleCategory(cat)} style={{ width: '16px', height: '16px', accentColor: '#0f766e' }} />
                {cat}
              </label>
            ))}
          </div>

          {form.categories.includes("PWD") && (
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>PWD Status *</label>
                  <select name="pwdStatus" value={form.pwdStatus} onChange={handleChange} style={inputStyle(errors.pwdStatus)}>
                    <option value="">Select status</option><option>Children with Disabilities</option><option>Person with Disabilities</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Disability Type *</label>
                  <select name="disabilityType" value={form.disabilityType} onChange={handleChange} style={inputStyle(errors.disabilityType)}>
                    <option value="">Select type</option><option>Physical Disability</option><option>Visual Disability</option><option>Hearing Disability</option><option>Speech Impairment</option><option>Others</option>
                  </select>
                </div>
              </div>
              {form.disabilityType === "Others" && (
                <div style={{ marginTop: '12px' }}>
                  <label style={labelStyle}>Specify Disability</label>
                  <input name="disabilityTypeOther" value={form.disabilityTypeOther} onChange={handleChange} style={inputStyle(false)} />
                </div>
              )}
            </div>
          )}

          {/* EDUCATION & EMPLOYMENT */}
          <h4 style={sectionHeaderStyle}><BookOpen size={18} /> Education & Employment</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Highest Attainment *</label>
              <select name="educationAttainment" value={form.educationAttainment} onChange={handleChange} style={inputStyle(errors.educationAttainment)}>
                <option value="">Select</option><option>Elementary</option><option>High School</option><option>College</option><option>Post Graduate</option><option>Vocational</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Education Status *</label>
              <select name="educationStatus" value={form.educationStatus} onChange={handleChange} style={inputStyle(errors.educationStatus)}>
                <option value="">Select</option><option>In School</option><option>Out of School Youth (OSY)</option><option>Out of School Children (OSC)</option><option>Graduate</option>
              </select>
            </div>
          </div>
          {form.educationAttainment === "Post Graduate" && (
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Post Graduate Level</label>
              <select name="postGradLevel" value={form.postGradLevel} onChange={handleChange} style={inputStyle(false)}>
                <option value="">Select</option><option>Masters</option><option>Doctorate</option>
              </select>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Occupation (If Applicable)</label>
              <input name="occupation" placeholder="e.g. Teacher" value={form.occupation} onChange={handleChange} style={inputStyle(false)} />
            </div>
            <div>
              <label style={labelStyle}>Employment Status *</label>
              <select name="employmentStatus" value={form.employmentStatus} onChange={handleChange} style={inputStyle(errors.employmentStatus)}>
                <option value="">Select</option><option>Employed</option><option>Unemployed</option>
              </select>
            </div>
          </div>

          {/* HOUSEHOLD DETAILS */}
          <h4 style={sectionHeaderStyle}><Home size={18} /> Household Details</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div>
              <label style={labelStyle}>Total Members *</label>
              <input type="number" name="totalMembers" min="1" value={form.totalMembers} onChange={handleChange} style={inputStyle(errors.totalMembers)} />
            </div>
            <div>
              <label style={labelStyle}>Classification *</label>
              <select name="householdClassification" value={form.householdClassification} onChange={handleChange} style={inputStyle(errors.householdClassification)}>
                <option value="">Select</option><option>Owned</option><option>Owned, Lot Rented</option><option>Rented</option><option>Rent-Free with Consent</option><option>Informal Settler</option>
              </select>
            </div>
          </div>

        </form>

        {/* ACTIONS */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => { setForm(initialForm); setErrors({}); onClose(); }} style={{ padding: '10px 18px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} style={{ padding: '10px 18px', background: '#0f766e', border: 'none', borderRadius: '6px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
            <Save size={18} /> {isSubmitting ? 'Processing...' : 'Create Account'}
          </button>
        </div>
      </div>
    </>
  );
}