# AI Usage

## Tools
- **LLM coding assistant (chat-based, e.g. ChatGPT/Claude)** — used for requirements analysis, solution design, code drafting, test scaffolding, and debugging assistance.
- **IDE AI assistance (e.g. GitHub Copilot)** — used selectively for inline code completions and boilerplate acceleration.

## How AI was used
- **Requirements & design:** Broke down the assignment into backend, frontend, data model, and operational requirements; identified critical concerns (seat overbooking under concurrency, hold expiry, idempotency, restart persistence) and outlined an approach using PostgreSQL transactions/row-level locking, uniqueness constraints, and time-based expiry with a background sweeper.
- **Backend (.NET 8 / PostgreSQL):** Drafted the minimal API structure, EF Core entities/migrations, endpoint contracts and DTOs, configuration handling (`HOLD_DURATION_SECONDS`, connection/env settings), error responses, and concurrency-safe hold/confirm/cancel flows for review and refinement.
- **Frontend (React + TypeScript + Vite):** Drafted the UI flow (student ID context, class list/apply, application countdown/confirm/cancel, "My applications"), API client integration, polling/auto-refresh behavior, and user-facing validation/error handling.
- **DevOps & delivery:** Assisted in drafting Dockerfiles, `docker-compose.yml`, environment wiring, and runtime configuration so the stack runs with `docker compose up`.
- **Testing & documentation:** Helped scaffold automated tests (including concurrency scenarios) and draft `README.md` and `ASSUMPTIONS.md`, which I reviewed and aligned with the final implementation.

## My role and verification
- I owned the final implementation decisions, API contract alignment, and handling of ambiguous requirements (documented in `ASSUMPTIONS.md`).
- I reviewed, edited, and integrated all AI-assisted output rather than accepting it verbatim, with particular attention to concurrency correctness, expiry semantics, idempotency, and error handling.
- I validated behavior through automated tests and manual end-to-end checks in Docker (including concurrent requests and restart/persistence scenarios) before considering the work complete.

## AI mistakes identified and corrections
- **Incorrect EF Core query composition:** An early class-listing query filtered/sorted after projection in a way EF Core could not translate, causing `GET /classes` to fail. *Detected by* calling the endpoint during manual verification. *Corrected by* applying filters/ordering on entities before projecting to the response shape.
- **Backend unreachable inside Docker:** A local binding/configuration issue caused the service to listen in a way that was not reachable from outside the container despite a healthy startup. *Detected by* post-`docker compose up` connectivity checks. *Corrected by* binding Kestrel to all interfaces (`http://+:8080`) and relying on container/env configuration.
- **Concurrency/idempotency edge cases in draft logic:** Initial hold/confirm flows needed tighter guarantees against parallel requests (duplicate active holds, double counting, and race conditions). *Detected by* designing and running parallel-request tests. *Corrected by* enforcing DB-level guarantees (transaction + row locking, uniqueness constraint for active holds per student/class) and idempotent state transitions.
- **Countdown/expiry UX inconsistency:** A draft countdown relied too much on client timing and could drift from server state. *Detected by* manual expiry-flow testing. *Corrected by* basing remaining time on server-provided time, re-fetching on expiry, and reflecting effective status without requiring a page reload.
- **Minor UI/test brittleness:** Some generated selectors/copy and UI details caused fragile test matches or unclear rendering. *Detected by* running frontend tests and reviewing the UI. *Corrected by* adjusting queries/labels and replacing non-portable visuals with consistent inline SVG/icons.

## Validation
- Backend: automated tests against PostgreSQL, including concurrency/overbooking-prevention and multi-instance scenarios.
- Frontend: automated component/flow tests plus type/lint checks.
- System: end-to-end run via Docker Compose from a clean state (create/apply/countdown/confirm-cancel-expire) and verification that data persists across container restarts (`down`/`up` without removing volumes).
