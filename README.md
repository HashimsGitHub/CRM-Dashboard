# CRM Dashboard – Customer Order & Project Tracking Portal

## Purpose
Customers of an IT hardware / software / services company constantly email or call to ask *"where is my order?"*.
This app is a self-service portal: a customer enters an **Order Tracking Number** (no account, no password) and sees
status, progress, milestones, shipments, updates and timeline. Administrators log in to manage orders.
Two personas only: **Customer** and **Administrator**.

## Architecture
```
Customer Browser (PWA)
      ↓
Next.js 16 App Router / Vercel
      ↓
Server components, server actions, /api/track route
      ↓
Neon PostgreSQL (Drizzle ORM)
```

- Customer data is built by an explicit DTO (`src/lib/public-order.ts`) – DB rows are never passed through.
- Admin mutations are server actions; each calls `requireAdmin()` itself (menus are not the security boundary).
- Custom fields are metadata (`custom_field_definitions` / `custom_field_values`) – no schema change per field.
- Shipments store carrier + tracking URL manually; `carrier_metadata` / `last_synced_at` are reserved for future carrier APIs.

## Technology stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons · Drizzle ORM + `pg` · Neon PostgreSQL · Zod · bcryptjs · Vitest · GitHub Actions.

## Local installation
```bash
npm install
cp .env.example .env.local      # then edit values
npm run db:generate             # only needed after schema changes (migrations are committed)
npm run db:migrate
npm run db:seed
npm run dev                     # http://localhost:3000
npm run lint && npm run typecheck && npm test && npm run build
```

### Environment variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string (server only, never `NEXT_PUBLIC_`). Use the **pooled** string on Vercel. |
| `SESSION_SECRET` | 32+ random chars (`openssl rand -base64 48`); HMAC key for session tokens. |
| `ADMIN_USERNAME` / `ADMIN_INITIAL_PASSWORD` | Used by `db:seed` to create the first administrator (≥10 chars). **Quote the password in `.env.local` if it contains `#`.** |
| `TEST_DATABASE_URL` | Disposable database for `npm test` (tables are truncated). Must differ from `DATABASE_URL`. |

Local Postgres without Neon: `docker run -d --name crm-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=crm -p 54329:5432 postgres:17`
(and a second database `crm_test` for tests). To use Neon, just put its connection string in `DATABASE_URL`.

### First administrator
`npm run db:seed` reads `ADMIN_USERNAME` and `ADMIN_INITIAL_PASSWORD`, hashes the password with bcrypt and inserts the admin
if it does not exist (an existing admin is never overwritten). Change the password afterwards by deleting the row and re-seeding.
The seed is idempotent and safe to re-run.

## Demo tracking numbers (fictional data)
| Scenario | Tracking number |
|---|---|
| Hardware – Acme Manufacturing, UPS shipment | `ORD-26-HW4K-9X2M` |
| IT service – Northwind, Microsoft 365 migration, 65% | `ORD-26-M365-7QPD` |
| Turnkey – Contoso Retail, 2 shipments + 6 milestones | `ORD-26-TK8R-5NWC` |

Admin: `/admin/login` with the credentials from your `.env.local`.

## Routes
`/` · `/track` · `/track/[trackingNumber]` · `/admin/login` · `/admin` (dashboard + search/filters; `/admin/orders` redirects here) ·
`/admin/orders/new` · `/admin/orders/[id]` · `/admin/orders/[id]/edit` · `/admin/fields` · `/admin/settings` · `GET /api/track/[trackingNumber]`.
Orders are archived (soft-deleted), never hard-deleted; archived orders disappear from the customer view.

## Progressive Web App
Installable (manifest + icons + service worker). The service worker caches only static assets and an offline page;
**order data, `/track`, `/api` and `/admin` are never cached**. It is registered in production builds only.

## Testing
`npm test` runs Vitest against `TEST_DATABASE_URL` (migrations applied automatically): lookup, privacy/DTO leakage, hidden custom
fields, archived orders, admin auth/sessions, admin CRUD, custom-field validation, rate limiting, API responses.
CI uses a Postgres service container – no production credentials in the workflow.

## GitHub workflow
Branches: `main`, `develop`, `feature/*`, `fix/*`. Open PRs; `.github/workflows/ci.yml` runs lint, typecheck, tests and build on push and PR.

## Vercel deployment (only after everything passes locally)
1. Push to GitHub; confirm CI is green.
2. Import the repo in Vercel (framework: Next.js, defaults).
3. Project → Settings → Environment Variables: `DATABASE_URL` (Neon pooled string), `SESSION_SECRET`. Do not set `ADMIN_*` unless seeding.
4. Run migrations/seed against Neon **from your machine**: `DATABASE_URL=<neon> npm run db:migrate && npm run db:seed`.
5. Deploy. Feature branches/PRs automatically get Preview Deployments for owner review (use a separate Neon branch for previews).

## Security considerations
Tracking numbers are `ORD-YY-XXXX-XXXX` (~40 bits, unambiguous alphabet) with generic "not found" responses and a per-IP limit
(30 lookups/min; in-memory, best-effort on serverless – swap `src/lib/rate-limit.ts` for Redis/Upstash for strict global limits).
Admin login: bcrypt (cost 12), constant-time-ish unknown-user handling, 8 attempts / 15 min per IP, random session tokens
stored only as HMAC hashes, HTTP-only + SameSite=Lax + Secure (production) cookies, 8 h expiry. Server actions get Next.js
origin checks (CSRF). Zod validation on every mutation; parameterised queries via Drizzle; React output escaping; only
http(s) URLs accepted for links; security headers (HSTS, nosniff, frame deny, referrer policy); no-store on admin and API.

## Future enhancements
Carrier APIs and polling (fields reserved), email/SMS notifications, customer verification/accounts, webhooks, CRM/ERP/e-commerce
sync, attachments, invoices, support tickets, admin password change UI and multi-admin management, distributed rate limiting.
