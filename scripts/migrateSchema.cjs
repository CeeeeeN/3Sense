/**
 * Firestore Schema Migration Script
 * Run once with Firebase Admin SDK to backfill new fields and rename old ones.
 *
 * Usage:
 *   1. Place your Firebase service account JSON at: scripts/serviceAccountKey.json
 *   2. Run: node scripts/migrateSchema.js
 *
 * WARNING: Review and test against a staging Firestore before running on production.
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ─── HELPERS ────────────────────────────────────────────────────────────────
const BATCH_SIZE = 400;

async function batchWrite(updates) {
  let batch = db.batch();
  let count = 0;
  for (const { ref, data } of updates) {
    batch.update(ref, data);
    count++;
    if (count === BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
}

// ─── 1. households — add householdID field ───────────────────────────────────
async function migrateHouseholds() {
  console.log("\n[1/8] Migrating households…");
  const snap = await db.collection("households").get();
  const updates = snap.docs
    .filter((d) => !d.data().householdID)
    .map((d) => ({ ref: d.ref, data: { householdID: d.id } }));
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} household docs.`);
}

// ─── 2. facilities — name→facilityName, fullDescription→description, add facilityID
async function migrateFacilities() {
  console.log("\n[2/8] Migrating facilities…");
  const snap = await db.collection("facilities").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    if (!data.facilityID) patch.facilityID = d.id;
    if (data.name && !data.facilityName) {
      patch.facilityName = data.name;
    }
    if (data.fullDescription && !data.description) {
      patch.description = data.fullDescription;
    }
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} facility docs.`);
}

// ─── 3. documents — title→documentName, add documentID ──────────────────────
async function migrateDocuments() {
  console.log("\n[3/8] Migrating documents…");
  const snap = await db.collection("documents").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    if (!data.documentID) patch.documentID = d.id;
    if (data.title && !data.documentName) patch.documentName = data.title;
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} document type docs.`);
}

// ─── 4. document_requests — userID→residentID, rename documentId→documentID, add requestID
async function migrateDocumentRequests() {
  console.log("\n[4/8] Migrating document_requests…");
  const snap = await db.collection("document_requests").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    if (!data.requestID) patch.requestID = d.id;
    // Rename documentId → documentID
    if (data.documentId && !data.documentID) patch.documentID = data.documentId;
    // Move userID → residentID only if residentID not yet set
    if (data.userID && !data.residentID) patch.residentID = data.userID;
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} document_request docs.`);
}

// ─── 5. facility_reservations — userID→residentID, facilityId→facilityID, add reservationID
async function migrateFacilityReservations() {
  console.log("\n[5/8] Migrating facility_reservations…");
  const snap = await db.collection("facility_reservations").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    if (!data.reservationID) patch.reservationID = d.id;
    if (data.facilityId && !data.facilityID) patch.facilityID = data.facilityId;
    if (data.userID && !data.residentID) patch.residentID = data.userID;
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} facility_reservation docs.`);
}

// ─── 6. Feedback (old) → feedback (new) collection, userID→residentID ────────
async function migrateFeedbackCollection() {
  console.log("\n[6/8] Migrating Feedback → feedback…");
  const oldSnap = await db.collection("Feedback").get();
  if (oldSnap.empty) {
    console.log("  Old 'Feedback' collection is empty, skipping.");
    return;
  }

  let batch = db.batch();
  let count = 0;
  for (const d of oldSnap.docs) {
    const data = d.data();
    const newData = { ...data };
    // Replace userID with residentID
    if (data.userID && !data.residentID) newData.residentID = data.userID;
    delete newData.userID;

    const newRef = db.collection("feedback").doc(d.id);
    batch.set(newRef, newData, { merge: true });
    count++;
    if (count === BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }
  if (count > 0) await batch.commit();
  console.log(`  Copied ${oldSnap.size} docs from Feedback → feedback.`);
  console.log("  (Old 'Feedback' collection NOT deleted — verify and delete manually.)");
}

// ─── 7. announcements — add announcementID ───────────────────────────────────
async function migrateAnnouncements() {
  console.log("\n[7/8] Migrating announcements…");
  const snap = await db.collection("announcements").get();
  const updates = snap.docs
    .filter((d) => !d.data().announcementID)
    .map((d) => ({ ref: d.ref, data: { announcementID: d.id } }));
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} announcement docs.`);
}

// ─── 8. residents — remove pin field, add residentID+householdID, fix userID ──
async function migrateResidents() {
  console.log("\n[8/10] Migrating residents (remove pin, add residentID/householdID, fix userID)…");
  const hhSnap = await db.collection("households").get();
  let totalUpdated = 0;

  for (const hh of hhSnap.docs) {
    const householdID = hh.id;
    const hhData = hh.data();
    // The Firebase Auth UID is stored on the household doc as userID
    const hhAuthUID = hhData.userID || null;

    const residentsSnap = await db
      .collection("households")
      .doc(householdID)
      .collection("residents")
      .get();

    const updates = [];
    for (const r of residentsSnap.docs) {
      const data = r.data();
      const patch = {};

      // 1. Add residentID (Firestore doc ID) if missing
      if (!data.residentID) patch.residentID = r.id;

      // 2. Add householdID if missing
      if (!data.householdID) patch.householdID = householdID;

      // 3. Fix userID — must be the household's Firebase Auth UID, not the doc ID
      //    Old addMembers.js stored: userID = newMemberRef.id (wrong — was the doc ID)
      //    Correct value: userID = hhAuthUID (shared across all household members)
      if (hhAuthUID && data.userID !== hhAuthUID) {
        patch.userID = hhAuthUID;
      }

      // 4. Remove legacy pin field
      if ("pin" in data) patch.pin = admin.firestore.FieldValue.delete();

      if (Object.keys(patch).length) updates.push({ ref: r.ref, data: patch });
    }
    await batchWrite(updates);
    totalUpdated += updates.length;
  }

  console.log(`  Updated ${totalUpdated} resident docs across all households.`);
}

// ─── 9. feedback — PascalCase → camelCase field migration ────────────────────
async function migrateFeedbackFields() {
  console.log("\n[9/10] Migrating feedback fields to camelCase…");
  const snap = await db.collection("feedback").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    // Only patch if old PascalCase fields still exist
    if (data.ReferenceID  !== undefined && !data.referenceID)   patch.referenceID  = data.ReferenceID;
    if (data.FacilityID   !== undefined && !data.facilityID)    patch.facilityID   = data.FacilityID;
    if (data.FacilityName !== undefined && !data.facilityName)  patch.facilityName = data.FacilityName;
    if (data.Category     !== undefined && !data.category)      patch.category     = data.Category;
    if (data.Rating       !== undefined && !data.rating)        patch.rating       = data.Rating;
    if (data.Comment      !== undefined && !data.comment)       patch.comment      = data.Comment;
    if (data.Status       !== undefined && !data.status)        patch.status       = data.Status;
    if (data.CreatedAt    !== undefined && !data.createdAt)     patch.createdAt    = data.CreatedAt;
    if (data.UserName     !== undefined && !data.userName)      patch.userName     = data.UserName;
    if (data.ImageUrl     !== undefined && !data.imageUrl)      patch.imageUrl     = data.ImageUrl;
    if (data.Severity     !== undefined && !data.severity)      patch.severity     = data.Severity;
    if (data.Sentiment    !== undefined && !data.sentiment)     patch.sentiment    = data.Sentiment;
    if (data.Confidence   !== undefined && !data.confidence)    patch.confidence   = data.Confidence;
    if (data.HybridScore  !== undefined && !data.hybridScore)   patch.hybridScore  = data.HybridScore;
    if (data.TextScore    !== undefined && !data.textScore)     patch.textScore    = data.TextScore;
    if (data.DetectedIssue    !== undefined && !data.detectedIssue)    patch.detectedIssue    = data.DetectedIssue;
    if (data.IssueConfidence  !== undefined && !data.issueConfidence)  patch.issueConfidence  = data.IssueConfidence;
    if (data.AdminNotes   !== undefined && !data.adminNotes)    patch.adminNotes   = data.AdminNotes;
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} feedback docs to camelCase.`);
}

// ─── 10. user_notifications — memberID → residentID, add userNotificationID ──
async function migrateUserNotifications() {
  console.log("\n[10/11] Migrating user_notifications…");
  const snap = await db.collection("user_notifications").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    if (!data.userNotificationID) patch.userNotificationID = d.id;
    // Rename memberID → residentID
    if (data.memberID && !data.residentID) patch.residentID = data.memberID;
    // Remove the old memberID field
    if ("memberID" in data) patch.memberID = admin.firestore.FieldValue.delete();
    
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} user_notification docs.`);
}

// ─── 11. qr_scans — userID → residentID ──────────────────────────────────────
async function migrateQRScans() {
  console.log("\n[11/11] Migrating qr_scans…");
  const snap = await db.collection("qr_scans").get();
  const updates = [];
  for (const d of snap.docs) {
    const data = d.data();
    const patch = {};
    // Keep userID. Just copy it over to residentID if it's missing.
    // The previous run already did this, but we'll leave it for completeness.
    if (data.userID && !data.residentID) patch.residentID = data.userID;
    if (Object.keys(patch).length) updates.push({ ref: d.ref, data: patch });
  }
  await batchWrite(updates);
  console.log(`  Updated ${updates.length} qr_scan docs.`);
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("Starting Firestore schema migration…");
    await migrateHouseholds();
    await migrateFacilities();
    await migrateDocuments();
    await migrateDocumentRequests();
    await migrateFacilityReservations();
    await migrateFeedbackCollection();
    await migrateAnnouncements();
    await migrateResidents();
    await migrateFeedbackFields();
    await migrateUserNotifications();
    await migrateQRScans();
    console.log("\n✅ Migration complete!");
  } catch (err) {
    console.error("\n❌ Migration failed:", err);
    process.exit(1);
  }
})();
