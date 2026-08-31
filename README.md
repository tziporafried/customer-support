# Customer Support Ticket System

A full-stack support ticket system built as a take-home assignment. Customers can submit support tickets, and admins can review, search, filter, and resolve them — with AI-generated ticket summaries and real email notifications along the way.

**Stack:** React + TypeScript + Vite · ASP.NET Core 8 (Minimal API) · PostgreSQL (EF Core / Npgsql) · JSON file persistence for tickets · JWT auth · Gemini API · SMTP (Brevo) via MailKit · Deployed on Render

## Live Demo

**https://customer-support-1-4k6s.onrender.com/**

The application is deployed on [Render](https://render.com). The frontend above is a static build that talks to a separately deployed backend API service (the backend URL is configured into the frontend build via `VITE_API_URL` and is not hardcoded anywhere in the repository).

> Render's free tier spins down idle services — the first request after a period of inactivity may take a few seconds to respond while the backend wakes up.

## Main Features

- Create support tickets (name, email, description)
- View all tickets in a sortable table
- Search tickets by customer name or description
- Filter tickets by status (Open / In Progress / Closed)
- View full ticket details by unique ticket ID
- Admin-only: update ticket status and resolution notes
- User registration and login with email/password
- JWT-based authentication with role claims
- Backend-enforced role-based authorization (Admin vs. User)
- AI-generated one-sentence ticket summaries (Google Gemini)
- Real email notifications on ticket creation and updates
- Responsive, accessible UI (semantic landmarks, ARIA labeling, keyboard-navigable modal with focus trapping)

## Architecture

- A **React SPA** (Vite + TypeScript) is the only client. It never touches any data store directly — every read or write goes through the backend's HTTP API.
- An **ASP.NET Core 8 Minimal API** backend exposes all endpoints directly from `Program.cs` (no separate controller classes).
- **Users** are persisted in **PostgreSQL** via **EF Core + Npgsql**, with a database-enforced unique constraint on email.
- **Tickets** are persisted in a flat file, `Data/tickets.json`, read and written exclusively by the backend — the frontend has no awareness of the storage format. This split is intentional: the assignment specifically calls for JSON-based ticket storage, while user accounts (which need uniqueness guarantees for auth) use a real relational store.
- `TicketService` owns all ticket business logic: reading/writing `tickets.json`, filtering/searching, diffing changes, and coordinating with external services.
- External integrations are abstracted behind interfaces — `IAiSummaryService` (implemented by `GeminiAiSummaryService`) and `IEmailService` (implemented by `SmtpEmailService`) — so `TicketService` depends on an abstraction, not a concrete HTTP/SMTP client.
- Dependency Injection (the built-in ASP.NET Core container) wires every service, the DbContext, and the password hasher throughout the backend.

## Project Structure

**Backend** — `backend/SupportTickets.Api`

```
SupportTickets.Api/
├── Program.cs                 # App bootstrap: DI, middleware, and every API endpoint
├── Data/
│   ├── AppDbContext.cs        # EF Core DbContext (Users table only)
│   ├── AdminSeeder.cs         # Creates the first Admin user from config, on startup
│   ├── tickets.json           # Ticket "database" — read/written only by TicketService
│   └── Migrations/            # EF Core migration history
├── Entities/
│   ├── User.cs                # EF-mapped entity (PostgreSQL)
│   └── Ticket.cs              # Plain POCO serialized to JSON
├── DTOs/                      # Request/response shapes for the API (decoupled from entities)
├── Services/
│   ├── TicketService.cs       # Ticket business logic + JSON persistence
│   ├── IAiSummaryService.cs / GeminiAiSummaryService.cs
│   └── IEmailService.cs / SmtpEmailService.cs / MockEmailService.cs
└── Dockerfile                 # Container build used for the Render deployment
```

**Frontend** — `frontend/src`

```
src/
├── api/
│   ├── authApi.ts             # login/register calls to the backend
│   └── ticketsApi.ts          # ticket CRUD calls, including the admin-authorized update
├── auth/
│   └── AuthContext.tsx        # React context for the current session (token + user)
├── components/
│   ├── AppHeader.tsx / AuthControls.tsx
│   ├── NewTicketModal.tsx     # Accessible modal for creating a ticket
│   ├── TicketTable.tsx
│   └── StatusBadge.tsx
├── pages/
│   ├── TicketsList.tsx        # Search, filter, and table of tickets
│   ├── TicketDetails.tsx      # Ticket detail view + admin status/resolution editor
│   ├── Login.tsx / Register.tsx
├── types/                     # Shared TypeScript request/response types
└── App.tsx                    # Route definitions
```

Key files:
- **`Program.cs`** — the composition root: registers services, configures JWT/CORS/DB, seeds the admin, and declares every route.
- **`AppDbContext`** — the only EF Core context; maps `User` with a unique index on `Email`.
- **`TicketService`** — the entire ticket domain (read, create, update, filter, persist to JSON, trigger AI + email).
- **`AuthContext`** (frontend) — holds the JWT and current user in `sessionStorage`, exposes `signIn`/`signOut` to the app.
- **`api/`** (frontend) — the only place the frontend makes HTTP calls; every other component/page goes through it.

## API Endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/health` | Liveness check | None |
| POST | `/api/auth/register` | Create a new user account | None |
| POST | `/api/auth/login` | Verify credentials, issue a JWT | None |
| GET | `/api/tickets` | List tickets, optional `status`/`search` query filters | None |
| GET | `/api/tickets/{id}` | Get a single ticket by ID | None |
| POST | `/api/tickets` | Create a new ticket | None |
| PUT | `/api/tickets/{id}` | Update a ticket's status/resolution | **Admin JWT required** |
| DELETE | `/api/tickets/{id}` | Permanently delete a ticket | None |

`PUT /api/tickets/{id}` is protected with `.RequireAuthorization(policy => policy.RequireRole("Admin"))` — a valid JWT with `role=Admin` is required, or the request is rejected with 401/403 before it reaches `TicketService`.

`DELETE /api/tickets/{id}` is intentionally open to any caller (no login required), so anyone can remove a ticket from the tickets table. The frontend asks for confirmation before sending the request.

## Authentication & Authorization

- Users register with name, email, and password; new accounts always get `Role = "User"` — there's no way to self-register as Admin.
- Passwords are hashed server-side with ASP.NET Core Identity's `PasswordHasher<User>` before being stored; password hashes are never included in any API response.
- Login looks up the user by email, verifies the password against the stored hash, and — on success — issues a signed JWT (HMAC-SHA256).
- The JWT carries the user's ID, email, name, and role as claims.
- The role claim is what `RequireRole("Admin")` checks — authorization is enforced by the backend on every request, not just hidden/disabled in the UI.
- An **admin seeding** routine (`AdminSeeder`) runs once at startup: if `SeedAdmin:Name`/`Email`/`Password` are configured and no user with that email exists yet, it creates the first Admin account. If those settings are absent, seeding is skipped.

## Data Persistence

**Tickets** — `Data/tickets.json`
- Read and written exclusively by `TicketService` on the server; the frontend never accesses the file directly, only through the ticket API.
- Kept as JSON deliberately, per the assignment's storage requirement.

**Users** — PostgreSQL
- Accessed through EF Core and the Npgsql provider.
- Email uniqueness is enforced at the database level (a unique index), so it holds even under concurrent registration attempts.

## AI Summary

- When a ticket is created, `TicketService` calls `GeminiAiSummaryService` to generate a concise, one-sentence summary of the issue description.
- The summary is stored alongside the ticket (`AiSummary` field) and shown in the ticket details view.
- If the Gemini API is unavailable, misconfigured, or returns an error, the failure is caught and logged — ticket creation still succeeds, just without a summary.

## Email Notifications

- Real emails are sent through SMTP, behind the `IEmailService` abstraction, implemented by `SmtpEmailService` using **MailKit**. The current SMTP provider is **Brevo**.
- Emails are triggered:
  - after a ticket is created, and
  - when a ticket's status and/or resolution changes.
- If both status and resolution change in the same update request, the two changes are combined into a **single** email rather than sending one per field.
- Ticket data is always persisted to `tickets.json` first; sending the email is a best-effort step afterward. If the email fails to send, the failure is logged but the ticket update is **not** rolled back.
- The ticket-created email includes an absolute tracking link built from `Frontend:BaseUrl` (e.g. `https://your-frontend.example/tickets/{id}`), not a relative path — so it resolves correctly regardless of where the email is opened.

## Environment Variables

None of these are committed to the repository — they must be supplied via environment variables, `dotnet user-secrets` (locally), or your deployment platform's config.

| Variable | Purpose |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `Jwt__SigningKey` | Symmetric key used to sign JWTs (must be ≥ 32 bytes) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `Email__SmtpHost` | SMTP host (e.g. Brevo's SMTP relay) |
| `Email__SmtpPort` | SMTP port |
| `Email__Username` | SMTP username |
| `Email__Password` | SMTP password / API key |
| `Email__FromEmail` | "From" address for outgoing emails |
| `Email__FromName` | "From" display name (optional) |
| `Frontend__BaseUrl` | Absolute origin of the deployed frontend (e.g. `https://customer-support-1-4k6s.onrender.com`), used to build the tracking link in ticket-created emails. Defaults to `http://localhost:5173` if unset. |
| `SeedAdmin__Name` | Name for the seeded admin account (optional) |
| `SeedAdmin__Email` | Email for the seeded admin account (optional) |
| `SeedAdmin__Password` | Password for the seeded admin account (optional, ≥ 8 chars) |
| `Cors__AllowedOrigins` | Comma-separated list of allowed frontend origins |
| `PORT` | Injected by Render; the backend binds Kestrel to it when present |

Example (PowerShell, **placeholder values only**):

```powershell
$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=support_tickets;Username=postgres;Password=your-local-password"
$env:Jwt__SigningKey = "replace-with-a-random-32+-character-secret"
$env:GEMINI_API_KEY = "your-gemini-api-key"
$env:Email__SmtpHost = "smtp.your-provider.example"
$env:Email__SmtpPort = "587"
$env:Email__Username = "your-smtp-username"
$env:Email__Password = "your-smtp-password"
$env:Email__FromEmail = "no-reply@example.com"
$env:Email__FromName = "Support Tickets"
$env:Frontend__BaseUrl = "http://localhost:5173"
$env:SeedAdmin__Name = "Admin"
$env:SeedAdmin__Email = "admin@example.com"
$env:SeedAdmin__Password = "replace-with-a-strong-password"
$env:Cors__AllowedOrigins = "http://localhost:5173"
```

## Local Development Setup

**Prerequisites**
- .NET 8 SDK
- Node.js + npm
- A PostgreSQL database (local instance or a hosted one, e.g. Supabase)

**Backend**

```powershell
cd backend/SupportTickets.Api
dotnet restore

# set the environment variables from the section above, e.g. via dotnet user-secrets or $env:...

dotnet tool restore          # installs dotnet-ef per backend/.config/dotnet-tools.json
dotnet ef database update    # applies migrations to your database
dotnet run
```

The backend listens on `http://localhost:5285` by default (per `Properties/launchSettings.json`).

**Frontend**

```powershell
cd frontend
npm install
npm run dev
```

The frontend defaults to calling the API at `http://localhost:5285` unless `VITE_API_URL` is set. Vite's dev server runs on its usual default port (`http://localhost:5173`), which is why that origin is the default in `Cors:AllowedOrigins`.

## Database Migration

Migrations live in `backend/SupportTickets.Api/Data/Migrations`. From `backend/SupportTickets.Api`, with `dotnet-ef` restored (`dotnet tool restore`) and `ConnectionStrings__DefaultConnection` set:

```powershell
dotnet ef database update
```

To add a new migration after changing `AppDbContext` or `User`:

```powershell
dotnet ef migrations add <MigrationName>
```

## Deployment

The application is deployed on **Render**: **https://customer-support-1-4k6s.onrender.com/**

Deployment-specific behavior present in the code:
- **Dynamic port binding** — `Program.cs` reads the `PORT` environment variable (injected by Render) and, when present, binds Kestrel to `http://0.0.0.0:{PORT}`.
- **Configurable CORS** — allowed frontend origins come from `Cors:AllowedOrigins` rather than being hardcoded, so the deployed frontend's origin can be allowed without a code change.
- **Containerized backend** — `backend/SupportTickets.Api/Dockerfile` builds and publishes the API with the .NET 8 SDK/ASP.NET runtime images.
- **Build-time API URL** — the frontend reads `VITE_API_URL` at build time (`import.meta.env.VITE_API_URL`) to know where the backend lives, instead of hardcoding `localhost`.

No `render.yaml` or other infrastructure-as-code file is present in this repository — the two services are assumed to be configured directly in the Render dashboard.

## Design Decisions

- **DTOs are separate from Entities** so the API's request/response contract (e.g., `RegisterRequest`, `UpdateTicketDto`) can differ from what's persisted, and clients can't set fields they shouldn't (e.g., `Role` or `Id`).
- **External integrations sit behind interfaces** (`IAiSummaryService`, `IEmailService`) so `TicketService` doesn't depend on a specific AI provider or SMTP library, and either can be swapped or mocked independently.
- **Password hashing happens server-side only** — the frontend never sees or handles raw-to-hash logic; hashes never leave the backend.
- **Role authorization is enforced on the backend** (`RequireRole("Admin")`) rather than relying on the frontend hiding admin controls, since a client-side check alone offers no real protection.
- **Tickets remain JSON-backed** because that's an explicit requirement of the assignment, not a technical constraint.
- **Users live in PostgreSQL** because authentication needs a real uniqueness guarantee (unique email) and durable, queryable storage.
- **AI and email failures are isolated from ticket persistence** — both calls are wrapped so that a Gemini or SMTP outage never prevents a ticket from being saved.

## Error Handling / Resilience

- If the Gemini API call fails or is misconfigured, ticket creation still succeeds — the ticket is simply saved without an `AiSummary`.
- If sending a notification email fails, the already-saved ticket data is not rolled back; the failure is only logged.
- Duplicate user registration is protected at the database level via a unique constraint on `Email`, in addition to an application-level pre-check.
- Invalid login credentials and missing/invalid JWTs return the appropriate `401 Unauthorized` response.

## Known Limitations / Future Improvements

These reflect deliberate scope for a take-home assignment, not missing requirements — noted here as what a production version would address next:

- JSON file persistence for tickets works well at this scale but isn't ideal for high-concurrency production workloads; a production version could move tickets into PostgreSQL alongside users.
- Pagination could be added to the tickets list endpoint for larger datasets.
- Database/search indexes could be introduced once tickets move to a database.
- Refresh tokens or httpOnly-cookie-based authentication would improve production auth over a single short-lived JWT.
- Background queues/retries could improve delivery reliability for AI summaries and emails instead of a single synchronous attempt.
- A centralized global exception handler could standardize error responses across the API.

## Screenshots

_Screenshots are not included in this repository. Suggested captures for a submission:_
- Tickets List
- New Ticket modal
- Ticket Details
- Login
- Register

## Quick Start

1. Clone the repository.
2. Backend: `cd backend/SupportTickets.Api`, set the environment variables listed above, `dotnet restore`, `dotnet tool restore`, `dotnet ef database update`, `dotnet run`.
3. Frontend: `cd frontend`, `npm install`, `npm run dev`.
4. Open the frontend dev URL in your browser, register an account, or log in as the seeded admin to manage tickets.
5. Or just try the live deployment: **https://customer-support-1-4k6s.onrender.com/**
