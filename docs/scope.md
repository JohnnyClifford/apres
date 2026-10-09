# Apres — Scope Contract

## Must Ship (the app isn't Apres without these)
- Auth + RBAC (Owner / Manager / Staff)
- Shift scheduling: create, assign, edit, delete, conflict detection
- Availability submission (staff) + respected by manager scheduling
- Swap request workflow with manager approval
- Tip pooling calculator with per-staff breakdown

## Should Ship (high value, cuttable if time runs short)
- Real-time chat (shift threads + announcements)
- Owner dashboard (labor cost, coverage gaps, tip summary)
- Deployment monitoring via UptimeRobot

## Won't Ship (explicitly out of scope for this iteration)
- Task checklists
- Typing indicators / read receipts
- Multi-location owner scoping (single venue assumed)
- Mobile native app (responsive web only)
- Push notifications (in-app only)
- Payment processing

## Rationale
The rubric rewards quality over quantity. A polished five-feature app with
strong tests and a clear devlog outscores a sprawling seven-feature app with
half-finished surfaces. Cuts documented here are revisited in the devlog.