git add -A
git commit -m "toast notifications, confirm modal, landing hero upgrade"
git push


git add -A
git commit -m "mobile responsiveness: login, signup, profile, progress"
git push


git add -A
git commit -m "fix branding: full name on all screen sizes, stacked two-line wordmark"
git push


1/ Create a PWA that uses this webapp as a a source for information retrieval.
2/ The webapp will be used my the admin and members for data entry.
Let's brainstorm.


For the current project, let's consider the following additions:

1/ Create a PWA that uses this webapp as a source for information retrieval. The PWA will host frontend and functionalities that will help teachers, generate weekly forecasts, schemes of learning, quiz/test/classwork/homework questions, and/or download them.
2/ The webapp will be used my the admin and members for data entry.
Let's brainstorm.


I'll load the repo overview ability and then analyze your repository.Now I'll gather evidence about the repository structure and contents.## What this is

**Beacon** is a members-only web platform that helps Ghanaian teachers plan and deliver lessons aligned to the NaCCA (National Council for Curriculum and Assessment) standards-based curriculum. Teachers create Schemes of Learning and Lesson Plans, contribute to a shared Question Bank, download branded PDFs/Word files, discover teaching vacancies, and participate in a social feed — all organized around Basic grades 1–9.

### Stack

- **Languages:** JavaScript (75%), HTML (15%), Python (10%) for curriculum data generation  
- **Framework / runtime:** React 19 + Vite + React Router 7 on Firebase (Auth + Cloud Firestore)  
- **Notable libraries:** `jspdf` + `jspdf-autotable` (PDF export), `docx` (Word export), `pptxgenjs` (PowerPoint export), Tailwind CSS 4

## How it's organized

```
src/
  App.jsx                 # Route configuration (public pages + /portal protected layout)
  firebase.js             # Firebase SDK init from env vars
  context/AuthContext.jsx # Live auth state + profile subscription
  hooks/useCurriculum.js  # Cached curriculum/grades/schedules loaders
  lib/                    # Export utilities, grade labels, week key helpers
  components/             # Sidebar, PendingApproval, shared UI
  pages/                  # One page per screen (Feed, Curriculum, Forecasts, etc.)
seed/                     # Python curriculum build scripts
data/                     # Raw NaCCA extraction files (input only)
public/curriculum/        # Generated JSON curriculum database (served statically)
public/scratch/           # Standalone Scratch teaching resources
```

**How it fits together:** Users authenticate via Firebase, then subscribe to live profile data (role/status). The app loads curriculum from static JSON files in `public/curriculum/` — no Firestore reads billed for browsing. When a teacher creates a Scheme of Learning or Lesson Plan, it's written to `weekly_forecasts` or `lesson_plans` in Firestore. Export flows use `jspdf`, `docx`, or `pptxgenjs` to render branded documents. The Python build pipeline in `seed/` reads raw curriculum extractions and generates the JSON database that powers browsing and search.

## How to run it

1. **Install dependencies:**
   ```bash
   yarn
   ```

2. **Configure Firebase:** Create a project at console.firebase.google.com, enable Email/Password auth and Firestore, create a Web app, then add its config to `.env.local`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

3. **Apply Firestore security rules** from the README (enforces signup → pending, members can't change role/status, content approval flows).

4. **Bootstrap the first admin** by signing up through the app, then manually setting `role: "admin"` and `status: "approved"` in the `users` doc in Firestore.

5. **Start development:**
   ```bash
   yarn dev        # Runs on http://localhost:5173
   yarn build      # Production build
   yarn lint       # ESLint
   ```

## Try asking

- **How do I add B2–B9 indicator descriptions?** — The README notes B2–B9 descriptions are "extraction placeholders"; what's the current state of the data files and when can those be populated?
- **What does the weekly question quota enforce, and how does the reminder banner work?** — I see it mentioned in Feed and the Question Bank feature list but didn't trace the reminder logic.
- **How are Schemes of Learning auto-generated for B1 Math & Science?** — The README says "fully generated from schedules"; where does that code live and what does the generation logic do?