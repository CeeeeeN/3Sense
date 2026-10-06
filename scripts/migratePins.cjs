const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

async function main() {
  console.log(DRY_RUN ? "DRY RUN - no changes will be made.\n" : "Migrating PINs...\n");

  const residents = await db.collectionGroup("residents").get();

  let withPin = 0;
  let migrated = 0;
  let alreadyInSecurity = 0;
  let emptyFieldCleaned = 0;

  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0 && !DRY_RUN) await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  for (const doc of residents.docs) {
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, "pinHash")) continue;

    const householdRef = doc.ref.parent.parent;
    if (!householdRef || householdRef.parent.id !== "households") continue;
    const householdID = householdRef.id;
    const secRef = db.collection("pinSecurity").doc(`${householdID}__${doc.id}`);
    const hash = typeof data.pinHash === "string" && data.pinHash ? data.pinHash : null;

    if (!hash) {
      batch.update(doc.ref, { pinHash: admin.firestore.FieldValue.delete() });
      ops++;
      emptyFieldCleaned++;
    } else {
      withPin++;
      const secSnap = await secRef.get();

      if (secSnap.exists && secSnap.data().pinHash) {
        alreadyInSecurity++;
      } else {
        batch.set(
          secRef,
          {
            pinHash: hash,
            pinFailedAttempts: 0,
            pinLockedUntil: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        ops++;
        migrated++;
      }

      batch.update(doc.ref, { pinHash: admin.firestore.FieldValue.delete() });
      ops++;
    }

    if (ops >= BATCH_SIZE) await flush();
  }
  await flush();

  console.log(`Residents scanned:               ${residents.size}`);
  console.log(`Residents with a PIN:            ${withPin}`);
  console.log(`  moved to pinSecurity:          ${migrated}`);
  console.log(`  already in pinSecurity:        ${alreadyInSecurity}`);
  console.log(`Empty pinHash fields removed:    ${emptyFieldCleaned}`);
  console.log(DRY_RUN ? "\nDry run complete. Re-run without --dry-run to apply." : "\nDone.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
