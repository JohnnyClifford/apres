# Apres

A full-stack web application for hospitality shift scheduling, team communication, and tip distribution.

> **Status:** Capstone Project — Complete

**Live App:** https://apres-theta.vercel.app  
**Live API:** https://apres-api.onrender.com/api/health  
**Repository:** https://github.com/JohnnyClifford/apres

---

##  Reviewer Note

**Please log in via the root URL and navigate using the in-app buttons.**

Due to a known edge-routing limitation on Vercel's free tier with this monorepo configuration, directly refreshing a sub-page (e.g. `/weekly-availability`) may return a Vercel 404 page. **The application is fully functional — every route works via in-app navigation.**

**Cold Start:** The backend runs on Render's free tier. The first request may take up to 50 seconds to wake the server. 

---

## Project Overview

Having spent years working in hospitality, I know the rhythm of a shift well: the rush, the handoff, the after-work debrief. I also know its frustrations. Schedules are poorly formatted. Shift swaps are facilitated in a largely dormant group chat. Tips are divided on a seemingly random basis.

Apres is a full-stack web application that brings shift scheduling, team communication, and tip distribution into one place. It's designed around the three roles that define hospitality work: Manager, Staff, and Owner. Where enterprise tools like 7shifts and HotSchedules are expensive and over-engineered for small teams, Apres is built for the 10-50 person venue that just needs something that works.

The name comes from *après-ski* — the tradition of gathering after the work is done. That's the spirit of the app: a shared space that keeps a team connected before, during, and after every shift.

---

## Features

### Fully Implemented

**Role-Based Access Control (RBAC)**
- Three distinct role experiences: Owner, Manager, Staff
- Owner: venue settings, user role management, coverage alerts, manager tools
- Manager: shift CRUD, swap approvals, time-off approvals, tip calculation
- Staff: view own shifts, request swaps, submit time-off and unavailability, tip payouts, chat

**Shift Scheduling**
- Three view modes: List, Calendar, By Day roster
- Week-by-week navigation with "Back to current week" shortcut
- Per-user filtering (staff default to "My shifts", managers get a staff dropdown)
- Automatic conflict detection (double-booking, overlap)
- Weekly overtime warnings
- Full CRUD with edit modal and delete confirmation

**Shift Swaps**
- Two-way trade requests (offer my shift, request yours)
- Conflict validation at request and approval time
- Manager approval queue
- Real-time updates via Socket.IO

**Time Off Workflow** (two distinct features)
- **Time Off Requests:** Full month calendar with date selection, status states (pending/approved/rejected), delete for pending/rejected
- **Weekly Unavailability:** Standing block-based restrictions (default: fully available, mark blocks you cannot work)
- **Manager Approval Queue:** Review pending requests with week navigation, approve/reject with real-time updates

**Tip Pooling**
- Three configurable strategies:
  - *Hours-based:* Proportional to hours worked
  - *Role-weighted:* Hours × role-specific weight
  - *Hybrid:* Flat base per shift + hours-weighted remainder
- Integer-cents arithmetic with the Largest Remainder Method for exact distributions
- Staff payout transparency: shows pool total, hours worked, strategy applied
- Manager can save distributions as immutable snapshots

**Team Chat**
- Public team channel
- Private DMs, scoped via Socket.IO rooms (only sender + recipient receive)
- Real-time message delivery
- Persistent history via MongoDB

**Owner Tools**
- Venue settings (data-driven — no more hardcoded "Main Restaurant")
- User role management (promote/demote between staff/manager/owner)
- Coverage Alert: flags unassigned shifts in next 7 days
- Pending Time Off alert with real-time count

**Real-Time Infrastructure**
- Socket.IO for shift updates, swap notifications, chat messages, and pending approval counts
- Per-user rooms for DM privacy

### Out of Scope
- Push notifications, native mobile app, payment processing, multi-location tenancy

---

## Technologies Used

### Frontend
- **React 19** (Vite 8)
- **React Router 7** (client-side routing)
- **Redux Toolkit 9** (state management)
- **TailwindCSS v4** (custom design system: forest/cream/ink palette, Hero + Card components)
- **Socket.IO Client** (real-time updates)
- Instrument Serif + Inter fonts (Google Fonts)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT + bcrypt
- Jest + Supertest
- Helmet, CORS, express-rate-limit

### Infrastructure
- **Frontend Host:** Vercel
- **Backend Host:** Render (free tier)
- **Database:** MongoDB Atlas (M0 free tier)

---

## Installation Instructions

### Prerequisites
- Node.js v18 or higher
- MongoDB Atlas account (or local MongoDB instance)

### Backend Setup

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MONGODB_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev
```

API will be available at `http://localhost:5000`.

### Frontend Setup

```bash
cd client
npm install
cp .env.example .env
# Edit .env with VITE_API_URL=http://localhost:5000/api
npm run dev
```

Frontend will be available at `http://localhost:5173`.

---

## Testing

The backend uses Jest and Supertest with MongoDB Memory Server for isolated integration testing.

```bash
cd server
npm test
```

**Current Status:** 125 tests passing across 13 test suites.

**Coverage Areas:**
- Authentication (register, login, JWT verification)
- RBAC (role-based route protection, self-change prevention)
- Shifts (CRUD, conflict detection, overtime)
- Swaps (two-way trades, state machine transitions)
- Availability + Weekly Unavailability (upsert, range validation)
- Time Off (submission, status transitions, delete)
- Tips (all three strategies with integer-cents accuracy)
- Settings (venue name, role management)
- Error handling (CastError → 400, validation → 400)

---

## API Reference

Base URL (dev): `http://localhost:5000/api`

All authenticated routes require: `Authorization: Bearer <jwt>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create account |
| POST | `/auth/login` | public | Obtain JWT |
| GET | `/auth/me` | any | Current user |
| GET | `/auth/users` | any | List all users |
| PATCH | `/auth/users/:id/role` | owner | Change a user's role |
| GET | `/shifts` | any | List shifts |
| POST | `/shifts` | manager, owner | Create shift |
| PATCH | `/shifts/:id` | manager, owner | Update shift |
| DELETE | `/shifts/:id` | manager, owner | Delete shift |
| GET | `/availability/me` | any | Own time off for a week |
| PUT | `/availability/me` | any | Upsert own time off |
| DELETE | `/availability/:id` | any | Delete pending time off |
| GET | `/availability/pending` | manager, owner | Pending requests queue |
| PATCH | `/availability/:id/status` | manager, owner | Approve/reject time off |
| GET | `/availability/week` | manager, owner | All time off for a week |
| GET | `/weekly-availability/me` | any | Own standing unavailability |
| PUT | `/weekly-availability/me` | any | Upsert standing unavailability |
| GET | `/weekly-availability/all` | manager, owner | All staff unavailability |
| POST | `/swaps` | any | Request a shift swap |
| GET | `/swaps` | any | List swaps (scoped by role) |
| PATCH | `/swaps/:id` | manager, owner | Approve/reject swap |
| POST | `/tips/calculate` | manager, owner | Preview tip distribution |
| POST | `/tips/distribute` | manager, owner | Save tip distribution |
| GET | `/tips/my-payouts` | any | Own tip payout history |
| GET | `/settings` | any | Venue settings |
| PUT | `/settings` | owner | Update venue name |
| GET | `/chat` | any | Chat history |

### Socket.IO Events
- `shift:created`, `shift:updated`, `shift:deleted` — broadcast to all connected clients
- `swap:requested`, `swap:updated` — broadcast to all clients
- `chat:message` — broadcast to all (public) or specific rooms (DMs)
- `availability:requested` — notifies managers of new time off submissions

---

## Architectural Decisions

**Layered Backend**
Controllers stay thin. Business logic (conflict detection, swap state machine, tip math) lives in `services/` as pure functions, making it unit-testable without HTTP or a database.

**RBAC as Middleware**
A single `requireRole([...])` middleware replaces scattered permission checks. Testable in isolation.

**JWT in Authorization Header**
Simpler for a portfolio demo than httpOnly cookies. Trade-off: slightly more XSS-exposed. Mitigated by short expiry and CORS locked to the client origin.

**Per-User Socket Rooms for DMs**
Private messages are scoped via Socket.IO rooms (`user:<id>`), so the raw WebSocket frame is never broadcast to unauthorized clients. The frontend filter is defense-in-depth, not the primary protection.

**WeeklyAvailability vs. Time Off Requests**
Two separate models for two distinct concepts:
- `WeeklyAvailability`: standing pattern (e.g., "I never work Tuesday mornings"). One record per user. No approval.
- `Availability`: dated requests (e.g., "I need Nov 3rd off"). One record per user per week. Requires manager approval.

**Zero-Cost Stack**
Render's free tier sleeps on idle. The README notes cold starts so reviewers aren't surprised.

**Custom Design System**
Rather than shipping default Tailwind utility classes, built a small Apple-Hospitality-inspired design system (`Hero`, `Card`, `Button` primitives + forest/cream/ink palette) applied consistently across all pages.

---

## Known Limitations

- **SPA Refresh on Vercel:** Direct URL refresh on sub-pages returns Vercel's 404 due to platform-level routing desync with this monorepo. Navigation through the UI works perfectly. Documented here for transparency.
- **Overnight time ranges:** Availability and time off ranges must end after they start (same-day). An overnight shift like 22:00–02:00 would need to be split into two ranges.
- **Single venue:** The app supports one venue per deployment. Multi-location tenancy would require schema changes.
- **No email verification or password reset:** Out of scope for capstone.

---

## Future Improvements

- **Fix Vercel SPA routing** (requires contacting Vercel support or switching to Netlify)
- **Multi-venue support** with a `Venue` model and per-venue scoping
- **Drag-and-drop shift scheduling** (currently form-based)
- **Automated CI/CD** via GitHub Actions
- **Overnight availability** with cross-midnight range support