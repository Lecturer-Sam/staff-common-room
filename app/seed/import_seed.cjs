/**
 * One-time Firestore seed for curriculum reference data.
 *
 * Setup:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Save as serviceAccountKey.json next to this file (never commit it — add to .gitignore)
 *   3. yarn add firebase-admin   (or run from a scripts/ folder)
 *   4. node import_seed.js
 *
 * Idempotent: uses set() with fixed doc IDs, safe to re-run.
 */
const admin = require("firebase-admin");
const subjects = require("./curriculum_subjects.json");
const indicators = require("./curriculum_indicators.json");

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json")),
});
const db = admin.firestore();

async function importAll() {
  // Subjects (8 docs)
  let batch = db.batch();
  for (const s of subjects) {
    batch.set(db.collection("curriculum_subjects").doc(s.id), s);
  }
  await batch.commit();
  console.log(`Imported ${subjects.length} subjects`);

  // Indicators (289 docs) — batches of 400 (limit is 500)
  let count = 0;
  batch = db.batch();
  for (const ind of indicators) {
    batch.set(db.collection("curriculum_indicators").doc(ind.id), ind);
    if (++count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Imported ${indicators.length} indicators`);
}

importAll().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});