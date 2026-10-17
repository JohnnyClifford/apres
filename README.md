# Apres

A full-stack web application for hospitality shift scheduling, team communication, and tip distribution.

> **Status:** In development — Capstone Project

---

## Project Overview

Having spent years working in hospitality, I know the rhythm of a shift well: the rush, the handoff, the after-work debrief. I also know its frustrations. Schedules are poorly formatted. Shift swaps are facilitated in a largely dormant group chat. Tips are divided on a seemingly random basis.

Apres is a full-stack web application that brings shift scheduling, team communication, and tip distribution into one place. It's designed around the three roles that define hospitality work: Manager, Staff, and Owner. Where enterprise tools like 7shifts and HotSchedules are expensive and over-engineered for small teams, Apres is built for the 10-50 person venue that just needs something that works.

The name comes from *après-ski* — the tradition of gathering after the work is done. That's the spirit of the app: a shared space that keeps a team connected before, during, and after every shift.

---

## Features

### Core (Implemented)
- **Authentication & RBAC:** JWT-based auth with three permission tiers (Owner, Manager, Staff). Passwords hashed with bcrypt. Protected routes on both client and server.
- **Shift Scheduling:** Full CRUD for shifts with automatic conflict detection (double-booking, overlapping intervals) and weekly overtime warnings.
- **Availability & Shift Swaps:** Staff submit weekly availability. Shift swap workflow allows requesting, accepting, rejecting, and cancelling swaps with a strict state machine.
- **Tip Pooling Calculator:** Configurable per-venue rules supporting three strategies:
  - *Hours-based:* Proportional to hours worked.
  - *Role-weighted:* Hours multiplied by role-specific weight.
  - *Hybrid:* Flat base per shift plus hours-weighted remainder.
  - *Note:* Uses integer-cents arithmetic and the Largest Remainder Method to ensure distributions sum exactly to the total pool.

### Should Ship (In Progress)
- Real-time team communication (shift-specific chat)
- Owner dashboard (labor costs, coverage gaps, tip summaries)

### Won't Ship (Explicitly Out of Scope)
- Push notifications, native mobile app, payment processing, multi-location scoping.

---

## Installation Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account (or local MongoDB instance)

### Backend Setup

1. Navigate to the server directory:

        cd server

2. Install dependencies:

        npm install

3. Create a `.env` file in the `server/` directory (use `.env.example` as a template):

        PORT=5000
        MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/apres?retryWrites=true&w=majority
        JWT_SECRET=your_super_secret_jwt_key
        CLIENT_ORIGIN=http://localhost:5173
        NODE_ENV=development

4. Start the development server:

        npm run dev

   The API will be available at `http://localhost:5000`.

### Frontend Setup
*(Coming soon — the React client is currently being scaffolded.)*

---

## Usage

### Running Tests
The backend uses Jest and Supertest with `mongodb-memory-server` for isolated integration testing.

        cd server
        npm test

**Current Test Status:** 104 tests passing across 10 suites. 100% coverage on all business logic services (`shiftService`, `swapService`, `tipService`).

### API Reference

Base URL (dev): `http://localhost:5000/api`

All authenticated routes require:
`Authorization: Bearer <jwt>`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | public | Create account |
| POST | `/auth/login` | public | Obtain JWT |
| GET | `/auth/me` | any | Current user |
| GET | `/shifts` | any | List shifts (filter by venue/date) |
| POST | `/shifts` | manager, owner | Create shift |
| PATCH | `/shifts/:id` | manager, owner | Update shift |
| DELETE | `/shifts/:id` | manager, owner | Delete shift |
| GET | `/availability/me` | any | Get own availability for a week |
| PUT | `/availability/me` | any | Upsert own availability |
| POST | `/swaps` | any | Request a shift swap |
| GET | `/swaps` | any | List swaps (scoped by role) |
| PATCH | `/swaps/:id` | any | Transition swap status |
| POST | `/tips/calculate` | manager, owner | Preview tip distribution |
| POST | `/tips/distribute` | manager, owner | Save tip distribution snapshot |

---

## Technologies Used

### Frontend
- React (Vite)
- React Router
- Redux Toolkit
- TailwindCSS *(planned)*
- Socket.IO Client *(planned)*

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO *(planned)*
- JWT + bcrypt
- Jest + Supertest

### Infrastructure
- **Frontend Host:** Vercel *(planned)*
- **Backend Host:** Render
- **Database:** MongoDB Atlas (M0 Free Tier)
- **Monitoring:** UptimeRobot (pings `/api/health` every 5 minutes to prevent Render cold starts)

### Live Deployment
- **Backend API:** [https://apres-api.onrender.com](https://apres-api.onrender.com)
- **Health Check:** [https://apres-api.onrender.com/api/health](https://apres-api.onrender.com/api/health)

### Architectural Decisions
- **Layered Backend:** Controllers stay thin. Business logic (conflict detection, swap state machine, tip math) lives in `services/` as pure functions, making it unit-testable without HTTP or a database.
- **RBAC as Middleware:** A single `requireRole([...])` middleware replaces scattered permission checks. Testable in isolation.
- **JWT in Authorization Header:** Simpler for a portfolio demo than httpOnly cookies. Trade-off: slightly more XSS-exposed. Mitigated by short expiry and CORS locked to the client origin.
- **Zero-Cost Stack with Monitoring:** Render's free tier sleeps on idle. UptimeRobot keeps the service warm and doubles as external uptime monitoring.

---

## Future Improvements

- **Real-Time Chat:** Integrate Socket.IO for shift-specific threads and manager announcements.
- **Owner Dashboard:** Build charts (Recharts) for labor cost vs. scheduled hours, coverage gaps, and tip summaries.
- **Task Checklists:** Role-specific opening/closing checklists with per-shift completion tracking.
- **Automated CI/CD:** Add GitHub Actions to run the Jest suite on every push.