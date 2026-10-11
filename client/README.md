# Apres

A full-stack web application for hospitality shift scheduling, team
communication, and tip distribution.

> **Status:** In development — Capstone Project

## Project Overview

Apres is a scheduling and team-management tool built for hospitality
teams (restaurants, bars, cafes) where shift swaps, availability,
conflict detection, and fair tip pooling are daily pain points. The goal
is a single app where managers publish schedules and staff manage
availability, request swaps, and see tip distributions — without the
spreadsheet-and-group-chat duct tape most small teams rely on.

This repository is a monorepo containing both the client and the server.

## Features


### Implemented

- Express server scaffold with Helmet, CORS, JSON body limits,
  rate limiting, MongoDB connection setup, and 404/error middleware
- `GET /api/health` endpoint with a passing Jest/Supertest test
- Vite/React client that displays live backend health status via Axios

### In progress

- Local client/server environment wiring and dependency setup

### Planned

- Authentication and role-based access control (RBAC)
- Shift schedules and conflict detection
- Staff availability management
- Shift swap requests and approvals
- Tip pooling and distribution
- Owner dashboard
- Team chat (optional)
- Monitoring and observability (optional)

## Project Structure


## Installation Instructions

### Prerequisites

- Node.js (LTS)
- npm
- A MongoDB instance (local or Atlas)

### 1. Clone and install

```bash
git clone https://github.com/JohnnyClifford/apres.git
cd apres

# Server
cd server
npm install

# Client
cd ../client
npm install