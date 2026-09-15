# CuePay — Smart Pool Table Payment System

> **Lock tables by default. Unlock only on a confirmed transaction.**  
> Cashless M-Pesa payments + cash entries for pool halls across Kenya.

---

## Overview

CuePay is a full-stack management platform that replaces the cash-in-hand model at pool halls with a digital transaction layer. Every table is locked by default; a solenoid unlocks the ball-return mechanism only after a logged payment — either an M-Pesa STK push or a manager-recorded cash entry.

### Who uses it

| Role | What they see |
|------|---------------|
| **Customer** | Scans a QR code → pays via M-Pesa → table unlocks |
| **Manager** | Live floor view, cash entry, alerts, table control |
| **Boss (Owner)** | Multi-venue dashboard, revenue reports, audit log |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Customer Phone                                          │
│  QR code → /t/$code → M-Pesa STK push                   │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────────┐
│  TanStack Start (SSR + server functions)                 │
│  ├─ /api/mpesa/callback  ← Safaricom webhook            │
│  ├─ /api/hardware/tables/$id  ← IoT hub polling         │
│  └─ /app/*  ← Manager / Boss dashboard                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  Database                                                │
│  PGLite (dev preview)  │  Neon Postgres (production)    │
└─────────────────────────────────────────────────────────┘
                     │ TCP/UART
┌────────────────────▼────────────────────────────────────┐
│  Table-side IoT Hub (Raspberry Pi / ESP32)               │
│  Polls /api/hardware/tables/$id every ~5 s               │
│  Fires solenoid when pending_games > 0                   │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [TanStack Start](https://tanstack.com/start) (React 19, SSR) |
| Router | TanStack Router (file-based, type-safe) |
| Database | PGLite (dev) · Neon Postgres (prod) |
| Auth | Better Auth (email/password, session cookies) |
| Payments | Safaricom M-Pesa Daraja STK Push (sandbox mode) |
| UI | Tailwind v4, Radix UI, Lucide icons, Recharts |
| Deployment | Vercel (Nitro adapter) |

---

## Project Structure

```
src/
├── routes/
│   ├── __root.tsx              # Document shell + auth provider
│   ├── index.tsx               # Landing page
│   ├── login.tsx               # Sign-in (managers & owners)
│   │
│   ├── app/                    # Auth-gated management console
│   │   ├── route.tsx           # Layout shell with sidebar nav
│   │   ├── index.tsx           # Overview: KPIs, venues, alerts
│   │   ├── floor/
│   │   │   ├── index.tsx       # Venue picker
│   │   │   └── $locationId.tsx # Live table floor grid
│   │   ├── transactions.tsx    # Full payment history
│   │   ├── reports.tsx         # Revenue charts
│   │   ├── alerts.tsx          # Battery / offline / maintenance
│   │   └── settings.tsx        # Org & location settings
│   │
│   ├── pay/
│   │   ├── index.tsx           # Public: choose a venue
│   │   └── $slug.tsx           # Public: choose a table at a venue
│   │
│   ├── t/$code.tsx             # Public: pay for a table (QR target)
│   │
│   └── api/
│       ├── auth/$.ts           # Better Auth catch-all
│       ├── mpesa/callback.ts   # Safaricom payment callback
│       └── hardware/tables/$id.ts  # IoT hub status + consume
│
├── components/
│   ├── app-shell.tsx           # Sidebar + mobile nav layout
│   ├── table-card.tsx          # Table status card with actions
│   ├── stk-prompt.tsx          # M-Pesa PIN entry modal
│   ├── felt-mini.tsx           # Mini SVG pool table graphic
│   ├── lcd-panel.tsx           # Pending games display
│   └── status-badge.tsx        # Table/session status pill
│
└── lib/
    ├── cuepay/
    │   ├── server.ts           # All server functions (queries, mutations)
    │   ├── types.ts            # Shared TypeScript types
    │   └── format.ts           # KES formatting, phone masking, dates
    ├── auth/                   # Better Auth setup & middleware
    └── db.ts                   # PGLite (dev) / Neon (prod) SQL client

database/
└── schema.sql                  # Combined database schema and seed data
```

---

## Database Schema

```sql
organizations   -- One org per business owner (till number lives here)
staff           -- User → org mapping with role (owner | manager)
locations       -- Physical venues (Westlands, Kilimani, Nyali, Kisumu...)
pool_tables     -- Tables with live status, battery, hub connectivity
play_sessions   -- Every payment: M-Pesa ref, amount, phone (masked), status
alerts          -- Low battery, hub offline, maintenance events
audit_log       -- Manager actions for accountability
```

### Table Status Flow

```
idle ──[payment confirmed]──► idle (pending_games++)
                                    │
               [hardware polls]     │
                                    ▼
                              busy (solenoid fires, game ticks down)
                                    │
                    [game_minutes elapsed]
                                    ▼
                              idle (back to default)
```

---

## Getting Started

### Prerequisites

- Node.js 22+
- (Optional) `DATABASE_URL` env var for Neon Postgres — PGLite runs automatically in development

### Install & run

```bash
npm install
npm run dev
# App starts at http://localhost:8080
```

### Demo credentials

Sign up with any email on the login page — the system auto-provisions an `owner` role in the demo organisation on first login.

Demo data includes **4 Kenyan venues** and **13 pool tables** with realistic seeded play sessions and alerts.

---

## M-Pesa Integration

The sandbox STK flow works as follows:

1. Customer enters phone on `/t/$code`
2. `initiateStk` server fn calls Daraja `stkpush/v1/processrequest`
3. Safaricom calls `/api/mpesa/callback` with the result
4. On success: `play_sessions.status` → `paid`, `pending_games++`
5. Hardware hub polls, sees `pending_games > 0`, fires solenoid, calls consume

**Sandbox mode:** Set `MPESA_ENV=sandbox` (default). The STK prompt is simulated client-side with a PIN entry UI; swap for real Daraja credentials in production.

---

## IoT Hardware API

The table-side hub (Raspberry Pi / ESP32) communicates with one endpoint:

```
GET /api/hardware/tables/:id
→ { status, pendingGames, gameMinutes }
```

When `pendingGames > 0`:

```
POST /api/hardware/tables/:id/consume
→ Atomically: pending_games--, status = 'busy', busy_since = now()
```

The hub fires the solenoid on `200 OK`. Status auto-resets to `idle` after `game_minutes` via a server-side tick on every request.

---

## Key Routes

| URL | Audience | Description |
|-----|----------|-------------|
| `/` | All | Landing page |
| `/login` | Staff | Sign in with email + password |
| `/app` | Manager / Owner | Dashboard overview |
| `/app/floor/:id` | Manager | Live table grid with controls |
| `/app/transactions` | Manager / Owner | Full payment history |
| `/app/reports` | Owner | Revenue charts & analytics |
| `/app/alerts` | Manager | Active alerts feed |
| `/pay/:slug` | Customer | Venue table list |
| `/t/:code` | Customer | Pay for one specific table |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Production | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Production | Auth session signing secret |
| `MPESA_CONSUMER_KEY` | Production | Daraja API key |
| `MPESA_CONSUMER_SECRET` | Production | Daraja API secret |
| `MPESA_SHORTCODE` | Production | Till / paybill number |
| `MPESA_PASSKEY` | Production | Daraja passkey for STK |
| `MPESA_ENV` | Optional | `sandbox` (default) or `production` |

> In development, auth and DB work without any env vars (PGLite + demo seed).

---

## Roadmap

- [ ] SMS receipt via Africa's Talking after payment
- [ ] Per-location manager accounts with restricted floor access
- [ ] Hardware OTA firmware updates via the hub API
- [ ] Cash payment QR tracking (manager-scans at table-side)
- [ ] PWA install prompt for customer payment pages
- [ ] WhatsApp payment confirmation via Business API

---

*Built for Kenyan pool halls. Powered by M-Pesa.*
# JM-Que-pay
