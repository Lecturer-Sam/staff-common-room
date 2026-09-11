import { db } from './dexie'
import { curriculumSchema, questionPackSchema } from '../lib/validators'

export const SEED_KEY = 'nacca_seed_v' // guide's Task 7 + cheatsheet reference this exact key — keep it even though the product is renamed

const ALL_TABLES = [db.classes, db.subjects, db.strands, db.subStrands, db.contentStandards, db.questions, db.meta]

export async function seedIfStale(force = false) {
  const alreadySeeded = localStorage.getItem(SEED_KEY)
  const dbEmpty = (await db.classes.count()) === 0

  if (!force && alreadySeeded && !dbEmpty) {
    return { seeded: false }
  }

  const [curriculumRaw, packRaw] = await Promise.all([
    fetch('/curriculum.json').then((r) => { if (!r.ok) throw new Error(`curriculum.json → HTTP ${r.status}`); return r.json() }),
    fetch('/questions.json').then((r) => { if (!r.ok) throw new Error(`questions.json → HTTP ${r.status}`); return r.json() }),
  ])

  // Validate BEFORE touching the database — a bad pack must never wipe a good one
  const curriculum = curriculumSchema.parse(curriculumRaw)
  const pack = questionPackSchema.parse(packRaw)

  await db.transaction('rw', ALL_TABLES, async () => {
    await Promise.all(ALL_TABLES.map((t) => (t === db.meta ? t.clear() : t.clear())))
    await db.classes.bulkPut(curriculum.classes)
    await db.subjects.bulkPut(curriculum.subjects)
    await db.strands.bulkPut(curriculum.strands)
    await db.subStrands.bulkPut(curriculum.subStrands)
    await db.contentStandards.bulkPut(curriculum.contentStandards)
    await db.questions.bulkPut(pack.items)
    await db.meta.put({
      key: 'seedVersion',
      curriculumVersion: curriculum.meta.version,
      questionsVersion: pack.meta.version,
      questionsCount: pack.items.length,
      seededAt: new Date().toISOString(),
    })
  })

  localStorage.setItem(SEED_KEY, curriculum.meta.version)
  console.info(`[seed] seeded curriculum v${curriculum.meta.version}, ${pack.items.length} questions`)
  return { seeded: true, curriculumVersion: curriculum.meta.version, questionsCount: pack.items.length }
}