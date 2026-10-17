# Après - Development Log

## Week 1: Project Kickoff & Foundation

**Date:** October 10, 2026
**Student:** Johnny Clifford
**Project:** Après (Hospitality Shift & Tip Management)

### Overview
This week marked the official start of the Capstone Project. The primary focus was finalizing the project proposal, defining the architectural scope, selecting the technology stack, and setting up the initial GitHub repository structure.

### Key Learnings & Insights
*   **Scoping is Critical:** Initially, I wanted to build a tool that could handle enterprise-level hospitality venues. However, I realized that tools like 7shifts are already over-engineered for small teams. By narrowing the target audience to 10-50 person venues, I can focus on building a highly polished, functional application rather than a bloated feature set. 
*   **The "Zero-Cost" Infrastructure Trade-off:** I learned that free-tier hosting (Render) comes with a major caveat: the backend sleeps on idle and the free database expires after 30 days. To solve this, I decided to connect the Render backend to a MongoDB Atlas free tier (which doesn't expire) and use UptimeRobot to ping the backend every 5 minutes. This prevents cold starts and acts as a lightweight monitoring layer. Documenting this trade-off in the README will demonstrate an understanding of real-world deployment constraints.
*   **Real-Time Complexity:** Integrating Socket.IO for live chat and shift updates is a core feature, but it adds significant complexity to state management (Redux Toolkit) and server architecture. I need to ensure the backend is structured to handle persistent WebSocket connections alongside standard REST API calls.

### Challenges Faced
*   **Architecture Planning:** Designing the Role-Based Access Control (RBAC) for three distinct roles (Owner, Manager, Staff) required careful planning. Managers need scoped access to their department, while Owners need visibility across all locations. I mapped out the permission tiers early to avoid rewriting middleware later.
*   **Tech Stack Selection:** While the MERN stack was the obvious choice, choosing the right libraries for specific features (e.g., FullCalendar for drag-and-drop scheduling, Recharts for the owner dashboard) required research to ensure they integrated smoothly with React and Redux.

### Actions Taken & Milestones
*   **Proposal Finalized:** Completed the 1-2 page project proposal outlining the project idea, target audience, core features, and technology stack.
*   **GitHub Repository Created:** Initialized a public GitHub repository to track the project's progress.
*   **Initial Project Scaffolding:** Set up the foundational folder structure for the frontend (React) and backend (Node.js/Express) to prepare for the Design Phase.
*   **Devlog Initiated:** Created this development log to document the process, challenges, and learnings throughout the capstone.

### Next Steps (Week 2)
*   Move into the Design Phase: Draft the MongoDB schemas (User, Shift, SwapRequest, TipPool).
*   Define the API contract (REST endpoints and Socket.IO events).
*   Begin building the backend authentication (JWT + bcrypt) and RBAC middleware.
*   Write the initial Jest unit tests for the Tip Pooling Calculator logic.
