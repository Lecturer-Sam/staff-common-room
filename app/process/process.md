Here is your comprehensive, step-by-step development roadmap. Following these steps sequentially will prevent architectural errors and keep your project completely on the free tier.
------------------------------
## Stage 1: Environment & Frontend Setup## Step 1.1: Initialize the Project
Create your React application using Vite (which is much faster and lighter than Create React App). [1, 2] 

npm create vite@latest teacher-network -- --template react
cd teacher-network
npm install

## Step 1.2: Install Tailwind CSS
Install Tailwind and its peer dependencies, then generate your configuration files. [3, 4] 

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


* Configure Sources: Open tailwind.config.js and add your paths:

content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],

* Add Directives: Replace the contents of ./src/index.css with:

@tailwindcss base;@tailwindcss components;@tailwindcss utilities;

[5, 6, 7, 8, 9] 

## Step 1.3: Set Up Git & GitHub
Create a private repository on [GitHub](https://github.com/). Link your local project to it and make your initial commit: [10, 11, 12] 

git init
git add .
git commit -m "initial frontend setup"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main

------------------------------
## Stage 2: Database & Backend (Firebase Setup)## Step 2.1: Initialize Firebase Console

   1. Go to the [Firebase Console](https://console.firebase.google.com/) and click Add Project.
   2. Disable Google Analytics (unnecessary for development).
   3. Click the Web (</>) icon to register an app. Copy the configuration object provided. [13, 14, 15, 16, 17] 

## Step 2.2: Enable Services

* Authentication: Click Authentication > Get Started > Enable Email/Password.
* Firestore Database: Click Firestore Database > Create Database. Select a location closest to you and start in Test Mode (this allows you to read/write for 30 days while developing). [18, 19, 20, 21, 22] 

## Step 2.3: Link Firebase to React
Install the Firebase SDK locally:

npm install firebase

Create a .env.local file in your root folder to store your keys safely (Vite requires variables to start with VITE_): [23, 24, 25] 

VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

Create a file at src/firebase.js to initialize the services: [26, 27, 28] 

import { initializeApp } from "firebase/app";import { getAuth } from "firebase/auth";import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);export const auth = getAuth(app);export const db = getFirestore(app);

------------------------------
## Stage 3: Feature Core Development## Step 3.1: Build Authentication

* Create a SignUp component using Firebase's createUserWithEmailAndPassword.
* Create a Login component using signInWithEmailAndPassword.
* Create a custom React Context (AuthContext.jsx) that listens to onAuthStateChanged to manage user sessions across pages. [29, 30] 

## Step 3.2: Structure Your Firestore Collections
Plan your data schema before building the UI: [31] 

* users (Collection) → { uid, name, email, subject, school, bio } (Documents)
* posts (Collection) → { postId, authorId, authorName, content, timestamp, likesCount } (Documents)
* consultations (Collection) → { roomId, teacherId, consultantId, status, messages: [] } (Documents) [32, 33, 34, 35] 

## Step 3.3: Build Social Feed & Consultation Logic

* Feed: Use Firestore's addDoc to let teachers publish a post, and onSnapshot to stream new posts to the UI in real-time.
* Consultation: Create a directory layout where teachers can browse other profiles by subject and click "Request Consultation" to create a document room in the consultations collection.

------------------------------
## Stage 4: Production Deployment (Vercel)## Step 4.1: Connect Repository to Vercel

   1. Log in to [Vercel](https://vercel.com/) using your GitHub account.
   2. Click Add New > Project.
   3. Import your teacher-network repository from the list. [36, 37] 

## Step 4.2: Configure Environment Variables
Before clicking "Deploy", expand the Environment Variables dropdown section in Vercel. Copy and paste all the keys from your local .env.local file exactly as they appear (VITE_FIREBASE_API_KEY, etc.). [38] 
## Step 4.3: Deploy and Test

   1. Click Deploy. Vercel will build your React code and provide a live URL (e.g., teacher-network.vercel.app).
   2. Test the live site by registering a dummy teacher account to verify Firestore and Authentication work in production. [39, 40] 

------------------------------
## Stage 5: Security Hardening (Post-Launch)## Step 5.1: Secure your Firestore Database
Go back to your Firebase Console under Firestore > Rules. Replace the development rules with strict permissions so users can only edit their own data: [41] 

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

Which specific piece of this roadmap would you like to build first? I can provide the React code for your AuthContext user login listener, or we can draft the layout for the teacher profile interface using [Tailwind](https://tailwindcss.com/).




git add .
git commit -m "Changed all branding references across the codebase
 from Lecturer Sam Consult to Beacon Educational Consult"



git add -A
git commit -m "rebrand to Beacon Educational Consult"
git push
