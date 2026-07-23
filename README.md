# CitiSolve

> A full-stack **citizen complaint management system** — citizens file civic complaints (roads, power, water, sanitation…), department staff resolve them, and district admins oversee and assign the work.

Built for an India-style geography: **State → District → Department**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router v6, Chart.js |
| **Backend** | Node.js, Express 5 (ES modules) |
| **Database** | MongoDB + Mongoose |
| **Auth** | JWT (access + refresh) in httpOnly cookies, email OTP, Google Sign-In |
| **Integrations** | Cloudinary (image storage), Nodemailer (email/OTP), Google Gemini (AI image verification) |
| **Hosting** | Vercel (serverless) — frontend and backend as separate projects |

---

## Key Features

- **Role-based access** — three roles: `citizen`, `staff`, `admin`.
- **OTP-first auth** — email OTP for both signup and login, plus Google Sign-In for citizens.
- **Secure sessions** — short-lived access token (4h) + rotating refresh token (7d), both httpOnly cookies; per-account OTP brute-force lockout.
- **Complaint lifecycle** — `pending → assigned → in-progress → resolved / rejected`.
- **AI image check** — Gemini verifies uploaded photos actually match the selected complaint category.
- **Staff approval workflow** — new staff are `pending` until a district admin approves them.
- **Admin assignment** — admins assign complaints to department staff within their jurisdiction.
- **Analytics** — status/category breakdowns for citizens and dashboards for staff/admin.

---

## Roles at a Glance

| Role | Can do |
|---|---|
| **Citizen** | Register/login, file complaints (with photos + location), track status, view analytics, contact support |
| **Staff** | View assigned complaints (by department), update status, add resolution notes, search, contact admin |
| **Admin** | Dashboard, assign complaints to staff, approve/reject staff, manage users & departments |

---

## Project Structure

```
Citi-Solve/
├── backend/
│   ├── server.js               # App entry: env validation, middleware, routes, serverless DB cache
│   └── src/
│       ├── config/             # cloudinary, nodemailer, mongodb, email templates, validateEnv
│       ├── controllers/        # auth, complaint, staff, admin, support
│       ├── middleware/         # authenticate (core) + role guards, rate limiters, upload, validators
│       ├── models/             # user, complaint, support
│       ├── routes/             # auth, complaint, staff, admin, support, geocode
│       └── utils/              # logger, cloudinaryUpload, loginAlert
└── frontend/
    └── src/                    # guest / citizenfolder / staffolder / admin  (+ hooks, CSS modules)
```

---

## Data Models

**User** — `name`, `email`, `password`, `googleId`, `authProvider`, `role`, `state`, `district`, `department`, `approvalStatus`, OTP fields (verify / login / reset + attempt counters), `refreshToken`. Unverified accounts auto-expire (partial TTL index).

**Complaint** — `title`, `description`, `category`, location (`state`/`district`/`landmark`/`pincode`), `images[]`, `status`, `assignedTo`/`assignedBy`, `citizen`, `resolutionNote`, timestamps.

**Support** — `subject`, `category`, `message`, `sender`, `senderRole`, `status`.

---

## API Overview

Base path: `/api`. All non-auth routes require a valid session cookie.

| Group | Route prefix | Notable endpoints |
|---|---|---|
| **Auth** | `/api/auth` | `send-signup-otp`, `verify-signup-otp`, `send-login-otp`, `verify-login-otp`, `google`, `send-reset-otp`, `reset-password`, `refresh-token`, `logout`, `is-authenticated`, `profile` |
| **Complaints** (citizen) | `/api/complaints` | `POST /submit`, `GET /my-complaints`, `GET /analytics/all`, `GET /:id` |
| **Support** (citizen) | `/api/support` | `POST /submit` |
| **Staff** | `/api/staff` | `dashboard`, `profile`, `complaints`, `PUT /complaints/:id/status`, `POST /complaints/search/advanced`, `contact-admin` |
| **Admin** | `/api/admin` | `dashboard`, `department-workload`, `complaints`, `POST /complaints/:id/assign`, `staff`, `PUT /staff/:id/approval`, `users`, `departments` |
| **Geocode** | `/api/geocode` | `GET /reverse` (reverse-geocode lat/lon) |

---

## Getting Started

**Prerequisites:** Node.js 18+ (developed on Node 24), a MongoDB connection string.

```bash
# Backend
cd backend
npm install
npm run dev        # nodemon on http://localhost:3000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev        # Vite on http://localhost:5173 (proxies /api → :3000)
```

Leave `VITE_BACKEND_URL` empty locally — the Vite dev proxy forwards `/api` to the backend so requests stay same-origin (cookies work).

---

## Environment Variables (backend)

**Required** (server refuses to start without these):

| Var | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |

**Optional** (missing ones disable the related feature, logged as a warning):

| Var | Enables |
|---|---|
| `FRONT_END_URL` | CORS origin |
| `GOOGLE_CLIENT_ID` | Google Sign-In |
| `GEMINI_API_KEY` | AI image verification |
| `SMTP_USER`, `SMTP_PASS`, `SENDER_EMAIL` | Email / OTP delivery |
| `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Image uploads |
| `COOKIE_DOMAIN` | Cookie domain (production, optional) |

---

## Deployment (Vercel)

Frontend and backend deploy as **separate Vercel projects**, but the app runs **single-origin**: the frontend proxies `/api/*` to the backend so auth cookies stay first-party (no token in `localStorage`).

1. In `frontend/vercel.json`, set the `/api` rewrite destination to your backend's production URL.
2. In the frontend Vercel project, leave `VITE_BACKEND_URL` **empty** so API calls are relative.
3. Deploy both. The backend caches its MongoDB connection across serverless invocations.

See [`frontend/README.md`](frontend/README.md) for details.

---

## Security Highlights

- httpOnly + `sameSite: lax` cookies (no JS-readable tokens → XSS-resistant)
- Refresh-token rotation; per-account OTP attempt lockout
- Helmet, CORS with credentials, rate limiting on auth/OTP/complaint routes
- bcrypt-hashed passwords **and** OTPs
- Image upload validation by magic-bytes + MIME + AI category check
- Fail-fast startup validation of required secrets
