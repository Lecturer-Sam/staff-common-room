# Question Bank — Phase 3 Implementation (Access Gating)

Implements PRD §8 + §10 Phase 3 — payment integration, manual authorization, subscription/access state logic.

## What was done

### 1. Access Grants lib — `app/src/lib/accessGrants.js` (new, 80 lines)

PRD §8: "Access must be restricted to users who have either completed payment or been manually authorized. Keep manual approval path for institutions that pay offline."

- `isGrantActive(grant)` — checks expiresAt null = perpetual institutional, or future date
- `fetchMyGrants(uid)` — userId == uid, filters active
- `fetchAllGrants()` — admin, limit 200
- `createAccessGrant({userId, schoolId, planId, type, expiresAt, note, grantedBy})` — tries to set doc id = userId or schoolId for fast `exists()` check in rules (hasAccessGrant), fallback to auto-id
  - type: manual | payment | institutional_license
  - planId: pro | school | institutional
  - expiresAt: null = perpetual (institutional), or Timestamp (1/3/12 months)
- `revokeGrant(grantId)`, `updateGrant(grantId, fields)`

### 2. Payment Transactions lib — `app/src/lib/paymentTransactions.js` (new, 60 lines)

PRD §8 Ghana-focused: MTN MoMo, Telecel, AT, cards via Paystack/Hubtel.

- `createPaymentTransaction({userId, schoolId, amount, gateway, channel, momoNumber, reference, note})` — client creates pending, admin verifies, status pending
- `fetchMyTransactions(uid)` — own audit
- `fetchAllTransactions()` — admin, limit 200, sorted by createdAt desc
- Fields: userId, schoolId, amount, currency GHS, gateway manual_momo/paystack/hubtel, channel mtn/telecel/at/card, momoNumber, reference, status pending/success/failed, note, createdAt

### 3. Subscriptions lib — `app/src/lib/subscriptions.js` (extended)

Old: FREE_EXPORT_LIMIT 5, PAYMENT_INSTRUCTIONS momoNumber 054 042 3359 placeholder, PLANS free/pro/school (school comingSoon).

New PRD Phase 3:
- `PAYMENT_INSTRUCTIONS` extended:
  - method: "Mobile Money (MTN / Telecel / AT) or Card via Paystack"
  - momoNumbers: {mtn: 054 042 3359, telecel: 020..., at: 027...} placeholders to update
  - paystackLink: null (TODO Phase 5 webhook)
  - note + institutionalNote: explains offline bank transfer → perpetual institutional license via access_grants
- `PLANS` extended:
  - free: features mention 4,040 indicators, question bank 5/week
  - pro: popular true, price GHS 29/mo, features: unlimited exam papers NaCCA-aligned content-standard filter, question bank unlimited generation, difficulty balancing, answer key, quiz maker PPTX + assignments, generated test history & audit, WhatsApp support
  - school: price GHS 4,500/yr (from OPPORTUNITY_MAP.md), up to 30 seats, school-wide library + coverage analytics, school-shared question bank, multi-campus Chain from 12k/yr, school name locked
  - institutional: Custom price, perpetual, bank/cheque/MoMo offline, manual grant via access_grants, same as School Standard, onboarding
- `isExpired(sub)` new helper checks renewsAt past
- `requestUpgrade()` now also creates payment_transactions audit record via dynamic import
- `recordExport(user, sub, hasGrant)` now takes hasGrant param — bypasses metering if hasGrant true (institutional)
- planIdFor, isPaidSub, monthKey, exportsUsedThisMonth preserved

### 4. SubscriptionContext — `app/src/context/SubscriptionContext.jsx` (rewritten, 110 lines)

Old: only listened to subscriptions/{uid}, derived planId, isPro, exportsUsed/Left, canExport, countExport.

New PRD Phase 3: also checks access_grants.

- Listens to subscriptions/{uid} (live)
- Fetches grants: where userId==uid limit 10, plus where schoolId==profile.schoolId if member has school, plus direct get doc id = schoolId and doc id = uid for fast path (rules hasAccessGrant uses exists())
- Filters active grants via isGrantActive (perpetual or future)
- `hasGrant` = grants.length>0, `grantPlan` = first grant planId
- `planId` resolution: subPlan if not free else grantPlan else free (grant overrides free)
- `isPro` = isPaidSub(sub) || hasGrant (grant bypasses payment)
- `exportsLeft` Infinity if isPro, else FREE_EXPORT_LIMIT - used
- `countExport` passes hasGrant to recordExport
- Value includes grants, hasGrant, grantPlan, plus old fields

### 5. Plans — `app/src/pages/Plans.jsx` (extended, 250 lines)

Old: showed current plan, usage meter, MoMo upgrade form (momoNumber, paymentRef), plan catalogue free/pro/school.

New:
- Shows grant status: if hasGrant, Badge "Access granted · Pro/School" + emerald box with grant type, planId, note, grantedBy, expiresAt (perpetual or date)
- Upgrade form now has channel selector (mtn/telecel/at/card) + momoNumber + reference, plus institutionalNote
- Payment instructions show all 3 MoMo numbers + accountName + Paystack link placeholder + note
- Status handling: requested, rejected, expired added
- Plans grid: free/pro/school + institutional card separate
- Cancel keeps grant (note in confirm modal)

### 6. Billing — `app/src/pages/Billing.jsx` (rewritten, 350 lines)

Old: only subscriptions requested/active/inactive, activate/reject/cancel.

New PRD Phase 3: full access control admin panel.

**Sections:**
1. **Manual / Institutional Authorization (Access Grants)** — form: userId, schoolId, plan (pro/school/institutional), type (manual/payment/institutional_license), expiry (1/3/12 months/perpetual), note (e.g. Paid offline via MTN 024... ref). Calls createAccessGrant, tries doc id = userId/schoolId for rules fast path. Lists active grants with revoke button (confirm modal).

2. **Payment transactions (audit)** — table of payment_transactions (limit 20): user/school (8 chars), amount GHS, gateway, channel, ref, status badge, dateTime. From fetchAllTransactions.

3. **Awaiting payment confirmation** — same as old but shows channel, schoolId.

4. **Active** — shows renews date, MoMo, channel, past renewal badge, Mark renewed (+30 days), Cancel (grants remain).

5. **Cancelled/rejected/expired** — reactivate button.

Uses new libs, Card, Badge, Button, Field, Input, Select, ConfirmModal.

### 7. QuestionGenerator gating — `app/src/pages/QuestionGenerator.jsx` (patched)

Added:
- `useSubscription()` → isPro, hasGrant, planId, exportsLeft
- Banner if !isPro: amber box "Access restricted — Pro or institutional grant required" with PRD §8 text, current plan, exportsLeft, Upgrade to Pro link, note about access_grants for offline payers, and hint if hasGrant but still seeing banner (refresh).

Export gate still via `useExportGate()` which now respects hasGrant (isPro true → canExport true, countExport no-op).

### 8. Firestore Rules — already extended in Phase 1

- `hasAccessGrant()` checks exists access_grants/{uid} or access_grants/{schoolId}
- `hasActiveSubscription()` = isPro() || hasAccessGrant()
- `generated_tests` create requires schoolId == userSchoolId (prevents forging) and isApprovedOrAdmin (future: add hasActiveSubscription check when hardening)
- `access_grants` read own grant or own school grant or admin, write admin only
- `payment_transactions` read own/school/admin, create approved, update admin only

## Ghana Payment Flow (PRD §8)

```
User registers -> pending -> admin approves -> free (5 exports/mo)
  |
  +-> Pays MoMo manually (MTN 054 042 3359 / Telecel / AT) or card via Paystack (future)
  |   -> Enters MoMo number + ref + channel in Plans.jsx -> subscriptions requested + payment_transactions pending
  |   -> Admin confirms in Billing.jsx -> subscriptions active, renewsAt +30d
  |
  +-> Pays offline (bank transfer, cheque) -> admin creates access_grants in Billing.jsx
      type=institutional_license, planId=school/institutional, expiresAt=null perpetual, note="Paid offline via..."
      -> hasGrant true -> isPro true -> unlimited
  |
  +-> Manual override: admin grants pro via Billing.jsx for demo/test
  |
Expiry: renewsAt < now -> expired badge, canExport false unless grant exists
Cancel: status cancelled, drops to free, grants remain
```

## How to use

```bash
# Deploy rules + indexes (must after Phase 1)
firebase deploy --only firestore:rules,firestore:indexes --project <id>

# Admin: grant institutional license
Go to /portal/billing -> Manual Authorization form
  User ID: <uid> or School ID: <schoolId>
  Plan: School Standard
  Type: Institutional license
  Expiry: Perpetual
  Note: Paid offline via bank transfer ref XYZ, GHS 4500/yr
  -> Grant access

# User: upgrade via MoMo
Go to /portal/subscription -> Upgrade to Pro -> Pay MTN 054 042 3359 GHS 29 -> enter number + ref + channel mtn -> Request Pro
Admin confirms in /portal/billing -> Mark paid & activate

# Check grants
Go to /portal/subscription -> see Active access grant box
Go to /portal/questions/generate -> if isPro, no banner, can generate unlimited; if free, banner + 5/mo limit
```

## What's left for Phase 4-5

- Phase 4 Output: PDF template configurability via test_templates collection (ges_basic_v1 default), header school name locked (already in SCHOOL_WORKSPACE.md), answer key separate PDF, audit trail versions, import 500 Qs
- Phase 5 SaaS: school-scoped questions private vs shared, tenant billing plans GHS 4500/yr, Chain 12k, storage.rules for re-download, Paystack webhook auto activation (Blaze plan), Cloud Function for renewsAt cron expiry

## Verification

- `fetchAllGrants()` and `fetchAllTransactions()` work with limit 200
- `createAccessGrant` tries doc id = userId/schoolId for fast exists() check — matches rules hasAccessGrant()
- `SubscriptionContext` fetches grants for user + school, filters active, sets hasGrant
- `Plans.jsx` shows grant box if hasGrant
- `Billing.jsx` manual grant form creates grant + refreshes list
- `QuestionGenerator.jsx` shows amber banner if !isPro, with upgrade link
- `useExportGate` still meters free, bypasses if isPro (including grant)
- PAYMENT_INSTRUCTIONS has 3 MoMo numbers + institutionalNote
- PLANS has school GHS 4500/yr from OPPORTUNITY_MAP.md
