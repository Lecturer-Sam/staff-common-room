# School Workspace

`app/src/pages/SchoolWorkspace.jsx` — the school's own space. This is where
"clients own a space" actually lives.

## Routes

| Route | Who |
|---|---|
| `/portal/school` | A member's own school |
| `/portal/schools/:schoolId` | Platform admins managing any school |

A member with no `schoolId` gets `JoinSchoolCard` and enters a join code.

## What it contains

**Members.** Roster with add and remove. School admins can only add
*unassigned* approved teachers — enforced in `firestore.rules`, not just the UI.
Removing someone who is a `school_admin` demotes them to `member` first, so a
school admin is never left orphaned without a school.

**Join codes.** Managers generate, rotate and copy a code; teachers self-serve
onto the roster. The code maps to a school through `school_codes/{code}`, and
the join write is validated against it in rules.

**Curriculum coverage.** `SchoolCoverage.jsx` aggregates every member's
`progress` docs into "which subjects teachers are tracking and how many weeks
they've taught," for the current term. **This is the "proof of what's taught"
half of the product promise, and it already works on real data.**

**School-shared content.** Schemes (`weekly_forecasts`), lesson plans, and notes
where `visibility`/`status == 'school'`.

**Generated materials.** Documents produced with the Generate screen — see below.

## Generation history

Added 2026-09-13. Previously the Generate screen streamed a document to the
browser and forgot it, so a school could not see what its staff had produced.

### Data

`generated_materials/{id}`:

| Field | Notes |
|---|---|
| `authorId`, `authorName` | who produced it |
| `schoolId` | pinned by rules to the caller's own school |
| `kind` | `scheme` \| `record` |
| `grade`, `subject`, `term` | `subject`/`term` null = all subjects / full year |
| `filename` | as returned by the service |
| `isZip` | true when the download bundled a whole grade |
| `createdAt` | server timestamp |

### Queries

Equality-only, sorted client-side — matching the pattern used elsewhere in this
file, so **no composite index is required**. This is deliberate; do not add
`orderBy` to these queries without also adding an index.

```js
listSchoolGenerations(schoolId)   // the school's history, newest first
listMyGenerations(uid)            // a teacher's own, shown on the Generate page
```

### Rules

```js
match /generated_materials/{materialId} {
  allow read: if isSignedIn()
    && (isOwner(resource.data.authorId)
        || (resource.data.get('schoolId', null) != null
            && resource.data.schoolId == userSchoolId())
        || isAdmin());
  allow create: if isApprovedOrAdmin()
    && request.resource.data.authorId == request.auth.uid
    && request.resource.data.schoolId == userSchoolId();
  allow delete: if isOwner(resource.data.authorId) || isAdmin();
}
```

Three things this enforces:

- **`schoolId` cannot be forged.** It must equal the caller's own school, so a
  member cannot file a document into another school's history.
- **`authorId` must be the caller**, so nobody can attribute work to a
  colleague.
- **The read path null-guards `schoolId`.** Without it, two school-less users
  would both match `null == null` and could read each other's history.

Records are immutable — no update rule; deletion is by author or platform admin.

## School name is locked on the Generate screen

Related change, same date: if the caller belongs to a school, the School field
is pre-filled from that school's document and disabled.

Rationale: free text let anyone print any school's name on a document, which
would both misrepresent the school and poison this history. Members of a school
now always get the correct name automatically. Teachers with no school can still
type one.

## Not built

- Generated documents are **recorded but not stored**. The history is metadata
  only — there is no re-download. Re-downloading would mean persisting the
  `.docx` to Cloud Storage, which needs `storage.rules` (still absent).
- No filtering by grade, subject or term in the workspace list.
- No per-teacher breakdown, and no roll-up across terms.
