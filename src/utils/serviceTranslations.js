// Localization dictionary and helpers for Document, Facility, and Equipment services
export const CALENDAR_DAYS = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  fil: ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"],
};

export const CALENDAR_MONTHS = {
  en: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ],
  fil: [
    "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo",
    "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"
  ],
};

export const PURPOSE_TRANSLATIONS = {
  "Employment": "Aplikasyon sa Trabaho",
  "Employment / Job Application": "Aplikasyon sa Trabaho",
  "Job Application": "Aplikasyon sa Trabaho",
  "Local Employment": "Lokal na Trabaho",
  "Overseas Employment": "Trabaho sa Ibang Bansa",
  "Scholarship": "Iskolarship",
  "Scholarship / School Requirement": "Pangangailangan sa Paaralan / Iskolarship",
  "School Requirement": "Pangangailangan sa Paaralan",
  "Financial Assistance": "Tulong Pinansyal",
  "Medical Assistance": "Tulong Medikal",
  "Burial Assistance": "Tulong sa Pagpapalibing",
  "Educational Assistance": "Tulong sa Pag-aaral",
  "Bank Requirement": "Pangangailangan sa Bangko",
  "Bank Requirement / Loan": "Pangangailangan sa Bangko / Loan",
  "Proof of Residency": "Patunay ng Paninirahan",
  "Postal ID": "Pangangailangan para sa Postal ID",
  "Postal ID Requirement": "Pangangailangan para sa Postal ID",
  "Police Clearance": "Pangangailangan para sa Police Clearance",
  "Police Clearance Requirement": "Pangangailangan para sa Police Clearance",
  "NBI Clearance": "Pangangailangan para sa NBI Clearance",
  "NBI Clearance Requirement": "Pangangailangan para sa NBI Clearance",
  "Driver's License": "Lisensya sa Pagmamaneho",
  "Passport Application": "Aplikasyon sa Pasaporte",
  "Travel / Visa": "Biyahe / Visa",
  "Community Cleanup": "Paglilinis ng Komunidad (Community Cleanup)",
  "Sportsfest": "Pampalakasang Palaro (Sportsfest)",
  "Birthday": "Pagdiriwang ng Kaarawan",
  "Birthday celebration": "Pagdiriwang ng Kaarawan",
  "Birthday Celebration": "Pagdiriwang ng Kaarawan",
  "Wake / Funeral": "Lamay / Burol",
  "Funeral": "Lamay / Burol",
  "Meeting / Assembly": "Pagpupulong / Asembleya",
  "Community Meeting": "Pagpupulong sa Komunidad",
  "Wedding": "Kasal",
  "Other": "Iba pa",
};

// Names and descriptions of documents, facilities, and equipment remain untranslated as requested
export function localizeDocName(name) {
  return name || "";
}

export function localizeDocDesc(desc) {
  return desc || "";
}

export function localizeFacilityName(name) {
  return name || "";
}

export function localizeFacilityDesc(desc) {
  return desc || "";
}

export function localizeEquipmentName(name) {
  return name || "";
}

export function localizeEquipmentDesc(desc) {
  return desc || "";
}

export function localizePurpose(purpose, language) {
  if (!purpose || language !== "fil") return purpose;
  return PURPOSE_TRANSLATIONS[purpose] || purpose;
}

export function localizeFee(fee, language) {
  if (!fee || language !== "fil") return fee;
  if (/^free$/i.test(String(fee).trim())) return "Libre";
  return fee;
}

export function localizeDays(days, language) {
  if (!days || language !== "fil") return days;
  const d = String(days).toLowerCase();
  if (d.includes("same day")) return "Sa mismong araw";
  if (d.includes("business day") || d.includes("working day")) {
    return days.replace(/business days?|working days?/gi, "araw ng trabaho");
  }
  if (d.includes("day")) {
    return days.replace(/days?/gi, "araw");
  }
  return days;
}

export function localizeReminder(text, language) {
  if (!text || language !== "fil") return text;
  const trimmed = String(text).trim();
  const upper = trimmed.toUpperCase();

  if (upper === "THIS CERTIFICATION IS FREE OF CHARGE." || upper === "THIS CERTIFICATION IS FREE OF CHARGE") {
    return "ANG SERTIPIKASYONG ITO AY WALANG BAYAD.";
  }
  if (upper === "THIS DOCUMENT IS FREE OF CHARGE." || upper === "THIS DOCUMENT IS FREE OF CHARGE") {
    return "ANG DOKUMENTONG ITO AY WALANG BAYAD.";
  }
  if (upper === "FREE OF CHARGE." || upper === "FREE OF CHARGE") {
    return "WALANG BAYAD.";
  }
  if (/free of charge/i.test(trimmed)) {
    return trimmed.replace(/free of charge/gi, "walang bayad");
  }
  return text;
}
