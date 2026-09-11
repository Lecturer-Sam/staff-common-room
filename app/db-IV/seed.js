import db from './db'

/**
 * NACCA QuizBank — database seeder
 *
 * Runs ONCE on first boot (or after a manual reset).
 * Uses a lightweight version-gate stored in localStorage so subsequent
 * app loads skip the fetch entirely.
 *
 * Usage:
 *   import { seedIfNeeded } from './db/seed'
 *   await seedIfNeeded()          // call this before rendering the app
 *
 * Force a re-seed (dev only):
 *   localStorage.removeItem('nacca_seed_v')
 *   then reload the page
 */

const SEED_VERSION = '1.0.0'         // bump this when the data files change
const SEED_KEY     = 'nacca_seed_v'  // localStorage key

/** Returns true when the DB is already populated at the current version. */
function isSeeded() {
  return localStorage.getItem(SEED_KEY) === SEED_VERSION
}

/** Mark the DB as seeded so subsequent loads skip the work. */
function markSeeded() {
  localStorage.setItem(SEED_KEY, SEED_VERSION)
}

/**
 * Fetch a JSON file from /public/data/.
 * Throws a clear error if the response is not OK.
 */
async function fetchJSON(path) {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

/**
 * Main entry point — seeds the database if it has not been seeded yet.
 *
 * @param {object}   [opts]
 * @param {boolean}  [opts.force=false]   Force re-seed even if already seeded.
 * @param {Function} [opts.onProgress]    Called with a status string as seeding progresses.
 * @returns {Promise<{ seeded: boolean, counts: object }>}
 */
export async function seedIfNeeded({ force = false, onProgress = () => {} } = {}) {
  if (!force && isSeeded()) {
    return { seeded: false, counts: {} }
  }

  onProgress('Fetching curriculum data…')

  // Fetch both files in parallel
  const [curriculumData, questionsData] = await Promise.all([
    fetchJSON('/data/curriculum.json'),
    fetchJSON('/data/questions.json'),
  ])

  const {
    classes,
    subjects,
    strands,
    subStrands,
    contentStandards,
  } = curriculumData

  const { items: questions } = questionsData

  onProgress('Writing to IndexedDB…')

  // Single transaction — all-or-nothing bulk insert.
  // bulkPut replaces existing rows, so re-seeding is safe.
  await db.transaction(
    'rw',
    db.classes,
    db.subjects,
    db.strands,
    db.subStrands,
    db.contentStandards,
    db.questions,
    async () => {
      await db.classes.bulkPut(classes)
      await db.subjects.bulkPut(subjects)
      await db.strands.bulkPut(strands)
      await db.subStrands.bulkPut(subStrands)
      await db.contentStandards.bulkPut(contentStandards)
      await db.questions.bulkPut(questions)
    },
  )

  markSeeded()

  const counts = {
    classes:          classes.length,
    subjects:         subjects.length,
    strands:          strands.length,
    subStrands:       subStrands.length,
    contentStandards: contentStandards.length,
    questions:        questions.length,
  }

  onProgress(`Seeded: ${counts.questions} questions across ${counts.contentStandards} standards.`)

  return { seeded: true, counts }
}

/**
 * Clears the seed flag and wipes all curriculum + question tables.
 * Leaves the `attempts` table intact so user history is preserved.
 *
 * Useful during development when the data files change.
 */
export async function resetSeed() {
  localStorage.removeItem(SEED_KEY)

  await db.transaction(
    'rw',
    db.classes,
    db.subjects,
    db.strands,
    db.subStrands,
    db.contentStandards,
    db.questions,
    async () => {
      await Promise.all([
        db.classes.clear(),
        db.subjects.clear(),
        db.strands.clear(),
        db.subStrands.clear(),
        db.contentStandards.clear(),
        db.questions.clear(),
      ])
    },
  )
}
