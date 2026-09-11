# Teacher Network — Project Outline

A full-stack social & consultation platform for teachers, built with React (Vite), Tailwind CSS, Firebase, and deployed on Vercel. Package management via **Yarn**.

---

## Stage 1: Environment & Frontend Setup

### 1.1 — Initialize the Project

Create a React app with Vite (fast, lightweight alternative to Create React App).

```bash
yarn create vite teacher-network --template react
cd teacher-network
yarn install
```

### 1.2 — Install Tailwind CSS

Install Tailwind and peer dependencies, then generate config files.

```bash
yarn add -D tailwindcss postcss autoprefixer
yarn tailwindcss init -p
```

**Configure `tailwind.config.js`:**

```js
content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
```

**Replace `src/index.css` with:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1.3 — Set Up Git & GitHub

Create a **private** repository on GitHub, then:

```bash
git init
git add .
git commit -m "initial frontend setup"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

---

## Stage 2: Database & Backend (Firebase)

### 2.1 — Initialize Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Add Project**
2. Disable Google Analytics (not needed for development)
3. Click the **Web (`</>`)** icon to register an app → copy the config object

### 2.2 — Enable Services

- **Authentication:** Authentication → Get Started → Enable **Email/Password**
- **Firestore Database:** Firestore Database → Create Database → Select region → Start in **Test Mode** (allows read/write for 30 days during development)

### 2.3 — Link Firebase to React

Install the Firebase SDK:

```bash
yarn add firebase
```

**Create `.env.local`** in the project root (Vite requires `VITE_` prefix):

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Create `src/firebase.js`:**

```js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

---

## Stage 3: Feature Core Development

### 3.1 — Build Authentication

| Component | Firebase Method | Purpose |
|---|---|---|
| `SignUp.jsx` | `createUserWithEmailAndPassword` | Register new teachers |
| `Login.jsx` | `signInWithEmailAndPassword` | Log in existing teachers |
| `AuthContext.jsx` | `onAuthStateChanged` listener | Manage user sessions across the app via React Context |

### 3.2 — Firestore Data Schema

| Collection | Document Fields |
|---|---|
| **users** | `uid`, `name`, `email`, `subject`, `school`, `bio` |
| **posts** | `postId`, `authorId`, `authorName`, `content`, `timestamp`, `likesCount` |
| **consultations** | `roomId`, `teacherId`, `consultantId`, `status`, `messages[]` |

### 3.3 — Social Feed & Consultation Logic

- **Feed:** Use `addDoc` to publish posts, `onSnapshot` to stream new posts to the UI in real-time
- **Consultations:** Browse teacher profiles by subject → click "Request Consultation" → create a document room in the `consultations` collection

---

## Stage 4: Production Deployment (Vercel)

### 4.1 — Connect Repository to Vercel

1. Log in to [Vercel](https://vercel.com/) with your GitHub account
2. Click **Add New → Project**
3. Import your `teacher-network` repository

### 4.2 — Configure Environment Variables

Before clicking **Deploy**, expand the **Environment Variables** section in Vercel and paste all keys from `.env.local` (`VITE_FIREBASE_API_KEY`, etc.)

### 4.3 — Deploy & Test

1. Click **Deploy** → Vercel builds and provides a live URL (e.g., `teacher-network.vercel.app`)
2. Register a dummy teacher account to verify Firestore and Auth work in production

---

## Stage 5: Security Hardening (Post-Launch)

### 5.1 — Secure Firestore Rules

Replace development rules in Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /posts/{postId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Quick Reference: npm → Yarn Cheat Sheet

| Action | npm | Yarn |
|---|---|---|
| Create new project | `npm create vite@latest ...` | `yarn create vite ...` |
| Install all deps | `npm install` | `yarn install` (or just `yarn`) |
| Add dependency | `npm install <pkg>` | `yarn add <pkg>` |
| Add dev dependency | `npm install -D <pkg>` | `yarn add -D <pkg>` |
| Run script | `npm run <script>` | `yarn <script>` |
| Execute binary | `npx <cmd>` | `yarn <cmd>` |
| Remove package | `npm uninstall <pkg>` | `yarn remove <pkg>` |

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| **Build Tool** | Vite |
| **Frontend** | React |
| **Styling** | Tailwind CSS |
| **Auth & Database** | Firebase (Auth + Firestore) |
| **Package Manager** | Yarn |
| **Hosting** | Vercel (free tier) |
