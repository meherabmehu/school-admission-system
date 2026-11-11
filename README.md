# School Admission System

Online admission for a school where seats are given **first come, first served**.
A parent picks a class, a seat is **held** for a limited time, and the admission becomes
**confirmed** once the fee is paid. Holds that are not paid in time expire automatically and the
seat goes back to the pool.

| Part      | Tech                                         | Folder      |
|-----------|----------------------------------------------|-------------|
| Backend   | C# / .NET 8 (ASP.NET Core minimal API), EF Core + Npgsql | `backend/`  |
| Database  | PostgreSQL 16                                | (Docker volume `pgdata`) |
| Frontend  | React 18 + TypeScript (Vite)                 | `frontend/` |
| Runtime   | Docker + Docker Compose                      | `docker-compose.yml` |

## Run it

The only requirement is Docker (with Compose).

```bash
docker compose up --build
```

| What        | URL                    |
|-------------|------------------------|
| Frontend    | http://localhost:3000  |
| Backend API | http://localhost:8080  |
| PostgreSQL  | localhost:5432 (user `admission`, password `admission`, db `school_admission`) |

The database schema is created automatically on startup (EF Core migrations). Data is stored in
the `pgdata` volume, so it survives `docker compose down` / `up` and container restarts.
`docker compose down -v` wipes it.

### Configuration

| Variable | Where | Default | Meaning |
|----------|-------|---------|---------|
| `ConnectionStrings__Default` | backend | `Host=db;Port=5432;Database=school_admission;Username=admission;Password=admission` (in compose) | PostgreSQL connection string |
| `HOLD_DURATION_SECONDS` | backend | `600` | How long a hold lasts before it expires |
| `EXPIRY_SWEEP_INTERVAL_SECONDS` | backend | `5` | How often the background job marks overdue holds as `EXPIRED` |
| `API_BASE_URL` | frontend (runtime) | `http://localhost:8080` | Backend URL the browser calls. Served as `/config.js`, so no rebuild is needed |
| `VITE_API_BASE_URL` | frontend (`npm run dev` / build) | `http://localhost:8080` | Same as above for local development |
| `POSTGRES_PORT` | compose (host side) | `5432` | Host port for PostgreSQL. Change it if a local PostgreSQL already uses 5432 |

Compose passes `HOLD_DURATION_SECONDS`, `API_BASE_URL` and `POSTGRES_PORT` through from your shell, e.g.

```bash
HOLD_DURATION_SECONDS=60 docker compose up --build
POSTGRES_PORT=5433 docker compose up --build    # if port 5432 is already taken
```

On Windows PowerShell: `$env:POSTGRES_PORT=5433; docker compose up --build`.

## Using the app

1. Type a 17-digit student ID (birth registration number) in the bar at the top. It is remembered
   in the browser, so a refresh or reopening the tab keeps the student and their applications.
2. **Create a class** (school staff): name + number of seats. Each class/shift is its own class.
3. **Classes & seats**: every class with total / reserved / admitted / available seats.
   Counts refresh every 5 seconds. Press **Apply for a seat** to hold one.
4. **Application** page: a countdown shows the time left to pay. **I have paid — confirm admission**
   confirms the seat; **Cancel application** releases it. When the timer runs out the page switches
   to *Expired* by itself, without a reload.
5. **My applications**: all applications of the current student, active and past, refreshed
   automatically.

The UI can be switched between English and Bangla with the button in the top-right corner.
Every error from the API is shown as a plain-language message.

## API

All responses are JSON. Errors look like `{ "error": "NO_SEATS_AVAILABLE", "message": "..." }`.
Endpoints that act for a student need the `X-Student-Id` header (exactly 17 digits).

| Method | Path | Success | Notable errors |
|--------|------|---------|----------------|
| `POST` | `/classes` | `201` class | `400 VALIDATION_ERROR`, `409 CLASS_ALREADY_EXISTS` |
| `GET` | `/classes` | `200` list with seat counts | |
| `GET` | `/classes/{classId}` | `200` class | `404 CLASS_NOT_FOUND` |
| `POST` | `/classes/{classId}/holds` | `201` hold | `400 INVALID_STUDENT_ID`, `404`, `409 NO_SEATS_AVAILABLE`, `409 ALREADY_APPLIED` (includes `holdId`) |
| `GET` | `/holds/{holdId}` | `200` hold | `404 HOLD_NOT_FOUND` |
| `POST` | `/holds/{holdId}/confirm` | `200` hold (repeat calls also `200`) | `403 NOT_YOUR_HOLD`, `409 HOLD_EXPIRED`, `409 HOLD_CANCELLED` |
| `DELETE` | `/holds/{holdId}` | `204` (repeat calls also `204`) | `403 NOT_YOUR_HOLD`, `409 ALREADY_CONFIRMED` |
| `GET` | `/me/holds` | `200` holds of the student | `400` missing/invalid header |

Class seat counts: `heldSeats` only counts holds whose time has not run out, so
`heldSeats + confirmedSeats + availableSeats = totalSeats` at all times.

## How seats stay correct under load

- Creating a hold runs in a transaction that locks the class row with `SELECT ... FOR UPDATE`.
  Concurrent requests for the same class queue on that lock, count `HELD` + `CONFIRMED`, and only
  insert if a seat is free. Because the lock lives in PostgreSQL, this also holds with several
  backend processes sharing one database.
- A partial unique index on `(class_id, student_id) WHERE status IN ('HELD','CONFIRMED')` makes
  "one active application per student per class" a database guarantee.
- Confirm/cancel lock the hold row, so double clicks and parallel calls are idempotent.
- Expiry: a hold past `expires_at` is treated as expired everywhere immediately (seat counts,
  confirm, API responses), and a background job (`ExpiredHoldSweeper`) also writes `EXPIRED` to the
  rows every few seconds. No client action is needed.
- Startup migrations take a PostgreSQL advisory lock, so two backends can start at the same time.

## Tests

### With Docker only

```bash
docker compose --profile test run --rm --build backend-tests    # xUnit, against the real PostgreSQL
docker compose --profile test run --rm --build frontend-tests   # Vitest + Testing Library
```

### With local SDKs (optional)

```bash
# backend (.NET 8 SDK + a running PostgreSQL, e.g. `docker compose up -d db`)
cd backend && dotnet test

# frontend (Node 20+)
cd frontend && npm ci && npm test
```

Backend tests create a throw-away database per test class (override the server with
`TEST_DB_CONNECTION`). They cover:

- 100 parallel hold requests for 10 seats → exactly 10 succeed, never more than capacity
- the same student applying many times in parallel → one hold
- parallel confirms of one hold → counted once
- **two separate backend processes on different ports** sharing one database and competing for seats
- expiry (including the background sweeper), seat release after expiry, confirm after expiry,
  ownership checks, cancel rules, `/me/holds`, input validation and JSON error bodies

Frontend tests cover the student ID bar (validation and persistence across reloads), class list and
applying, friendly error messages, the countdown switching to *Expired* without a reload,
confirming, cancelling, the "My applications" page and the create-class form.

## Local development without Docker

```bash
docker compose up -d db
cd backend && dotnet run --project src/SchoolAdmission.Api     # http://localhost:8080
cd frontend && npm ci && npm run dev                           # http://localhost:5173
```

See [ASSUMPTIONS.md](ASSUMPTIONS.md) for decisions on unclear points and
[AI_USAGE.md](AI_USAGE.md) for how AI tools were used.
