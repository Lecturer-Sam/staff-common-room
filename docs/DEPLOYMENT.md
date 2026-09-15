# Deployment

Three hosts, each doing one job:

| Host | Serves | Status |
|---|---|---|
| **Firebase** | Authentication, Firestore | already live |
| **Vercel** | the React portal (static build) | already live |
| **Cloud Run** | the Material Service (Python container) | **to do** |

The Material Service is the only new piece. It is Python — it cannot run on
Vercel, which serves static files and JS functions only.

```
browser ──► Vercel (React app)
              │
              ├──► Firebase   (sign in, Firestore)
              └──► Cloud Run  (generate .docx)   ← cross-origin, needs CORS
```

---

## 1. One-time setup

```bash
# Install the Google Cloud CLI: https://cloud.google.com/sdk/docs/install
gcloud init
gcloud auth login

# Your Firebase project IS a Google Cloud project — reuse it.
gcloud projects list
export PROJECT_ID=<your-firebase-project-id>
gcloud config set project $PROJECT_ID

# First run only: enable the APIs Cloud Run needs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

---

## 2. Build the image

Build from the **repo root** — the Dockerfile copies `data/` and `tools/` in,
so the context must be the whole repository.

```bash
cd ~/dev-area/staff-common-room

gcloud builds submit \
  --tag gcr.io/$PROJECT_ID/beacon-materials \
  --file service/Dockerfile \
  .
```

> ⚠️ **Do not use `gcloud run deploy --source .`** from the repo root. Cloud
> Run looks for a `Dockerfile` in the source directory; ours is at
> `service/Dockerfile`, so it falls back to buildpacks, finds
> `app/package.json`, and builds a **Node** image instead of the Flask
> service. If you deploy from source, point it at `service/` — but then
> `COPY data/` and `COPY tools/` fail because the context is wrong. Build the
> image explicitly as shown above.

The image is large (~200 MB+) because it carries the 73 lesson files and the
curriculum databases. That is deliberate — it makes the container
self-contained with no volume mount.

---

## 3. Deploy to Cloud Run

`africa-south1` (Johannesburg) is the closest region to Ghana.

```bash
gcloud run deploy beacon-materials \
  --image gcr.io/$PROJECT_ID/beacon-materials \
  --region africa-south1 \
  --platform managed \
  --allow-unauthenticated \
  --timeout 300 \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "REQUIRE_AUTH=1,ALLOWED_ORIGINS=https://YOUR-APP.vercel.app"
```

Replace `YOUR-APP.vercel.app` with your real Vercel domain. If you use Vercel
preview deployments, add them comma-separated.

Environment variables:

| Var | Value | Why |
|---|---|---|
| `REQUIRE_AUTH` | `1` | Without it anyone who finds the URL can generate unlimited documents. The portal already sends a Firebase ID token — `Materials.jsx` fetches one and `materialService.js` sends it as `Authorization: Bearer …` |
| `ALLOWED_ORIGINS` | your Vercel origin | Pins CORS to your portal. Without it the service allows `*` |
| `GENERATE_TIMEOUT` | `300` (default) | A whole-grade Record of Work set takes ~28 s |

When it finishes, gcloud prints the service URL:

```
https://beacon-materials-XXXXXX-ew.a.run.app
```

**Copy it.**

---

## 4. Point the portal at it

In **Vercel → your project → Settings → Environment Variables**, add:

```
VITE_MATERIALS_URL = https://beacon-materials-XXXXXX-ew.a.run.app
```

Apply to Production (and Preview, if you want previews to generate).

Then **redeploy** — Vite bakes `VITE_*` variables in at build time, so
changing the value without rebuilding has no effect:

```bash
git commit --allow-empty -m "Rebuild with VITE_MATERIALS_URL"
git push
```

or trigger **Deployments → Redeploy** in the Vercel dashboard.

---

## 5. Firebase + Vercel checklist

Firebase is already live, but confirm these before a demo:

- [ ] The 6 `VITE_FIREBASE_*` variables are set in Vercel
  (`API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`,
  `MESSAGING_SENDER_ID`, `APP_ID`)
- [ ] Your Vercel domain is in Firebase Console → Authentication →
  **Settings → Authorised domains**
- [ ] Firestore rules are published (done — via the Firebase console)
- [ ] `app/vercel.json` rewrites everything to `index.html` so client-side
  routing works on refresh ✓ (already committed)

---

## 6. Verify before you demo

```bash
SERVICE=https://beacon-materials-XXXXXX-ew.a.run.app

# 1. Health — must report 73 lesson files and HTTP 200
curl -i $SERVICE/health

# 2. CORS preflight — must return 204 with Allow-Origin
curl -i -X OPTIONS $SERVICE/generate \
  -H "Origin: https://YOUR-APP.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,authorization"

# 3. Generate a real document end to end
curl -X POST $SERVICE/generate \
  -H "Content-Type: application/json" \
  -H "Origin: https://YOUR-APP.vercel.app" \
  -d '{"kind":"scheme","grade":"B4","subject":"math","term":1,"school":"Achimota School"}' \
  -o scheme.docx -w "HTTP %{http_code}  %{size_download} bytes\n"
```

Then in the browser, signed in:

- [ ] `/portal/materials` loads the grade and subject dropdowns (proves
      `/catalog` is reachable across origins)
- [ ] Generate produces a download with your school name on the cover
- [ ] The DevTools console shows **no** CORS errors

---

## Notes

- **Cold starts.** With `--min-instances 0` an idle service sleeps; the first
  request after idle can take 10–30 s while it boots and loads the data. For
  a school demo, warm it up by calling `/health` a minute beforehand, or set
  `--min-instances 1` (costs more, stays fast).
- **`--allow-unauthenticated` is intentional.** It lets the browser reach the
  service; `REQUIRE_AUTH=1` is what actually protects it. Without
  `--allow-unauthenticated`, Google's own IAM would block every request before
  your token check ever ran.
- **Cost.** Cloud Run bills per request and per CPU-second while serving. With
  `--min-instances 0` an idle service costs essentially nothing, and the free
  tier covers a great deal of early use.
