# Beacon Material Service

An HTTP wrapper around the two Python document generators, so the web portal can
produce **Schemes of Learning** and **Records of Work** on demand, pre-printed
with the requesting school's details.

This is the missing link between the portal and the generators: the generators
are Python and CLI-driven, the portal is React, and until now nothing could
bridge them.

```
Portal (React)  ──POST /generate──▶  Material Service (Cloud Run)
                                          │
                                          ├─ generate_schemes.py
                                          └─ generate_records_of_work.py
                                          │
                     .docx / .zip  ◀──────┘
```

---

## Why subprocesses, not imports

`generate_schemes.py` and `generate_records_of_work.py` keep their output
locations in module-level globals (`OUT` / `JSON_OUT` / `DOCX_OUT`) that
`main()` reassigns. Importing and monkey-patching those is fragile.

Shelling out runs the exact CLI path that is already tested, and means future
generator changes need no changes here. Cost is roughly 0.3 s of interpreter
startup — invisible against generation times.

## Measured timings

| Request | Time |
|---|---|
| Scheme, one subject-grade | ~0.4 s |
| Scheme, whole grade (7–10 subjects) | ~3 s |
| Record of Work, one subject-grade | ~2–4 s |
| Record of Work, whole grade | ~28 s |

A scheme is fast enough to feel instant. Records benefit from a spinner.

---

## Running locally

```bash
pip install -r service/requirements.txt
python service/main.py          # http://127.0.0.1:8080
```

Smoke test:

```bash
curl http://127.0.0.1:8080/health

curl -X POST http://127.0.0.1:8080/generate \
  -H 'Content-Type: application/json' \
  -d '{"kind":"scheme","grade":"B4","subject":"math","school":"Achimota School"}' \
  -o scheme.docx
```

## Running the portal against it

The Vite dev server proxies `/materials` to the service, so the browser stays on
one origin and needs no CORS:

```bash
# terminal 1
python service/main.py

# terminal 2
cd app && yarn dev
```

Override the target with `MATERIALS_TARGET` if the service runs elsewhere.

---

## Endpoints

### `GET /health`

Returns `200` when Python, `python-docx` and the curriculum data are all
visible; `503` otherwise.

```json
{"ok": true, "python": "3.11.2", "python_docx": true,
 "lesson_files": 73, "require_auth": false}
```

### `GET /catalog`

Grades and subjects available, for populating portal dropdowns. Derived from the
same `discover()` the generators use, so it can never drift from what actually
exists on disk.

```json
{"kinds": ["scheme", "record"],
 "grades": {"B4": [{"key": "math", "id": "mathematics", "name": "Mathematics"}, ...]}}
```

### `POST /generate`

| Field | Type | Notes |
|---|---|---|
| `kind` | `scheme` \| `record` | required |
| `grade` | `B1`–`B9` | required |
| `subject` | string | omit for every subject in the grade |
| `term` | `1` \| `2` \| `3` | returns just that term |
| `per_term` | bool | one document per term |
| `school` | string | pre-printed on the cover |
| `teacher` | string | |
| `class_name` | string | e.g. `Basic 4` |
| `year` | string | academic year |
| `hod` | string | **scheme covers only** |

One document is returned as `.docx`. Several are bundled into a `.zip`.

All branding fields are optional and fall back to the handwritten blank lines,
so CLI output is unchanged when they are absent.

---

## Security

**Argument injection.** Only values found in the allow-lists reach the
subprocess, and the command is passed as an argv list with `shell=False`.
Free-text branding values are truncated to 120 characters. Verified: a
`school` value of `x; touch /tmp/PWNED` produces a normal document and creates
no file.

**Authentication.** Off by default so the service can be smoke-tested locally.
**Turn it on in any deployed environment** — with it off, anyone who finds the
URL can generate unlimited documents:

```bash
export REQUIRE_AUTH=1
```

The portal then sends the user's Firebase ID token as `Bearer <token>`, which
the service verifies with `firebase-admin`.

**What is not yet enforced:** that the caller is entitled to the school they
name on the cover. Token verification proves identity, not entitlement. Before
charging customers, tie the branding fields to the caller's own school record
rather than trusting request bodies.

---

## Deploying to Cloud Run

`africa-south1` (Johannesburg) is the closest region to Ghana.

```bash
gcloud run deploy beacon-materials \
  --source . \
  --region africa-south1 \
  --allow-unauthenticated \
  --set-env-vars REQUIRE_AUTH=1 \
  --timeout 300 \
  --memory 1Gi
```

Then point the portal at it:

```bash
VITE_MATERIALS_URL=https://beacon-materials-xxxxx-ew.a.run.app
```

### Notes

- **`--source .` builds from the repo root, not `service/`.** The Dockerfile
  copies the curriculum data in, so the image is self-contained.
- **The image is large (~200 MB+).** It carries 73 enriched lesson files
  (~34 MB) plus the curriculum DBs. If that becomes a problem, move the data to
  a Cloud Storage bucket mounted at startup.
- **`--timeout 300` matters.** A whole-grade Record of Work set takes ~28 s;
  request one subject at a time for anything interactive.
- Python 3.11 is the base image; the generators were developed against 3.11.

---

## Portal screen

`app/src/pages/Materials.jsx`, routed at `/portal/materials`, linked in the
sidebar as **Generate**.

It loads `/catalog` to populate the grade and subject dropdowns, collects the
branding fields, and downloads the result. Changing grade clears the selected
subject, since subject keys differ per grade.

Behaviour worth knowing:

- **Subject is optional** — leaving it on "All subjects" downloads a `.zip`
  with one document per subject in the grade.
- **Term is optional** — "Full year" produces the combined document.
- **HoD appears only for schemes**, since record covers have no such field.
- **Service unavailable** disables the form and explains how to start it,
  rather than failing at click time.

## Files

| Path | Purpose |
|---|---|
| `service/main.py` | Flask app: `/health`, `/catalog`, `/generate` |
| `service/requirements.txt` | Flask, gunicorn, python-docx, firebase-admin |
| `service/Dockerfile` | Container for Cloud Run |
| `service/.dockerignore` | Keeps `node_modules` out of the build context |
| `app/src/lib/materialService.js` | Browser client (catalog, generate, download) |
| `app/src/pages/Materials.jsx` | The generate-materials screen |
| `app/vite.config.js` | Dev proxy at `/materials` |

---

## Not built yet

- **No persistence.** Generated files are streamed to the browser and not saved.
  The school workspace should keep a history of what each teacher produced.
- **No quota or rate limiting.** `REQUIRE_AUTH` is the only guard.
- **No PDF output.** `.docx` only; the DOCX→PDF path is separate.
- **Branding is not bound to the caller's school.** The page sends whatever the
  user types. See the Security section before charging customers.
