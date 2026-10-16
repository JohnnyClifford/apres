# Après - Development Log

## Week 2: Backend Core — Auth, RBAC, and Shift Scheduling

**Date:** October 17, 2026
**Student:** Johnny Clifford
**Project:** Après (Hospitality Shift & Tip Management)

### Overview
This week moved the project from planning into implementation. Focus was the backend foundation: authentication, role-based access control, and the first full feature slice (shift scheduling). By week's end: working register/login/me endpoints, RBAC middleware, shift CRUD with conflict and overtime detection, and 41 passing tests across 4 Jest suites.

### Key Learnings & Insights
*   **Business Logic Belongs in Pure Functions:** All shift conflict and overtime logic lives in `services/shiftService.js` as pure functions operating on plain objects. This enabled 100%-coverage unit tests without Express or MongoDB, and kept route handlers thin. The pattern will repeat for swaps and tips.
*   **Test Infrastructure Pays Off Immediately:** `mongodb-memory-server` in a shared `tests/setup.js` gives each test run an isolated database, flushed between tests. Setup cost ~20 minutes; mocking Mongoose would have taken longer and produced less realistic tests.
*   **Dependency Bloat Is a Productivity Tax:** The original `package.json` had ~250 entries, mostly transitive packages hoisted by mistake. Installs took ~25s and produced noise in `npm audit`. Trimming to direct dependencies only dropped installs to seconds and made audits actionable.

### Challenges Faced
*   **npm ETARGET on Aliased Packages:** After deleting `node_modules` and `package-lock.json`, `npm install` failed with `No matching version found for string-width-cjs@^4.2.3`. Root cause: `*-cjs` packages are aliases (`npm:string-width@^4.2.0`) and npm's resolver can't figure that out without a lockfile. Fixed with an `overrides` block in `package.json`.
*   **File Overwrite During Prototyping:** While writing integration tests for shifts, I pasted contents into `tests/shiftService.test.js` — already the unit test file — instead of creating `tests/shifts.test.js`. The unit tests were silently overwritten. Jest's summary ("3 suites, 25 tests" instead of 4 and ~40) surfaced it. Recovery meant rewriting the unit tests by hand because the file had never been committed.

### Actions Taken & Milestones
*   **Authentication End-to-End:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` using bcrypt + JWT. `passwordHash` is `select: false` on the User model so it can't leak.
*   **RBAC Middleware:** `requireAuth` and `requireRole(...roles)` in `middleware/auth.js`, applied at the route layer for declarative, testable permissions.
*   **Shift Vertical Slice Shipped:** `models/Shift.js`, `routes/shifts.js`, and `services/shiftService.js`. Service covers `hasOverlap`, `findConflict`, `weeklyHours`, and `wouldCauseOvertime` at 100%. Routes gated by `requireAuth` + `requireRole('manager', 'owner')`.
*   **Test Infrastructure:** Migrated to `mongodb-memory-server` with shared `tests/setup.js`. 41 tests across 4 suites in under 9 seconds. Overall 86% statements / 78% branches, 100% on the service layer.
*   **Dependency Hygiene:** Trimmed `package.json` to direct dependencies, resolved the npm resolver failure with `overrides`, confirmed clean install.

### Next Steps (Week 3)
*   **Availability + Swap Workflow:** Second vertical slice following the same pattern — pure service functions, unit tests, model, routes, integration tests.
*   **Error Handler Coverage:** Close remaining gap in `middleware/errorHandler.js` (4xx, 5xx, and `headersSent` branches).
*   **Socket.IO Scaffolding:** Wire the WebSocket server alongside Express. No feature work yet — just the transport.
*   **README Deployment Section:** Document the zero-cost stack (Render + Atlas + UptimeRobot), Node version divergence, and dependency hygiene work.