# Apres — API Reference

Base URL (dev): http://localhost:5000/api
Base URL (prod): https://apres-api.onrender.com/api

All authenticated routes require:
  Authorization: Bearer <jwt>

## Auth
| Method | Path | Role | Description |
|---|---|---|---|
| POST | /auth/register | public | Create account |
| POST | /auth/login | public | Obtain JWT |
| GET | /auth/me | any | Current user |

## Shifts
| Method | Path | Role | Description |
|---|---|---|---|
| GET | /shifts?from=&to= | any | List shifts in range |
| POST | /shifts | manager, owner | Create shift |
| PATCH | /shifts/:id | manager, owner | Update shift |
| DELETE | /shifts/:id | manager, owner | Delete shift |
| POST | /shifts/:id/assign | manager, owner | Assign to user |

(... continue for swaps, tips, chat, dashboard, health)