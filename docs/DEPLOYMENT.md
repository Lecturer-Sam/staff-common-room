# Deployment

Two hosts, both already on free tiers:

| Host | Serves | Status |
|---|---|---|
| **Vercel** | the React portal (static build) | already live |
| **Firebase** | Authentication, Firestore | already live |

```
browser ──► Vercel (React app)
              │
              ├──► Firebase      (sign in, Firestore)
              └──► /curriculum/  (static JSON, same origin)
```

**No third host is required.** Schemes of Learning and Records of Work are
both assembled in the browser from data shipped in the static bundle — see
[How generation works](#how-generation-works) below. The Material Service
(`service/`) is optional and only useful for bulk jobs; it is not on the
critical path.

---

## 1. Environment variables

In **Vercel → your project → Settings → Environment Variables**:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

That is the complete list. `VITE_MATERIALS_URL` is **not** needed unless you
choose to run the service — see [Optional: the Material
Service](#optional-the-material-service).

> Vite bakes `VITE_*` variables in **at build time**. Changing a value without
> rebuilding has no effect — redeploy after any change.

---

## 2. Firebase checklist

Before a demo, confirm:

- [ ] The 6 `VITE_FIREBASE_*` variables above are set in Vercel
- [ ] Your Vercel domain is in Firebase Console → Authentication →
      **Settings → Authorised domains**
- [ ] Firestore rules are published (done — via the Firebase console)
- [ ] `app/vercel.json` rewrites everything to `index.html`, so client-side
      routing survives a refresh ✓ (already committed)

---

## 3. Build

The curriculum JSON is generated, not committed — `app/public/curriculum/` is
gitignored because it is 38 MB and rebuildable from `data/`. The build script
handles this:

```bash
cd app
yarn install
yarn build          # runs `yarn curriculum` first, then `vite build`
```

`build` is `yarn curriculum && vite build` for exactly this reason. A bare
`vite build` from a fresh checkout produces an app that 404s on every
`/curriculum/*.json` fetch.

Expected output:

```
43 files · 4040 indicators · 13140 scheduled lessons
dist/curriculum/   44 files
```

---

## 4. Verify before you demo

In the browser, signed in:

- [ ] `/portal/materials` populates the grade and subject dropdowns
- [ ] **Scheme of Learning** downloads, with your school name on the cover
- [ ] **Record of Work** downloads — landscape, with week separator rows and
      the signature block
- [ ] "All subjects" produces a `.zip`
- [ ] DevTools console shows no errors

To confirm the bundle is complete on a deployed URL:

```bash
curl -s -o /dev/null -w "grades.json    %{http_code}  %{size_download} bytes\n" \
  https://YOUR-APP.vercel.app/curriculum/grades.json
curl -s -o /dev/null -w "b4_schemes     %{http_code}  %{size_download} bytes\n" \
  https://YOUR-APP.vercel.app/curriculum/b4_schemes.json
```

Both should return `200`. A `404` on either means the build ran without
`yarn curriculum`.

---

## How generation works

| Document | Source file | Size | Built by |
|---|---|---|---|
| Scheme of Learning | `<grade>_schemes.json` | ~157 KB | `app/src/lib/clientScheme.js` |
| Record of Work | `<grade>_schedules.json` | ~3.1 MB | `app/src/lib/clientRecord.js` |

Both use the `docx` npm package that the app already depends on, and both
mirror their Python counterparts in `tools/` — same columns, widths, week
separators and truncation limits, so the browser output matches the
server output.

The 3.1 MB schedules file is only fetched when someone actually asks for a
record, and is cached per session. Schemes never touch it.

**Consequences worth knowing:**

- Generation is instant — no network round trip, no cold start.
- No CORS, no auth token, no server to keep alive.
- Data lives in `public/`, fetched on demand, so it does *not* count against
  Vercel's bundle limits — but it is Vercel bandwidth.

---

## Optional: the Material Service

`service/` is a Flask container producing the same two documents server-side.
It is worth running only if you need bulk generation (e.g. every subject for
every grade in one job), which is awkward in a browser.

If you do run it, it needs a host Vercel cannot provide. Cloud Run is the
natural fit, since your Firebase project *is* a Google Cloud project.

Build from the **repo root** — the Dockerfile copies `data/` and `tools/` in,
so the context must be the whole repository:

```bash
export PROJECT_ID=<your-firebase-project-id>
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/beacon-materials \
  --file service/Dockerfile \
  .

gcloud run deploy beacon-materials \
  --image gcr.io/$PROJECT_ID/beacon-materials \
  --region africa-south1 \
  --allow-unauthenticated \
  --timeout 300 --memory 1Gi \
  --set-env-vars "REQUIRE_AUTH=1,ALLOWED_ORIGINS=https://YOUR-APP.vercel.app"
```

> ⚠️ **Do not use `gcloud run deploy --source .`** from the repo root. Cloud
> Run looks for a `Dockerfile` in the source directory; ours is at
> `service/Dockerfile`, so it falls back to buildpacks, finds
> `app/package.json`, and builds a **Node** image instead of the Flask app.

Then point the app at it and redeploy:

```
VITE_MATERIALS_URL = https://beacon-materials-XXXXXX-ew.a.run.app
```

Notes:

- **`--allow-unauthenticated` is intentional.** It lets the browser reach the
  service at all; `REQUIRE_AUTH=1` is what actually protects it. Without it,
  Google's IAM rejects the request before your token check ever runs.
- **Cold starts.** With `--min-instances 0` an idle service sleeps and the
  first request can take 10–30 s.
- **CORS** is handled in `service/main.py` and pinned to your portal's origin
  via `ALLOWED_ORIGINS`. Without it the browser blocks every cross-origin
  call.
