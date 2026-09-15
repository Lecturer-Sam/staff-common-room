# Teacher Network — Firestore Database Schema

Extends the base schema in PROJECT_OUTLINE.md (users, posts, consultations) with curriculum reference data and lesson plans, based on the 8 NaCCA Basic 1 curriculum files.

## Design principles

The curriculum is uniform across all 8 subjects: **Subject → Strand → Sub-strand → Content Standard → Indicator**, coded `B1.{strand}.{substrand}.{standard}.{indicator}`. Codes repeat across subjects (`B1.1.1.1.1` exists in both Maths and English), so indicator doc IDs are namespaced: `{subjectId}_{code}`.

Indicators are stored **flat and denormalized** (one doc per indicator carrying its full hierarchy) rather than as nested subcollections. Reasons: a whole subject is ~10–80 docs, cheap to fetch in one query and group client-side into the browse tree; tagging lesson plans needs only an indicator ID; and adding B2–B6 later is just more docs with a different `grade` field — no structural change.

---

## Collections

### 1. `users` — doc ID: Firebase Auth `uid`

| Field | Type | Notes |
|---|---|---|
| `uid` | string | mirrors doc ID |
| `name` | string | |
| `email` | string | |
| `school` | string | |
| `bio` | string | |
| `subjects` | array\<string\> | subject IDs taught, e.g. `["mathematics", "science"]` |
| `photoURL` | string \| null | |
| `role` | string | `"member"` \| `"admin"` — admins manage membership |
| `status` | string | `"pending"` \| `"approved"` \| `"suspended"` — signups start `pending`; only `approved` members (and admins) can use the portal |
| `createdAt` | timestamp | `serverTimestamp()` |

Bootstrap the first admin manually in Firebase Console: set your own user doc to `role: "admin"`, `status: "approved"`. Admins approve everyone else from the portal's Members page. `role` and `status` may only be changed by admins (enforced in rules below).

### 2. `curriculum_subjects` — doc ID: slug, e.g. `mathematics`

Seeded from `seed/curriculum_subjects.json` (8 docs).

| Field | Type | Notes |
|---|---|---|
| `id` | string | `creative-arts`, `english`, `ghanaian-language`, `history`, `mathematics`, `owop`, `rme`, `science` |
| `name` | string | display name, e.g. "Mathematics" |
| `grade` | string | `"B1"` (extensible to B2–B6) |
| `sourceTitle` / `sourceUrl` | string | NaCCA PDF reference |
| `counts` | map | `{strands, subStrands, standards, indicators}` for UI badges |

### 3. `curriculum_indicators` — doc ID: `{subjectId}_{code}`, e.g. `mathematics_B1.1.1.1.1`

Seeded from `seed/curriculum_indicators.json` (289 docs).

| Field | Type | Notes |
|---|---|---|
| `code` | string | `B1.1.1.1.1` |
| `grade` | string | `"B1"` |
| `subjectId` / `subjectName` | string | denormalized for display |
| `strandNumber` / `strandName` | number / string | |
| `subStrandNumber` / `subStrandName` | number / string | |
| `contentStandardCode` / `contentStandardDescription` | string | |
| `description` | string | the indicator text |

**Browse query (curriculum explorer):**
```js
query(collection(db, "curriculum_indicators"),
  where("subjectId", "==", "mathematics"),
  orderBy("code"))
```
Group results client-side by `strandNumber` → `subStrandNumber` → `contentStandardCode` to render the tree. One query per subject page; cache in context.

### 4. `lesson_plans` — doc ID: auto

| Field | Type | Notes |
|---|---|---|
| `authorId` / `authorName` | string | denormalized author |
| `title` | string | |
| `content` | string | markdown/rich text body |
| `subjectId` | string | required — primary filter |
| `grade` | string | `"B1"` |
| `indicatorIds` | array\<string\> | refs into `curriculum_indicators`, e.g. `["mathematics_B1.1.2.4.2"]` |
| `contentStandardCode` | string \| null | optional coarser tag |
| `attachmentURLs` | array\<string\> | Firebase Storage links (add Storage when needed) |
| `visibility` | string | `"public"` \| `"private"` |
| `createdAt` / `updatedAt` | timestamp | |

**Queries:** by subject (`where subjectId ==`, `orderBy createdAt desc`); by indicator (`where indicatorIds array-contains {id}`) — this powers "lesson plans for this indicator" in the curriculum explorer. Composite index needed: `subjectId ASC, createdAt DESC`.

### 5. `posts` — doc ID: auto (unchanged from outline)

`authorId`, `authorName`, `content`, `timestamp`, `likesCount`. Optional later: `subjectId` tag.

Subcollection `posts/{postId}/likes/{uid}` — one doc per liker; keeps `likesCount` honest via batched write or Cloud Function.

### 6. `consultations` — doc ID: auto

| Field | Type | Notes |
|---|---|---|
| `teacherId` / `consultantId` | string | the two participants |
| `participantIds` | array\<string\> | `[teacherId, consultantId]` — enables one `array-contains` query for "my consultations" and simple security rules |
| `subjectId` | string \| null | topic |
| `status` | string | `"pending"` \| `"active"` \| `"closed"` |
| `createdAt` | timestamp | |

Subcollection `consultations/{id}/messages/{msgId}`: `senderId`, `text`, `sentAt`. Messages as a subcollection (not an array field) — arrays hit the 1 MiB doc limit and can't be paginated or streamed per-message with `onSnapshot`.

---

## Security rules

Membership gating is enforced here, not just in the UI: portal collections require `approved` status (or admin role). The `me()` lookup costs one extra document read per request — acceptable at this scale.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function me() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isAdmin() { return signedIn() && me().role == "admin"; }
    function isMember() {
      return signedIn() && (me().status == "approved" || me().role == "admin");
    }

    match /users/{userId} {
      // Members can read each other; a signed-in user can always read their own doc
      allow read: if signedIn() && (request.auth.uid == userId || isMember());
      // Signup: create own doc, but must start as a pending member
      allow create: if signedIn() && request.auth.uid == userId
        && request.resource.data.role == "member"
        && request.resource.data.status == "pending";
      // Self-edit: cannot touch role/status; admins can change anything
      allow update: if isAdmin() ||
        (signedIn() && request.auth.uid == userId
          && request.resource.data.role == resource.data.role
          && request.resource.data.status == resource.data.status);
      allow delete: if isAdmin();
    }

    // Curriculum is read-only reference data; seed via Admin SDK only
    match /curriculum_subjects/{id} { allow read: if isMember(); allow write: if false; }
    match /curriculum_indicators/{id} { allow read: if isMember(); allow write: if false; }

    match /lesson_plans/{planId} {
      allow read: if isMember() &&
        (resource.data.visibility == "public" || resource.data.authorId == request.auth.uid);
      allow create: if isMember() && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isMember() && resource.data.authorId == request.auth.uid;
    }

    match /posts/{postId} {
      allow read: if isMember();
      allow create: if isMember() && request.resource.data.authorId == request.auth.uid;
      // Author edits own post; any member may update ONLY the like fields
      allow update: if isMember() && (
        resource.data.authorId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(["likedBy", "likesCount"])
      );
      allow delete: if isMember() && resource.data.authorId == request.auth.uid;
    }

    match /consultations/{roomId} {
      allow read, update: if isMember() && request.auth.uid in resource.data.participantIds;
      allow create: if isMember() && request.auth.uid in request.resource.data.participantIds;
      match /messages/{msgId} {
        allow read: if isMember() &&
          request.auth.uid in get(/databases/$(database)/documents/consultations/$(roomId)).data.participantIds;
        allow create: if isMember() && request.resource.data.senderId == request.auth.uid;
      }
    }
  }
}
```

Note the public website itself needs no Firestore access — visitors never touch the database, so nothing is exposed to signed-out users at all.

---

## Seeding

Files in `seed/`: `curriculum_subjects.json` (8 records), `curriculum_indicators.json` (289 records). Import once with `seed/import_seed.js` (firebase-admin, service-account key) — see comments in the script. Client apps never write curriculum collections.

## Extending to B2–B6

Parse the corresponding NaCCA files the same way; add docs with `grade: "B2"` etc. Doc IDs stay unique because codes embed the grade (`B2.1.1.1.1`). Add `where("grade", "==", ...)` to browse queries.
