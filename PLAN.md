# Rental SaaS — Development Plan & Antigravity Prompts

Stack: Next.js + Tailwind (frontend) · NestJS (backend/API/business logic) · Supabase Postgres (database only) · Cloudflare R2 (property photo storage) · Stripe Connect (payments/payouts) · Google Maps (location display)

---



## Security Ground Rules (apply in every phase)

- Roles: `user` (default — browses, favorites, chats, rents, reviews properties) and `owner` (everything a `user` can do, **plus** a dashboard to manage their own properties, leases, payouts, and analytics). Everyone signs up the same way and starts as `user`; upgrading to `owner` is a self-service flow with a short form + email confirmation (see Phase 1) — not instant, but no admin approval needed either.
- Auth is custom, built in NestJS: access token (short-lived JWT, ~10-15 min, kept in frontend memory only — never localStorage) + refresh token (long-lived, sent as an httpOnly, Secure, SameSite=strict cookie only).
- Sessions table in Postgres stores a **hash** of each refresh token (never the raw token), with `user_id`, `expires_at`, `revoked_at`, device/user-agent info.
- **Refresh token rotation:** every refresh issues a new token and invalidates the old one. If a used/revoked token is presented again, revoke the entire session chain for that user (stolen-token replay defense).
- Rate-limit login and refresh endpoints specifically.
- All protected routes/services check role via the verified access token — no route relies on frontend hiding alone.
- Every Postgres query in NestJS must explicitly scope by ownership/role (no RLS safety net) — e.g. `WHERE owner_id = req.user.id` on every owner-facing query.
- Card data never touches your server — Stripe Checkout/Elements only.
- All Stripe webhooks verified with the signing secret before trusting any event.
- Every money-moving action (release payout, refund) must be idempotent and logged.
- Environment secrets (Stripe keys, DB credentials, JWT signing secrets, R2 keys, Google Maps API key) only in server-side/build-time env vars, never exposed to the client bundle where avoidable.

---

## Phase 1 — Foundation & Auth

**Goal:** Anyone can sign up/log in as a normal user; any user can later upgrade to owner through a short, confirmed flow.

Flow:
1. Visitor signs up — one single signup form for everyone. NestJS creates a `users` row (hashed password, `role` defaults to `'user'`).
2. Login issues a short-lived access token (JWT) + a refresh token as an httpOnly Secure cookie, and creates a row in `sessions` storing a hash of the refresh token.
3. Frontend keeps the access token in memory, attaches it to API calls, and silently calls `/refresh` before it expires.
4. `/refresh` validates the cookie against `sessions`, rotates it, and returns a new access token. Reused/invalid tokens revoke the whole session.
5. **Owner upgrade flow:** a logged-in user clicks "Become an Owner" → fills a short form (full name, phone number, agrees to owner terms) → submits. NestJS generates a one-time confirmation token (like a password-reset token, expires in 24h) and emails a confirmation link. Clicking it flips `role` to `'owner'` and unlocks the dashboard. Role does not change until the link is clicked.
6. NestJS guards check role on protected routes: owner-only routes require `role = 'owner'`; general routes just require being logged in.
7. Frontend shows a "Dashboard" link once a user is an owner, in addition to the normal app.

**Antigravity prompt for Phase 1:**
```
Build a Next.js 14+ frontend (App Router, TypeScript, Tailwind) with a separate NestJS backend (TypeScript, Postgres via Supabase used only as a database, TypeORM or Prisma).
In NestJS:
- Build a `users` table: id, email, password_hash, role ('user' | 'owner', default 'user'), phone, created_at.
- Build a `sessions` table: id, user_id, refresh_token_hash, expires_at, revoked_at, user_agent, created_at.
- Build an `owner_upgrade_requests` table: id, user_id, token_hash, expires_at, confirmed_at, created_at.
- Implement signup/login with bcrypt or argon2 password hashing. One signup flow for everyone, always creating role 'user'.
- On login, issue a short-lived JWT access token (10-15 min) and a refresh token set as an httpOnly, Secure, SameSite=strict cookie. Store only a hash of the refresh token in `sessions`.
- Implement a `/refresh` endpoint with rotation as before (revoke all sessions on reuse of an old token).
- Implement `/become-owner/request`: takes name + phone, creates an owner_upgrade_requests row with a hashed token (expires in 24h), emails a confirmation link containing the raw token.
- Implement `/become-owner/confirm?token=...`: looks up the token by hash, checks it's unexpired and unused, flips the user's role to 'owner', marks confirmed_at. If expired, let the user request a new one.
- Implement auth guards: owner-only routes require role = 'owner'; general routes just require a valid access token.
- Rate-limit login, refresh, and become-owner endpoints.
In Next.js: keep the access token in memory, call /refresh proactively, show the "Become an Owner" form + a "check your email" state, and show a "Dashboard" link once a user is an owner.
```

---

## Phase 2 — Property Listings (Owner-managed, no approval step)

**Goal:** Owners can add/manage their own properties, including bedrooms and a map location; listings go live immediately.

Flow:
1. Owner fills a "New Property" form: title, description, address, monthly rent, bedrooms, up to 5 photos, and a location (address or dropped pin) for Google Maps.
2. Photos upload directly to Cloudflare R2 via a presigned upload URL from NestJS; only public URLs are stored. **Max 5 photos**, enforced server-side (reject 6th+) and in the UI.
3. Property saves with `owner_id`, `status = 'active'` by default. Owners can toggle their own listings to `'inactive'` any time.
4. Only `active` properties are queryable by users; owners only see/manage their own listings — enforced in NestJS query logic everywhere (no RLS).
5. Listing page shows an embedded Google Map (Google Maps JS/Embed API using stored lat/long).
6. Owner dashboard lists all their properties with status.
7. **Availability display:** a property can have multiple future bookings as long as their date ranges don't overlap (e.g. booked Sept 1–30, free in October, booked again Nov 1–30). The listing page shows **all** upcoming booked ranges and **all** open gaps between them — not just the single next-available date — so a user can pick any open window, including ones further out.
8. **Bookable gate:** owners can create/edit listings right after becoming an owner — no need to finish bank setup first. But a listing only becomes *bookable* by users once the owner has completed Stripe Connect onboarding (has a `stripe_connect_id`). Until then, the listing shows publicly with a "not yet bookable" state instead of a working "Book Now" button.
9. **Edge case:** if a property is set `inactive` (or later deleted), it should no longer appear in search — but existing favorites and chat threads referencing it should still show, just marked "no longer available" instead of disappearing or erroring.

**Antigravity prompt for Phase 2:**
```
Add a `properties` table: id, owner_id (fk to users), title, description, address, latitude, longitude, monthly_rent, bedrooms (int), photos (array of text URLs, max 5), status ('active' | 'inactive'), view_count (int, default 0), click_count (int, default 0), created_at.
Set up an S3-compatible client for Cloudflare R2 for presigned photo uploads. Reject uploads past 5 photos per property.
Build owner endpoints/pages to create/edit their own properties (including bedrooms and a map location picker), toggle active/inactive, and view them in an owner dashboard.
Enforce in every service method: users only receive properties where status = 'active' for search/browse; owners only receive/manage their own properties. No RLS — enforce in code.
When a property is inactive, ensure existing favorites and chat threads that reference it still load, showing a "no longer available" state instead of breaking.
A listing is only bookable once its owner has a stripe_connect_id (completed Connect onboarding). If not, still show the listing publicly but disable "Book Now" and show a "not yet bookable" note.
Build an availability endpoint for a property: returns all upcoming booked date ranges (from active/pending leases) and all open gaps between them (today onward), so the frontend can show a full picture, not just the next single opening. Render this as the "availability strip" signature element from the Design Direction section (horizontal timeline, Clay = booked, Moss = open) on both the property card and detail page.
Build a property detail page embedding a Google Map via the Google Maps JavaScript API (needs a Google Maps API key env var).
Build a user-facing browse/search page with filters for city, price range, and bedrooms.
```

---

## Phase 3 — Booking / Lease Flow

**Goal:** User "rents" a property in fixed 30-day blocks (no partial months), one month charged at a time automatically, with no double-bookings and a clean cancellation path.

**Core rule — 1 "month" = a fixed 30-day block, not a calendar month.** A booking that starts on any date (the 1st, the 13th, the 28th — doesn't matter) runs for `months × 30` days from that start date. No partial-month bookings. A property can have several separate future bookings as long as their day-ranges don't overlap — it does not need to be fully idle to accept a new booking further out.

Flow:
1. User selects a property, a start date, and a number of months (1, 2, 3...).
2. **Availability check:** compute `end_date = start_date + (months × 30 days)`. Check for any existing `active` or `pending_payment` lease on the same property whose day-range overlaps `[start_date, end_date)`. If overlapping, block the booking with a clear message; otherwise it's allowed, even if the property has other bookings on different dates.
3. Create a `leases` row: `status = 'pending_payment'`, storing `start_date`, `months`, computed `end_date`.
4. Redirect to Stripe Checkout for the first 30-day block's rent.
5. On successful webhook (`checkout.session.completed`), flip lease to `'active'` and create a `payments` row for that first 30-day block (see Phase 4 for the release-date formula).
6. **Automatic recurring charges:** the user is charged automatically for each subsequent 30-day block as it comes due (via Stripe Subscription or a scheduled job that creates the next charge when the previous block ends) — no manual repayment needed from the user each month.
7. **Missed/failed payment (kept simple — no grace period):** if an automatic charge for the next block fails, the lease is marked `'cancelled'` from that point forward and the property becomes available again for that date range. Already-paid, already-occupied blocks are unaffected.
8. **Cancellation/refund:** if a user cancels before their move-in date, or an owner cancels a lease, mark the lease `'cancelled'` and trigger a Stripe refund for any payment not yet released to the owner. If a payment has already been released to the owner, it's out of scope for an automatic refund (flag for manual handling).

**Antigravity prompt for Phase 3:**
```
Add `leases` (id, user_id, property_id, start_date, end_date, months, status ('pending_payment' | 'active' | 'cancelled' | 'ended'), monthly_rent, stripe_subscription_id) and `payments` (id, lease_id, period_start, period_end, amount, stripe_payment_intent_id, status, hold_release_at, released_at) tables. Enforce in NestJS service code (no RLS) that users only see their own leases/payments, and owners only see leases/payments on their own properties.
Treat 1 "month" as a fixed 30-day block (not a calendar month). On booking, compute end_date = start_date + (months * 30 days).
Before creating a lease, check for overlapping active/pending_payment leases on the same property against [start_date, end_date); reject with a clear error if found. Multiple non-overlapping future bookings on the same property are allowed.
Build the booking flow: user picks property + start_date + months -> availability check -> create lease 'pending_payment' -> redirect to Stripe Checkout for the first 30-day block -> on webhook 'checkout.session.completed', mark lease 'active', insert a payments row with period_start = lease.start_date, period_end = period_start + 30 days.
Set up automatic recurring billing for the remaining blocks (Stripe Subscription with a 30-day interval, or a scheduled job that creates the next 30-day charge when the previous period_end passes) so the user is charged automatically without manually repaying each month. On each successful recurring charge, insert a new payments row for that block.
If a recurring charge fails, mark the lease 'cancelled' from that point forward (no grace period) — the property becomes bookable again for dates after the last successfully paid block.
Build a cancellation endpoint: user or owner can cancel a lease before/soon after start; mark lease 'cancelled'; if the related payment hasn't been released yet (released_at is null), issue a Stripe refund; if already released, flag for manual review instead of auto-refunding.
Verify all Stripe webhooks with the signing secret before processing.
```

---

## Phase 4 — Stripe Connect: Hold & Auto-Release Payouts

**Goal:** Rent collected → held until just after move-in → auto-paid to property owner, correctly for every month of the lease.

Flow:
1. Owner completes Stripe Connect Express onboarding (KYC) before receiving payouts — store `stripe_connect_id` on their `users` row.
2. Set their connected account's payout schedule to manual.
3. **Release formula (per payment, not per lease):** each `payments` row has its own `period_start` (the 30-day block it covers). `hold_release_at = period_start + 3 days`. For block 1, `period_start = lease.start_date`. For block 2, `period_start` = 30 days after that, and so on — so every block's rent releases 3 days after *that block's* start, not 3 days after the original booking date or the original lease start.
4. A daily scheduled job finds payments past `hold_release_at`, not yet `released_at`, with no open dispute or cancellation, **and where the owner has a `stripe_connect_id`** — calls the Transfers API to pay the owner, then sets `released_at`. If the owner has no `stripe_connect_id` yet, the payment is simply skipped and stays pending — it just naturally accumulates until they connect a bank, no separate handling needed.
5. Disputed or cancelled payments are skipped until resolved; owners see disputes on their own payments in their dashboard.
6. **Wallet (owner dashboard):** no separate money-holding system is built — the wallet is just two read-only totals computed from the existing `payments` table:
   - **Pending balance** = `SUM(amount) WHERE released_at IS NULL` (still in the 3-day hold, or owner hasn't connected a bank yet).
   - **Approved/withdrawable balance** = `SUM(amount) WHERE released_at IS NOT NULL` (already transferred to their Stripe Connect balance).
   If the owner has no `stripe_connect_id`, show a banner: "Attach your bank account to receive your pending balance."

**Antigravity prompt for Phase 4:**
```
Implement Stripe Connect Express onboarding for property owners, storing stripe_connect_id on their user row. Configure connected accounts for manual payout schedule.
On payments, compute hold_release_at = period_start + 3 days, where period_start is that specific month's start date (lease.start_date for month 1, and one month later for each subsequent month's payment) — not the date the payment was made or the original lease start date reused for every month.
Add a `disputes` table (payment_id, reason, status, created_at). Owners see disputes tied to their own properties/payments in their dashboard (owner_id scoping, no RLS).
Build a daily scheduled job: finds payments with hold_release_at in the past, released_at null, lease status not 'cancelled', no open dispute, and owner has a stripe_connect_id -> calls Stripe Transfers API to release funds to the owner's connected account -> updates released_at. If the owner has no stripe_connect_id, leave the payment as-is (it stays "pending" and is picked up automatically once they connect). Idempotent (safe to re-run without double-paying).
Build a wallet endpoint returning two numbers for the logged-in owner: pending balance (SUM(amount) WHERE released_at IS NULL) and approved balance (SUM(amount) WHERE released_at IS NOT NULL), scoped to that owner's properties only.
```

---

## Phase 5 — Owner Dashboard, Analytics & Notifications

**Goal:** Owners get a clear picture of how their properties are performing.

Flow:
1. Dashboard shows: each property's status, active leases, upcoming payouts, disputes needing attention.
2. A wallet section at the top: **Pending** balance and **Approved (withdrawable)** balance (from Phase 4). If no bank is connected yet, show a banner prompting Stripe onboarding.
3. Analytics per property: view count, click count, and a simple monthly income chart (sum of released payments per month).
4. Email notifications (payment received, payout released, lease ending soon, dispute opened, cancellation/refund processed) via Resend/Postmark.

**Antigravity prompt for Phase 5:**
```
Build an owner dashboard page showing: a wallet section (pending balance, approved/withdrawable balance, and a "connect your bank" banner if no stripe_connect_id yet), property list with status, active leases, upcoming payouts, open disputes. Follow the Design Direction system (card anatomy, tabular numerals for the wallet figures, Moss/Rust-Red for available/dispute states).
Add view/click tracking: increment view_count on property detail page load, click_count when a user clicks through from search results. Show these per property, plus a monthly income chart from released payments grouped by month.
Add email notifications (Resend or Postmark) for: payment received, payout released, lease ending soon, dispute opened, and cancellation/refund processed.
```

---

## Phase 6 — Search & Discovery

**Goal:** Users can find relevant properties quickly, and save ones they like.

Flow:
1. Search/filter by city, price range, and bedrooms.
2. Favorites: users can bookmark a property; see a "My Favorites" list. Favorited properties that later go inactive still show, marked "no longer available."

**Antigravity prompt for Phase 6:**
```
Add a `favorites` table: id, user_id, property_id, created_at (unique on user_id + property_id).
Build a "favorite" toggle on property cards/detail pages, and a "My Favorites" page. If a favorited property is inactive, show it with a "no longer available" label instead of hiding or erroring.
Refine search page filters (city, price range, bedrooms) for usability (clear filter chips, empty-state messaging).
```

---

## Phase 7 — Reviews & Ratings

**Goal:** Build trust between users and owners after a lease ends.

Flow:
1. Once a lease's status is `'ended'` (not `'cancelled'`), the user who held it can leave a rating + short review for that property.
2. Reviews are shown on the property's public listing page.

**Antigravity prompt for Phase 7:**
```
Add a `reviews` table: id, lease_id (fk), user_id, property_id, rating (1-5), text, created_at.
Only allow a review if user_id matches the lease's user_id and the lease status is 'ended' (not 'cancelled').
Show average rating + reviews list on each property's public detail page.
```

---

## Phase 8 — In-App Chat

**Goal:** Users and owners can message each other before booking.

Flow:
1. A user viewing a property can start a chat with the owner.
2. Simple message thread tied to a property + the two participants. If the property later goes inactive, the thread stays accessible (marked "no longer available") for historical reference.

**Antigravity prompt for Phase 8:**
```
Add a `messages` table: id, property_id, sender_id, receiver_id, text, created_at.
Build a "Message Owner" button that opens/continues a thread; enforce in NestJS that only the two participants can read/write it. If the property is inactive, still show the thread with a "no longer available" label rather than hiding it.
```

---

## Phase 9 — Testing & Staging

- Use Stripe test mode + test connected accounts end-to-end before going live.
- Test the dispute path (fake a dispute, confirm the release job skips it).
- Test the per-block release formula across a multi-month lease (confirm block 2, 3, etc. release relative to their own period_start, not the original booking date).
- Test 30-day block math for bookings starting on various dates (1st, 15th, 28th) and across month-end boundaries.
- Test the overlapping-booking rejection, and confirm non-overlapping future bookings on the same property are still allowed.
- Test automatic recurring charges (block 2, 3 charged without manual user action) and the auto-cancel behavior on a failed recurring charge.
- Test cancellation/refund for both pre-release and post-release payments.
- Test the owner-upgrade email confirmation flow (valid token, expired token, reused token).
- Load-test NestJS ownership/role checks with multiple user and owner accounts to confirm no data leakage (no RLS — the only backstop, test thoroughly).

## Phase 10 — Launch

- Switch Stripe to live mode.
- Final audit of every service method touching `properties`, `leases`, `payments`, `messages`, `reviews`, and `favorites` to confirm ownership/role scoping is present on every query.
- Confirm all secrets (Stripe, R2, DB, JWT, Google Maps, email provider) are server-side/env-only, never in the client bundle.

---

