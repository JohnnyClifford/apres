# Après - Development Log

## Feature Completion, Design System & Deployment

**Date:** October 23, 2026
**Student:** Johnny Clifford
**Project:** Après (Hospitality Shift & Tip Management)

### Overview
This week moved the project from "backend core + partial frontend" to a complete,
deployed full-stack application. Highlights: swapped the generic Tailwind
starter look for a custom design system, shipped the complete time-off workflow
(two distinct features), two-way shift swaps, owner dashboard tools, and
delivered to production on Vercel + Render. Tests grew from 41 to 125 across
13 suites.

### Key Learnings & Insights
*   **Design Is Not Decoration:** I started with stock Tailwind utility classes
    and it looked like a tutorial project. Replacing them with a small set of
    primitives (Hero, Card, Button) and a custom palette (forest/cream/ink)
    changed the perceived quality far more than adding features did. The lesson:
    consistent primitives beat 100 individual utility-class choices.
*   **Two "Availability" Concepts Are Not One:** Originally I built a single
    availability page. It was wrong. Standing unavailability ("I never work
    Tuesday mornings") and dated time-off requests ("I need Nov 3rd off") are
    different mental models with different data shapes and different approval
    flows. Splitting them into two models (WeeklyAvailability vs Availability)
    was correct even though it doubled the work.
*   **Real Bugs Teach More Than Tests I Wrote for Tests' Sake:** Three bugs came
    from AI-generated code that passed tests but broke in the browser:
    *   A Socket.IO DM broadcast that leaked private messages to every connected
        socket (the frontend hid them, but the raw WebSocket frame included them).
        Fixed by using per-user rooms (`user:<id>`).
    *   An empty-string `assignedTo` field that crashed shift creation with a
        CastError, because the frontend sent `""` and Mongoose tried to cast it
        to an ObjectId.
    *   A `validateSwapRequest` service function that existed but was never
        called from the route, meaning self-swaps and duplicate pending swaps
        weren't rejected despite having code to reject them.
    Each became a regression test. This is why "AI wrote it" isn't a substitute
    for "I reviewed it."

### Challenges Faced
*   **Vercel SPA Routing Desync (Ongoing):** The deployed frontend returns 404
    on direct URL refresh of sub-pages (e.g. `/weekly-availability`). Tried
    multiple `vercel.json` configurations, root-directory variations,
    `cleanUrls` settings, and a fresh Vercel project — all hit the same
    platform-level issue. Documented honestly in the README with a "reviewer
    note" explaining that in-app navigation works perfectly. It's a known
    platform limitation, not a code bug, and I've accepted the trade-off
    rather than chasing it further.
*   **AI-Generated Code Requires the Same Rigor as My Own:** Using Codex to
    accelerate feature implementation was effective but not free. Several times
    it dropped existing code, duplicated imports, or wrote tests referencing
    helper functions that didn't exist. The counter-move: commit before every
    Codex run, run `npm test` after every Codex run, and treat "the build
    passes" as necessary but never sufficient. Browser verification remained
    essential.
*   **Scope Discipline Late in the Project:** When a new idea arrived (e.g.
    "should there also be manager availability viewing?", "should availability
    be a grid instead of a list?"), the temptation to keep building was strong.
    The discipline that helped: write the idea in the README's Future Work
    section, ship what's working, and don't refactor across files in the last
    week.

### Actions Taken & Milestones
*   **Design System + Full Redesign:** Built `Hero`, `Card`, `Button` primitives
    and a forest/cream/ink palette. Applied consistently across Login,
    Register, Dashboard, Settings, Tips, UserManagement, Availability,
    WeeklyAvailability, and TimeOffApprovals.
*   **Two-Way Shift Swaps:** `SwapRequest` model with optional `requestedShift`.
    On manager approval, both shifts exchange `assignedTo`. Conflict re-validated
    at approval time (in case schedules changed while pending).
*   **Tip Pooling Completion:** Three strategies (hours, role-weighted, hybrid)
    with integer-cents arithmetic and the Largest Remainder Method. Staff payout
    page shows pool total, hours worked, and their cut.
*   **Time Off Workflow (Two Features):**
    *   **Time Off Requests:** Month calendar with date selection, status states
        (pending/approved/rejected), delete for pending/rejected, set-based
        change detection for "has this been modified?" detection.
    *   **Weekly Unavailability:** Standing block-based restrictions with "fully
        available by default" semantics.
    *   **Manager Approval Queue:** Pending requests queue with week navigation
        and approve/reject actions, backed by Socket.IO events for real-time
        updates.
*   **Owner Tools:** Data-driven venue settings (replaced hardcoded "Main
    Restaurant"), user role management (with self-change prevention at both
    backend and UI levels), coverage alerts for unassigned shifts, pending time
    off alert card on Dashboard.
*   **Real-Time Chat:** Public channel + private DMs scoped via Socket.IO rooms.
    Messages persist to MongoDB. Per-user room registration on socket connect.
*   **Bug Fixes + Regression Tests:**
    *   Error handler now returns 400 for CastErrors (was 500).
    *   `assignedTo: ''` coerced to null at the route layer.
    *   `validateSwapRequest` wired into the swap POST route.
    *   Socket.IO DM leak fixed with per-user rooms.
    *   Added regression tests for each of the above.
*   **Deployment:** Frontend on Vercel, backend on Render (free tier), database
    on MongoDB Atlas (M0). CORS locked to the production Vercel URL. Render
    free-tier cold start documented in the README.

### Next Steps (Post-Submission)
*   **Fix Vercel SPA routing:** Likely requires migrating the frontend to
    Netlify or Cloudflare Pages, both of which handle SPA fallbacks reliably.
    Alternatively, contact Vercel support about the routing desync.
*   **Multi-venue support:** The app is single-venue per deployment. Adding a
    `Venue` model with per-venue scoping would require schema changes and a
    tenant selector at login.
*   **Overnight availability ranges:** Currently blocked by same-day validation.
    Would require splitting into two ranges (22:00–23:59 + 00:00–02:00) on save.
*   **Drag-and-drop shift scheduling:** Currently form-based. `react-dnd` or
    `dnd-kit` would make the calendar interactive.
*   **CI/CD:** GitHub Actions running `npm test` on every push. Would have
    caught at least two of the AI-generated regressions before they reached
    the browser.