Classroom Behavior Monitor - PWA Specification
🎯 Core Concept
A Progressive Web App for teachers to discretely log student behavior incidents in real-time during class, with offline-first architecture that syncs to a web dashboard for analysis, reporting, and parent communication.

👥 User Personas
Persona	Needs	Pain Points
Teacher (Primary)	Quick, one-handed logging during instruction; minimal disruption	Paper logs get lost; apps too complex; no offline support
Admin/Dean	Aggregate views, trends, intervention tracking	Data scattered across teachers; no real-time visibility
Parent	Transparent communication, context-rich reports	Only hear about problems at conferences
Student (Self-reflection)	Ownership, growth mindset	Feels punitive, not developmental
🔑 Core User Flows
Flow 1: Quick Log (During Instruction)
text

Teacher opens PWA → Sees class roster (grid/list) → Taps student → Taps behavior button → Done (< 3 seconds)
One-handed operation critical
Haptic feedback on tap
Visual confirmation (brief toast/animation)
Zero modal dialogs for common behaviors
Flow 2: Detailed Log (During Break/Prep)
text

Teacher opens student detail → Adds notes, severity, context → Tags interventions tried → Saves
Flow 3: Sync & Review (After Class)
text

PWA auto-syncs on WiFi → Teacher reviews daily summary → Edits/annotates → Generates report
Flow 4: Dashboard Analysis (Admin/Teacher Prep)
text

Web dashboard → Filter by student, date, behavior type → View trends → Export/print → Plan interventions
📱 PWA Features & Requirements
Offline-First Architecture
Requirement	Implementation
Local storage	IndexedDB (via Dexie.js or idb) for all logs
Background sync	Service Worker + Background Sync API (fallback: periodic sync)
Conflict resolution	Last-write-wins with server timestamp; manual merge for notes
Install prompt	BeforeInstallPromptEvent → custom install button
App shortcuts	manifest.json shortcuts: "Log Behavior", "View Today"
Performance Budgets
First Contentful Paint: < 1.5s on 3G
Time to Interactive: < 3s
Bundle size: < 100KB gzipped (JS + CSS)
IndexedDB ops: < 50ms for write, < 100ms for read
🗄️ Data Model
Core Entities
TypeScript

// Student (synced from roster API)
interface Student {
  id: string;                    // UUID
  externalId: string;            // SIS ID
  firstName: string;
  lastName: string;
  preferredName?: string;
  grade: string;
  section: string;               // e.g., "3A"
  avatarUrl?: string;
  alerts: StudentAlert[];        // IEP, 504, medical, etc.
  createdAt: string;             // ISO 8601
  updatedAt: string;
}

// Behavior Category (configurable per school)
interface BehaviorCategory {
  id: string;
  name: string;                  // "Talking out of turn", "Off task", "Physical aggression"
  shortCode: string;             // "TALK", "OFF", "PHYS" - for quick buttons
  icon: string;                  // Lucide/Phosphor icon name
  color: string;                 // Hex for UI
  severity: 1 | 2 | 3;           // 1=minor, 2=moderate, 3=major
  requiresNote: boolean;         // Force note for major behaviors
  isActive: boolean;
  sortOrder: number;
}

// Behavior Log Entry (the core record)
interface BehaviorLog {
  id: string;                    // UUID (client-generated)
  studentId: string;
  categoryId: string;
  teacherId: string;             // Current teacher
  timestamp: string;             // ISO 8601 (client local time)
  serverTimestamp?: string;      // Set on sync
  durationMinutes?: number;      // For time-based behaviors
  note?: string;                 // Optional context
  severityOverride?: 1 | 2 | 3;  // Teacher can escalate/de-escalate
  interventions?: Intervention[]; // What teacher tried
  location?: string;             // "Classroom", "Hallway", "Cafeteria"
  isSynced: boolean;             // Local flag
  syncVersion: number;           // For conflict detection
  createdAt: string;
  updatedAt: string;
}

interface Intervention {
  id: string;
  type: 'verbal_redirect' | 'proximity' | 'seat_change' | 'parent_contact' | 'referral' | 'other';
  description?: string;
  timestamp: string;
  effective?: boolean;           // Did it work?
}

// Sync metadata
interface SyncMetadata {
  lastFullSync: string;          // ISO 8601
  lastIncrementalSync: string;
  pendingCount: number;
  failedCount: number;
  serverVersion: number;         // For conflict detection
}
Derived/Computed (Dashboard)
TypeScript

interface StudentBehaviorSummary {
  studentId: string;
  period: 'day' | 'week' | 'month' | 'year';
  totalIncidents: number;
  byCategory: Record<string, number>;
  bySeverity: Record<1|2|3, number>;
  trend: 'improving' | 'stable' | 'declining';
  topBehaviors: { categoryId: string; count: number }[];
  interventionsTried: string[];
  lastIncident: string;
}
🎨 UI/UX Design
Teacher Mobile View (Primary)
1. Class Roster Screen (Default)
text

┌─────────────────────────────────────┐
│  📅 Today  🔄 Synced 2m ago  ⚙️    │  ← Header with status
├─────────────────────────────────────┤
│  🔍 Search students...              │
├─────────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐    │
│  │AJ  │  │BM  │  │CD  │  │EF  │    │  ← Student cards (avatar + name)
│  │Alex│  │Bailey│ │Casey│ │Emma │    │
│  │  2 │  │  0 │  │  1 │  │  3 │    │  ← Today's count badge
│  └────┘  └────┘  └────┘  └────┘    │
│  ┌────┐  ┌────┐  ┌────┐  ┌────┐    │
│  │GH  │  │IJ  │  │KL  │  │MN  │    │
│  │... │  │... │  │... │  │... │    │
│  └────┘  └────┘  └────┘  └────┘    │
├─────────────────────────────────────┤
│  📊 Summary    📝 Notes    👥 Roster │  ← Bottom nav
└─────────────────────────────────────┘
2. Quick-Log Modal (Tap student card)
text

┌─────────────────────────────────────┐
│  Alex Johnson          ✕            │
│  3A • 2 incidents today             │
├─────────────────────────────────────┤
│  🟢 Talking      🟡 Off-task        │  ← Severity 1 (green/yellow)
│  🟠 Disrespect   🔴 Physical        │  ← Severity 2/3 (orange/red)
├─────────────────────────────────────┤
│  ➕ Custom...    📝 Add note        │
└─────────────────────────────────────┘
Tap behavior → instant log + dismiss (for severity 1)
Long press → opens detail for note/severity override
Swipe up on card → quick log last used behavior
3. Student Detail Screen
text

┌─────────────────────────────────────┐
│  ← Alex Johnson          📅 Today   │
├─────────────────────────────────────┤
│  📈 This Week: 12 incidents         │
│  🟢 8  🟡 3  🟠 1  🔴 0             │
├─────────────────────────────────────┤
│  TODAY                              │
│  09:15  🟢 Talking out of turn      │
│  10:30  🟡 Off task (note: ...)     │
│  13:45  🟢 Talking out of turn      │
├─────────────────────────────────────┤
│  [ + Log Incident ]   [ 📝 Note ]   │
└─────────────────────────────────────┘
Web Dashboard (Admin/Teacher Desktop)
Layout
text

┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Behavior Monitor    [Class ▼]  [Date ▼]  [User]    │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  FILTERS     │  STUDENT GRID                                │
│  ─────────   │  ┌────────────────────────────────────────┐  │
│  📅 Range    │  │ Name      | Total | TALK | OFF | PHYS │  │
│  👥 Class    │  │ ────────────────────────────────────── │  │
│  🎯 Severity │  │ Alex J.   |   12  |   5  |  4  |  1   │  │
│  🏷 Category  │  │ Bailey M. |   3   |   0  |  2  |  0   │  │
│  🔍 Search   │  │ Casey D.  |   8   |   3  |  3  |  1   │  │
│              │  │ ...       │       │      │     │      │  │
│  [Export]    │  └────────────────────────────────────────┘  │
│              │                                              │
│  QUICK VIEWS │  CHARTS                                      │
│  ─────────── │  ┌──────────────┐ ┌──────────────┐          │
│  📈 Trends   │  │ Incidents    │ │ By Category  │          │
│  ⚠️ Alerts   │  │ (sparkline)  │ │ (donut)      │          │
│  🎯 Top 5    │  └──────────────┘ └──────────────┘          │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘


🔄 Sync Architecture
Sync Strategies
Scenario	Strategy
Online, foreground	Immediate POST per log (fire-and-forget with local queue)
Online, background	Batch sync every 30s via Background Sync API
Offline	Queue in IndexedDB; sync on reconnect
Conflict (same log edited)	Server wins for metadata; merge notes (append with timestamp)
Roster changes	Full sync on app start; incremental via webhook/push
API Endpoints (REST-ish)
text

POST   /api/v1/logs/batch           # Batch upsert logs (idempotent via client UUID)
GET    /api/v1/logs?since=timestamp # Incremental pull
GET    /api/v1/students?class=3A    # Roster sync
GET    /api/v1/categories           # Behavior categories
POST   /api/v1/sync/ack             # Acknowledge server version
GET    /api/v1/reports/summary      # Aggregated data for dashboard
POST   /api/v1/reports/generate     # Trigger PDF/CSV report


Push Notifications (Future)
Admin → Teacher: "New student added to your roster"
System → Teacher: "Sync failed 3x - check connection"
Parent → Teacher: "Parent acknowledged incident report"
🛠️ Technical Stack Recommendation
PWA (Client)
Layer	Choice	Rationale
Framework	Preact (or React) + TypeScript	Tiny bundle (~3KB), React-compatible
Build	Vite + PWA plugin	Fast dev, auto manifest/SW generation
State	Signals (@preact/signals) + IndexedDB	Reactive, minimal boilerplate
DB	Dexie.js	Type-safe IndexedDB wrapper
Sync	Custom + Background Sync API	Full control over conflict resolution
UI	Tailwind CSS + Headless UI	Utility-first, accessible components
Icons	Lucide (tree-shakable)	Consistent, lightweight
Testing	Vitest + Playwright	Unit + E2E
Backend (Server)
Layer	Choice	Rationale
Runtime	Node.js (Fastify) or Bun	Fast, TypeScript native
Database	PostgreSQL + Prisma	Relational, JSONB for flexible metadata
Auth	Clerk or Auth.js	SSO, MFA, org management
Real-time	Socket.io or Server-Sent Events	Live dashboard updates
Queue	BullMQ (Redis)	Background jobs (reports, sync)
Storage	S3-compatible (R2, MinIO)	Report files, exports
Deploy	Railway / Fly.io / Vercel	Simple, scalable
🚀 MVP Scope (4-6 weeks)
Must Have (P0)
 PWA installable, works offline
 Class roster sync (read-only from API)
 Quick-log: tap student → tap behavior → done
 Local IndexedDB storage with background sync
 Basic web dashboard: student list + incident counts
 Teacher auth (email/password + magic link)
 Export CSV for day/week
Should Have (P1)
 Notes on incidents (tap to expand)
 Severity override
 Interventions tracking
 Dashboard charts (trends, by category)
 Multi-class support for teacher
 Dark mode
Nice to Have (P2)
 Voice note attachment (Web Audio API)
 Photo evidence (camera API)
 Parent portal (read-only)
 Student self-reflection mode
 Automated parent notification emails
 SIS integration (Clever, ClassLink, OneRoster)
🔐 Privacy & Compliance
Requirement	Implementation
FERPA	No PII in localStorage; encrypted IndexedDB (Web Crypto API)
COPPA	No data collection from students directly
Data retention	Configurable (default 1 year); auto-purge job
Access control	RBAC: Teacher (own classes), Admin (all), Parent (own child)
Audit log	Immutable log of all data access/modifications
Export/Delete	GDPR-style data subject requests via dashboard
📊 Success Metrics
Teacher Adoption
Daily active teachers / Total teachers > 70%
Avg logs per class per day > 5
Sync success rate > 99%
Data Quality
Logs with notes (for severity 2+) > 80%
Duplicate rate < 2%
Time to log < 3 seconds (p50)
Impact
Reduction in office referrals (YoY)
Parent engagement (portal logins)
Intervention effectiveness tracking
🗓️ Suggested Sprint Plan
Sprint	Focus	Deliverable
1	Foundation	PWA shell, auth, roster API, IndexedDB schema
2	Core Logging	Quick-log UI, behavior categories, local persistence
3	Sync Engine	Background sync, conflict resolution, batch API
4	Dashboard v1	Student grid, filters, CSV export
5	Polish	Charts, dark mode, notes, interventions, testing
6	Beta Launch	Onboarding, docs, feedback loop, monitoring
💡 Innovative Ideas to Explore
Gesture-based logging: Swipe left on student card = "off task", swipe right = "talking"
Voice shortcuts: "Hey Monitor, log Alex talking" (Web Speech API)
Smart suggestions: "Alex has 3 talking incidents today - want to log a seat change intervention?"
Positive reinforcement: Separate "caught being good" button with different color scheme
Collaborative logging: Co-teachers see each other's logs in real-time
Pattern detection: ML-based "student trending toward referral" alerts
Seating chart view: Visual classroom map with heat indicators
Substitute mode: Read-only view with simplified logging for subs
❓ Open Questions for Stakeholders
Roster source: SIS integration (Clever/ClassLink) vs manual CSV upload?
Behavior categories: District-standardized or teacher-customizable?
Parent access: Read-only portal? Real-time notifications? Weekly digest emails?
Multi-device: Teacher uses phone + tablet + desktop? Sync strategy?
Offline duration: How long might teachers be offline? (Affects IndexedDB quota)
Data ownership: District owns data? Teacher can export personal logs?
Integration: LMS (Canvas, Google Classroom) gradebook sync?
Pricing model: Per teacher? Per school? Per district?
📁 File Structure (Monorepo)
text

behavior-monitor/
├── apps/
│   ├── pwa/                    # Teacher mobile app
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── stores/         # Signals + Dexie
│   │   │   ├── services/       # Sync, API, notifications
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   └── sw.js           # Custom service worker
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── dashboard/              # Admin/Teacher web dashboard
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── utils/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types, utilities, API client
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── api/
│   │   │   ├── constants/
│   │   │   └── validation/
│   │   └── package.json
│   │
│   └── ui/                     # Shared component library
│       ├── src/
│       └── package.json
│
├── backend/                    # API server (separate repo in practice)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── jobs/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── turbo.json                  # Turborepo config
├── package.json
└── README.md
🎬 Next Steps
Validate assumptions with 3-5 teacher interviews
Finalize behavior taxonomy with school psychologist/admin
Prototype quick-log interaction in Figma + test with teachers
Set up backend skeleton with auth + roster API
Build PWA shell with install prompt + offline indicator
Define sync contract (API schemas, versioning)
Document version: 1.0
Created: 2026-07-12
Status: Draft for stakeholder review